"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  removeAnthropicKeyAction,
  saveAnthropicKeyAction,
} from "@/lib/actions/integrations";

export function AnthropicKeyCard({
  connected,
  last4,
  addedAt,
  isOwner,
  platformFallback,
}: {
  connected: boolean;
  last4: string | null;
  addedAt: string | null;
  isOwner: boolean;
  platformFallback: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();

  const save = () => {
    setError(null);
    start(async () => {
      const result = await saveAnthropicKeyAction({ apiKey: value });
      if (result.error) {
        setError(result.error);
        return;
      }
      setValue("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  const remove = () => {
    setError(null);
    start(async () => {
      const result = await removeAnthropicKeyAction();
      if (result.error) setError(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
              <Sparkles className="size-4 text-muted-foreground" />
            </span>
            <div>
              <CardTitle className="text-base">Claude API key</CardTitle>
              <CardDescription>
                Powers quote drafting, Ask, and the dashboard composer — on
                your Anthropic account, at your cost.
              </CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
              Connected
            </Badge>
          ) : platformFallback ? (
            <Badge variant="secondary">Platform key</Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {connected && (
          <p className="text-sm text-muted-foreground">
            Key ending in{" "}
            <span className="font-mono font-medium text-foreground">
              …{last4}
            </span>
            {addedAt
              ? ` · added ${new Date(addedAt).toLocaleDateString()}`
              : ""}
            . The full key is encrypted and never shown again.
          </p>
        )}
        {!connected && platformFallback && (
          <p className="text-sm text-muted-foreground">
            AI features currently run on Mercer&apos;s shared key. Add your own
            so usage bills to your Anthropic account.
          </p>
        )}

        {isOwner ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="password"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                placeholder="sk-ant-…"
                autoComplete="off"
                className="max-w-md font-mono text-sm"
              />
              <Button onClick={save} disabled={busy || !value.trim()}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : saved ? (
                  <Check className="size-4" />
                ) : null}
                {connected ? "Replace key" : "Connect"}
              </Button>
              {connected && (
                <Button variant="ghost" onClick={remove} disabled={busy}>
                  Remove
                </Button>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Keys are validated with Anthropic before saving, then stored
              encrypted (AES-256-GCM). Create one at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-2 hover:underline"
              >
                console.anthropic.com
              </a>
              .
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only the org owner can manage the API key.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
