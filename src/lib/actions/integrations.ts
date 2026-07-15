"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { encryptSecret } from "@/lib/integrations";
import { removeAnthropicKey, setAnthropicKey } from "@/lib/store";

/**
 * Save the org's Anthropic API key after proving it works: a models.list
 * ping costs nothing and catches typos, revoked keys, and wrong-console
 * keys before they break a quote generation mid-demo.
 */
export async function saveAnthropicKeyAction(data: {
  apiKey: string;
}): Promise<{ error: string | null }> {
  const apiKey = data.apiKey?.trim();
  if (!apiKey) return { error: "Paste an API key first." };
  if (!apiKey.startsWith("sk-ant-")) {
    return { error: "That doesn't look like an Anthropic key (sk-ant-…)." };
  }

  try {
    const client = new Anthropic({ apiKey });
    await client.models.list({ limit: 1 });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { error: "Anthropic rejected this key — check it and try again." };
    }
    const message = err instanceof Error ? err.message : "Validation failed";
    return { error: `Couldn't validate the key: ${message}` };
  }

  try {
    await setAnthropicKey({
      ciphertext: encryptSecret(apiKey),
      last4: apiKey.slice(-4),
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save the key",
    };
  }
  revalidatePath("/settings/integrations");
  return { error: null };
}

export async function removeAnthropicKeyAction(): Promise<{
  error: string | null;
}> {
  try {
    await removeAnthropicKey();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to remove the key",
    };
  }
  revalidatePath("/settings/integrations");
  return { error: null };
}
