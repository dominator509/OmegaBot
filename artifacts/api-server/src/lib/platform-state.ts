import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { z } from "zod";
import { DEFAULT_SETTINGS } from "./defaults.js";
import { DEFAULT_PROVIDERS, type ProviderConfig, providerRegistry } from "./provider-registry.js";
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
type WorkflowKey = "tasks" | "runs" | "commands" | "commandGroups" | "approvals" | "llmRoutes";

let settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
let workflow: Partial<Record<WorkflowKey, Record<string, unknown>[]>> = {};
let pool: pg.Pool | undefined;
let storage: "postgres" | "file" | "memory" = "memory";
let stateFilePath = "";

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

export function validateProductionConfig(): void {
  if (!isProduction()) {
    return;
  }

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS omegabot_state (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const result = await pool.query<{ value: unknown }>(
    "SELECT value FROM omegabot_state WHERE key = $1",
    ["platform"],
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return mergeState(result.rows[0]?.value);
}

async function writePostgresState(state: PlatformState): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.query(
    `INSERT INTO omegabot_state (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    ["platform", JSON.stringify(state)],
  );
}

async function readFileState(): Promise<PlatformState | undefined> {
  try {
    return mergeState(JSON.parse(await readFile(stateFilePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function writeFileState(state: PlatformState): Promise<void> {
  await mkdir(path.dirname(stateFilePath), { recursive: true });
  await writeFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`);
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
    return items;
  }
  return cloneItems(defaults);
}

export async function setWorkflowItems(key: WorkflowKey, items: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  workflow = {
    ...workflow,
    [key]: cloneItems(items),
  };
  await persistPlatformState();
  return workflow[key] ?? [];
}

export async function persistPlatformState(): Promise<void> {
  const state = currentState();
  if (storage === "postgres") {
    await writePostgresState(state);
    return;
  }
  await writeFileState(state);
}

export async function closePlatformState(): Promise<void> {
  await pool?.end();
}
