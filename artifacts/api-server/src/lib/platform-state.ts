import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { z } from "zod";
import { DEFAULT_SETTINGS } from "./defaults.js";
import { DEFAULT_PROVIDERS, type ProviderConfig, providerRegistry } from "./provider-registry.js";
import { validateApiAuthConfig } from "./api-auth.js";
import { validateSessionAuthConfig } from "./session-auth.js";
import { decryptSecret, encryptSecret, validateSecretStoreConfig } from "./secret-store.js";
import { logger } from "./logger.js";

const { Pool } = pg;

const ProviderModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  contextWindow: z.number(),
  capabilities: z.array(z.string()),
  costPer1kTokens: z.number(),
  avgLatencyMs: z.number(),
});

const ProviderConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["openai-compat", "anthropic"]),
  baseUrl: z.string(),
  apiKey: z.string(),
  enabled: z.boolean(),
  models: z.array(ProviderModelSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const PlatformStateSchema = z.object({
  settings: z.record(z.unknown()).default(DEFAULT_SETTINGS),
  providers: z.array(ProviderConfigSchema).default(DEFAULT_PROVIDERS),
  workflow: z.record(z.array(z.record(z.unknown()))).default({}),
});

type PlatformState = z.infer<typeof PlatformStateSchema>;
type WorkflowKey = "tasks" | "runs" | "commands" | "commandGroups" | "approvals" | "llmRoutes" | "auditEvents";

const WORKFLOW_TABLES: Record<WorkflowKey, string> = {
  tasks: "omegabot_tasks",
  runs: "omegabot_runs",
  commands: "omegabot_commands",
  commandGroups: "omegabot_command_groups",
  approvals: "omegabot_approvals",
  llmRoutes: "omegabot_llm_routes",
  auditEvents: "omegabot_audit_events",
};

let settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
let workflow: Partial<Record<WorkflowKey, Record<string, unknown>[]>> = {};
let pool: pg.Pool | undefined;
let storage: "postgres" | "file" | "memory" = "memory";
let stateFilePath = "";
let persistQueue: Promise<void> = Promise.resolve();

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getStateFilePath(): string {
  return process.env.OMEGABOT_STATE_FILE
    ?? path.resolve(process.cwd(), ".data", "omegabot-state.json");
}

function mergeState(raw: unknown): PlatformState {
  const parsed = PlatformStateSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ err: parsed.error }, "Ignoring invalid persisted platform state");
    return { settings: DEFAULT_SETTINGS, providers: DEFAULT_PROVIDERS, workflow: {} };
  }

  return {
    settings: { ...DEFAULT_SETTINGS, ...parsed.data.settings },
    providers: parsed.data.providers.length > 0 ? parsed.data.providers : DEFAULT_PROVIDERS,
    workflow: parsed.data.workflow,
  };
}

function decryptProviderSecrets(state: PlatformState): PlatformState {
  return {
    ...state,
    providers: state.providers.map((provider) => ({
      ...provider,
      apiKey: decryptSecret(provider.apiKey),
    })),
  };
}

function encryptProviderSecrets(state: PlatformState): PlatformState {
  return {
    ...state,
    providers: state.providers.map((provider) => ({
      ...provider,
      apiKey: encryptSecret(provider.apiKey),
    })),
  };
}

function loadState(raw: unknown): PlatformState {
  return decryptProviderSecrets(mergeState(raw));
}

function storageState(state: PlatformState): PlatformState {
  return encryptProviderSecrets(state);
}

export function validateProductionConfig(): void {
  if (!isProduction()) {
    return;
  }

  validateApiAuthConfig();
  validateSessionAuthConfig();
  validateSecretStoreConfig();

  const missing: string[] = [];
  if (!process.env.DATABASE_URL && process.env.ALLOW_FILE_STATE_IN_PRODUCTION !== "true") {
    missing.push("DATABASE_URL");
  }
  if (!process.env.ALLOWED_ORIGINS) {
    missing.push("ALLOWED_ORIGINS");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  }
}

async function readPostgresState(): Promise<PlatformState | undefined> {
  if (!pool) {
    return undefined;
  }

  await ensurePostgresSchema();

  const [settingsState, providersState, workflowState] = await Promise.all([
    readPostgresSettings(),
    readPostgresProviders(),
    readPostgresWorkflow(),
  ]);

  const hasState = Object.keys(settingsState).length > 0
    || providersState.length > 0
    || Object.keys(workflowState).length > 0;

  if (hasState) {
    return loadState({
      settings: settingsState,
      providers: providersState,
      workflow: workflowState,
    });
  }

  const legacy = await readLegacyPostgresState();
  if (legacy) {
    await writePostgresState(legacy);
  }
  return legacy;
}

async function ensurePostgresSchema(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS omegabot_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS omegabot_providers (
      id text PRIMARY KEY,
      name text NOT NULL,
      type text NOT NULL,
      base_url text NOT NULL,
      api_key text NOT NULL,
      enabled boolean NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS omegabot_provider_models (
      provider_id text NOT NULL REFERENCES omegabot_providers(id) ON DELETE CASCADE,
      id text NOT NULL,
      name text NOT NULL,
      context_window integer NOT NULL,
      capabilities jsonb NOT NULL,
      cost_per_1k_tokens double precision NOT NULL,
      avg_latency_ms integer NOT NULL,
      PRIMARY KEY (provider_id, id)
    )
  `);

  for (const table of Object.values(WORKFLOW_TABLES)) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id text PRIMARY KEY,
        payload jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }
}

async function readLegacyPostgresState(): Promise<PlatformState | undefined> {
  if (!pool) {
    return undefined;
  }

  const tableResult = await pool.query<{ exists: boolean }>(
    "SELECT to_regclass('public.omegabot_state') IS NOT NULL AS exists",
  );
  if (!tableResult.rows[0]?.exists) {
    return undefined;
  }

  const result = await pool.query<{ value: unknown }>(
    "SELECT value FROM omegabot_state WHERE key = $1",
    ["platform"],
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return loadState(result.rows[0]?.value);
}

async function readPostgresSettings(): Promise<Record<string, unknown>> {
  if (!pool) {
    return {};
  }
  const result = await pool.query<{ key: string; value: unknown }>(
    "SELECT key, value FROM omegabot_settings",
  );
  return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
}

async function readPostgresProviders(): Promise<ProviderConfig[]> {
  if (!pool) {
    return [];
  }
  const providerResult = await pool.query<{
    id: string;
    name: string;
    type: ProviderConfig["type"];
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>(`
    SELECT
      id,
      name,
      type,
      base_url AS "baseUrl",
      api_key AS "apiKey",
      enabled,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM omegabot_providers
    ORDER BY id
  `);
  const modelResult = await pool.query<{
    providerId: string;
    id: string;
    name: string;
    contextWindow: number;
    capabilities: unknown;
    costPer1kTokens: number;
    avgLatencyMs: number;
  }>(`
    SELECT
      provider_id AS "providerId",
      id,
      name,
      context_window AS "contextWindow",
      capabilities,
      cost_per_1k_tokens AS "costPer1kTokens",
      avg_latency_ms AS "avgLatencyMs"
    FROM omegabot_provider_models
    ORDER BY provider_id, id
  `);

  return providerResult.rows.map((provider) => ({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    enabled: provider.enabled,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
    models: modelResult.rows
      .filter((model) => model.providerId === provider.id)
      .map((model) => ({
        id: model.id,
        name: model.name,
        contextWindow: Number(model.contextWindow),
        capabilities: Array.isArray(model.capabilities) ? model.capabilities.map(String) : [],
        costPer1kTokens: Number(model.costPer1kTokens),
        avgLatencyMs: Number(model.avgLatencyMs),
      })),
  }));
}

async function readPostgresWorkflow(): Promise<Partial<Record<WorkflowKey, Record<string, unknown>[]>>> {
  const state: Partial<Record<WorkflowKey, Record<string, unknown>[]>> = {};
  if (!pool) {
    return state;
  }

  for (const [key, table] of Object.entries(WORKFLOW_TABLES) as Array<[WorkflowKey, string]>) {
    const result = await pool.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM ${table} ORDER BY updated_at, id`,
    );
    if (result.rows.length > 0) {
      state[key] = result.rows.map((row) => row.payload);
    }
  }

  return state;
}

async function writePostgresState(state: PlatformState): Promise<void> {
  if (!pool) {
    return;
  }

  await ensurePostgresSchema();
  const persistedState = storageState(state);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM omegabot_settings");
    for (const [key, value] of Object.entries(persistedState.settings)) {
      await client.query(
        "INSERT INTO omegabot_settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())",
        [key, JSON.stringify(value)],
      );
    }

    await client.query("DELETE FROM omegabot_provider_models");
    await client.query("DELETE FROM omegabot_providers");
    for (const provider of persistedState.providers) {
      await client.query(
        `INSERT INTO omegabot_providers
          (id, name, type, base_url, api_key, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          provider.id,
          provider.name,
          provider.type,
          provider.baseUrl,
          provider.apiKey,
          provider.enabled,
          provider.createdAt,
          provider.updatedAt,
        ],
      );
      for (const model of provider.models) {
        await client.query(
          `INSERT INTO omegabot_provider_models
            (provider_id, id, name, context_window, capabilities, cost_per_1k_tokens, avg_latency_ms)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
          [
            provider.id,
            model.id,
            model.name,
            model.contextWindow,
            JSON.stringify(model.capabilities),
            model.costPer1kTokens,
            model.avgLatencyMs,
          ],
        );
      }
    }

    for (const [key, table] of Object.entries(WORKFLOW_TABLES) as Array<[WorkflowKey, string]>) {
      await client.query(`DELETE FROM ${table}`);
      const items = persistedState.workflow[key] ?? [];
      for (const item of items) {
        await client.query(
          `INSERT INTO ${table} (id, payload, updated_at) VALUES ($1, $2::jsonb, now())`,
          [String(item.id), JSON.stringify(item)],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readFileState(): Promise<PlatformState | undefined> {
  try {
    return loadState(JSON.parse(await readFile(stateFilePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    if (error instanceof SyntaxError) {
      const backupPath = `${stateFilePath}.corrupt-${Date.now()}`;
      try {
        await copyFile(stateFilePath, backupPath);
        logger.error(
          { err: error, stateFilePath, backupPath },
          "State file is malformed JSON; backing up corrupted file and reinitializing from defaults",
        );
      } catch (backupError) {
        logger.error(
          { err: error, backupErr: backupError, stateFilePath },
          "State file is malformed JSON and backup failed; reinitializing from defaults",
        );
      }
      return undefined;
    }
    throw error;
  }
}

async function writeFileState(state: PlatformState): Promise<void> {
  await mkdir(path.dirname(stateFilePath), { recursive: true });
  await writeFile(stateFilePath, `${JSON.stringify(storageState(state), null, 2)}\n`);
}

function currentState(): PlatformState {
  return {
    settings,
    providers: providerRegistry.snapshot(),
    workflow,
  };
}

export async function initializePlatformState(): Promise<void> {
  validateProductionConfig();

  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    storage = "postgres";
  } else {
    stateFilePath = getStateFilePath();
    storage = "file";
  }

  const loaded = storage === "postgres"
    ? await readPostgresState()
    : await readFileState();
  const state = loaded ?? { settings: DEFAULT_SETTINGS, providers: DEFAULT_PROVIDERS, workflow: {} };

  settings = { ...DEFAULT_SETTINGS, ...state.settings };
  workflow = state.workflow;
  providerRegistry.hydrate(state.providers);

  if (!loaded) {
    await persistPlatformState();
  }

  logger.info(
    { storage, stateFilePath: storage === "file" ? stateFilePath : undefined },
    "Platform state initialized",
  );
}

export function getSettings(): Record<string, unknown> {
  return settings;
}

export async function updateSettings(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  settings = { ...settings, ...patch };
  await persistPlatformState();
  return settings;
}

function cloneItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return JSON.parse(JSON.stringify(items)) as Record<string, unknown>[];
}

export function getWorkflowItems(key: WorkflowKey, defaults: Record<string, unknown>[]): Record<string, unknown>[] {
  const items = workflow[key];
  if (items) {
    return cloneItems(items);
  }
  return cloneItems(defaults);
}

export async function setWorkflowItems(key: WorkflowKey, items: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  workflow = {
    ...workflow,
    [key]: cloneItems(items),
  };
  await persistPlatformState();
  return cloneItems(workflow[key] ?? []);
}

function enqueuePersist(task: () => Promise<void>): Promise<void> {
  const run = persistQueue.then(task, task);
  persistQueue = run.catch(() => undefined);
  return run;
}

export async function persistPlatformState(): Promise<void> {
  await enqueuePersist(async () => {
    const state = currentState();
    if (storage === "postgres") {
      await writePostgresState(state);
      return;
    }
    await writeFileState(state);
  });
}

export async function closePlatformState(): Promise<void> {
  await persistQueue;
  await pool?.end();
}
