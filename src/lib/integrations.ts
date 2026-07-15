import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orgIntegrations } from "@/db/schema";

/**
 * BYO Claude API key (Settings → Integrations): orgs run Mercer's AI
 * features on their own Anthropic account. Keys are AES-256-GCM encrypted
 * at rest and never rendered back beyond their last 4 characters.
 *
 * KEK: INTEGRATIONS_SECRET when set (recommended in prod); otherwise derived
 * from DATABASE_URL — already a secret, stable, and available everywhere the
 * app runs. Either way, a plain DB dump no longer exposes customer keys.
 */
function kek(): Buffer {
  const secret =
    process.env.INTEGRATIONS_SECRET || process.env.DATABASE_URL || "";
  if (!secret) throw new Error("No secret available to encrypt API keys");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kek(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(ciphertext: string): string | null {
  try {
    const [v, ivB64, tagB64, dataB64] = ciphertext.split(".");
    if (v !== "v1") return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      kek(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * The Anthropic key every AI feature should use for this org: the org's own
 * key when connected, else the platform env key (dev / trial fallback),
 * else null (features fall back to their offline mocks).
 */
export async function resolveAnthropicKey(
  ownerUserId: string,
): Promise<string | null> {
  const rows = await db
    .select({ ciphertext: orgIntegrations.anthropicKeyCiphertext })
    .from(orgIntegrations)
    .where(eq(orgIntegrations.userId, ownerUserId))
    .limit(1);
  const ciphertext = rows[0]?.ciphertext;
  if (ciphertext) {
    const key = decryptSecret(ciphertext);
    if (key) return key;
  }
  return process.env.ANTHROPIC_API_KEY || null;
}
