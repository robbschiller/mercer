import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org-context";
import { getIntegrationStatus } from "@/lib/store";
import { AnthropicKeyCard } from "@/components/anthropic-key-card";

export default async function SettingsIntegrationsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const status = await getIntegrationStatus();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect the services Mercer runs on for your org.
        </p>
      </div>
      <AnthropicKeyCard
        connected={status.anthropic.connected}
        last4={status.anthropic.last4}
        addedAt={status.anthropic.addedAt?.toISOString() ?? null}
        isOwner={ctx.role === "owner"}
        platformFallback={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
