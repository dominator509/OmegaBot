import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

function getSecretKeyMaterial(): string | undefined {
  return process.env.PROVIDER_SECRET_KEY;
}

function encryptionKey(): Buffer {
  const keyMaterial = getSecretKeyMaterial();
  if (!keyMaterial) {
    throw new Error("PROVIDER_SECRET_KEY is required to decrypt provider secrets");
  }
  return createHash("sha256").update(keyMaterial).digest();
}

export function validateSecretStoreConfig(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const keyMaterial = getSecretKeyMaterial();
  if (!keyMaterial) {
    throw new Error("Missing required production configuration: PROVIDER_SECRET_KEY");
  }
  if (keyMaterial.length < 32) {
    throw new Error("Weak production configuration: PROVIDER_SECRET_KEY must be at least 32 characters");
  }
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptSecret(value: string): string {
  if (!value || isEncryptedSecret(value)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string): string {
  if (!value || !isEncryptedSecret(value)) {
    return value;
  }

  const [prefix, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (prefix !== ENCRYPTED_PREFIX || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid encrypted secret format");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
