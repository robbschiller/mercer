"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Download,
  History,
  Info,
  Link2,
  Loader2,
  Lock,
  Mic,
  Plus,
  RotateCcw,
  Ruler,
  Sparkles,
  Square,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  createProposalShareAction,
  generateProposalAction,
  uploadPhotoAction,
} from "@/lib/actions";
import { generateQuoteDraft } from "@/lib/actions/generate-quote-draft";
import { formatCurrency } from "@/lib/pricing";
import type { Bid, LineItem, Photo, Proposal, ProposalShare } from "@/lib/store";
import { cn } from "@/lib/utils";
import { QuoteReviewCard } from "@/components/quote-review-card";
import {
  QuoteTotalsCard,
  QuoteVersionHistory,
  type QuotePhase,
} from "@/components/quote-version-history";

// ── Voice dictation (Web Speech API; button hides when unsupported) ──────────

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function DictateButton({ onTranscript }: { onTranscript: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognition() != null);
    return () => recRef.current?.stop();
  }, []);

  if (!supported) return null;

  const stop = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  const start = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onTranscript(result[0].transcript);
      }
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  if (recording) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={stop}
      >
        <Square className="size-3 fill-current" />
        Stop
      </Button>
    );
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={start}>
      <Mic className="size-3.5" />
      Dictate
    </Button>
  );
}

// ── State 1: scope composer ──────────────────────────────────────────────────

function Composer({
  bid,
  photos,
  totalSqft,
  buildingsCount,
  catalogCount,
  isLargeJob,
  scope,
  setScope,
  onGenerate,
  error,
}: {
  bid: Bid;
  photos: Photo[];
  totalSqft: number;
  buildingsCount: number;
  catalogCount: number;
  isLargeJob: boolean | null;
  scope: string;
  setScope: (s: string) => void;
  onGenerate: () => void;
  error: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const shown = photos.slice(0, 8);
  const extra = photos.length - shown.length;

  const uploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    startUpload(async () => {
      for (const file of list) {
        const fd = new FormData();
        fd.set("contextType", "bid");
        fd.set("contextId", bid.id);
        fd.set("kind", "takeoff");
        fd.set("returnTo", `/bids/${bid.id}`);
        fd.set("file", file);
        await uploadPhotoAction(fd);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b py-4">
        <div>
          <CardTitle className="text-base">Build quote</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the scope in your words — Mercer drafts the line items,
            you review every one.
          </p>
        </div>
        {isLargeJob != null && (
          <Badge variant={isLargeJob ? "default" : "secondary"}>
            {isLargeJob ? "Large Job" : "Small Job"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-5">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* scope input */}
        <div className="relative">
          <Textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="e.g. “2 coats on all breezeway ceilings, wood rot repair on buildings 3 and 7, replace 40 ft of railing per building…”"
            className="min-h-32 pr-24 text-[15px] leading-relaxed"
          />
          <div className="absolute bottom-2.5 right-2.5">
            <DictateButton
              onTranscript={(t) =>
                setScope(`${scope.trim()} ${t.trim()}`.trim())
              }
            />
          </div>
        </div>

        {/* takeoff photos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm">
              <Camera className="size-4 text-muted-foreground" />
              {photos.length > 0 ? (
                <>
                  <span className="font-medium">
                    {photos.length} takeoff photo
                    {photos.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted-foreground">
                    will be referenced
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  No takeoff photos yet — add some so the draft can cite
                  evidence
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {shown.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="relative block size-16 overflow-hidden rounded-md border"
                title={p.caption ?? undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote supabase URL, thumbnail only */}
                <img
                  src={p.url}
                  alt={p.caption ?? "Takeoff photo"}
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
            {extra > 0 && (
              <div className="flex size-16 items-center justify-center rounded-md border bg-muted/50 text-xs font-medium text-muted-foreground">
                +{extra}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span className="text-[10px]">Add</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* context chips */}
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Mercer will price against
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
              <Tags className="size-3.5 text-muted-foreground" />
              <span className="font-medium">
                {catalogCount > 0
                  ? `${catalogCount} catalog SKU${catalogCount !== 1 ? "s" : ""}`
                  : "No catalog yet — manual estimates"}
              </span>
            </span>
            {totalSqft > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                <Ruler className="size-3.5 text-muted-foreground" />
                Measured{" "}
                <span className="font-medium">
                  {Math.round(totalSqft).toLocaleString()} sq ft
                </span>
              </span>
            )}
            {buildingsCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {buildingsCount} building{buildingsCount !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* action row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <span className="flex max-w-md items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Mercer proposes structured line items. You review and edit every
            line before a quote is stamped.
          </span>
          <Button onClick={onGenerate} disabled={!scope.trim()}>
            <Sparkles className="size-4" />
            Build quote
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── State 2: generating narration ────────────────────────────────────────────

function Generating({
  photoCount,
  catalogCount,
  propertyName,
}: {
  photoCount: number;
  catalogCount: number;
  propertyName: string;
}) {
  const steps = [
    {
      label: "Reading takeoff photos",
      meta: `${photoCount} photo${photoCount !== 1 ? "s" : ""}`,
    },
    {
      label: "Matching scope against price list",
      meta: `${catalogCount} SKU${catalogCount !== 1 ? "s" : ""}`,
    },
    { label: "Drafting line items by category", meta: "" },
    { label: "Estimating quantities & flags", meta: "" },
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Time-based narration; the last step holds until the action resolves.
    const timers = [1400, 3200, 6200].map((ms, i) =>
      setTimeout(() => setStep(i + 1), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const pct = Math.min(92, Math.round(((step + 0.6) / steps.length) * 100));

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            Building quote for {propertyName}
          </span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {pct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <span
            className="block h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-col gap-2.5 pt-1">
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={s.label}
                className={cn(
                  "flex items-center gap-2.5 text-sm",
                  !done && !active && "text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    done &&
                      "border-emerald-500/50 bg-emerald-500/10 text-emerald-600",
                    active && "border-primary text-primary",
                  )}
                >
                  {done ? (
                    <Check className="size-3" />
                  ) : active ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <span className="size-1 rounded-full bg-current" />
                  )}
                </span>
                <span className="flex-1">{s.label}</span>
                {s.meta && (
                  <span className="text-xs text-muted-foreground">
                    {s.meta}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── State 4/5: stamped quote ────────────────────────────────────────────────

function DoneCard({
  version,
  total,
  changeLog,
  pdfUrl,
  contactName,
  onCopyLink,
  copied,
  shareBusy,
  onRevise,
}: {
  version: number;
  total: number;
  changeLog: string | null;
  pdfUrl: string;
  contactName: string;
  onCopyLink: () => void;
  copied: boolean;
  shareBusy: boolean;
  onRevise: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">
              Quote v{version} generated
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Stamped from your proposal template · identical layout every
              version
            </p>
          </div>
        </div>
        <Badge variant="outline">Ready</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex flex-wrap gap-8">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Quote total
            </div>
            <div className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
              {formatCurrency(total)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Customer
            </div>
            <div className="mt-1.5 text-sm font-semibold">{contactName}</div>
          </div>
        </div>

        {changeLog && (
          <div className="rounded-lg border bg-muted/40 px-3.5 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <History className="size-3" />
              Changelog · v{version}
            </div>
            <p className="text-sm leading-relaxed">{changeLog}</p>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" />
          Shared via a secure customer link that supports online acceptance.
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={onCopyLink} disabled={shareBusy}>
            {shareBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : copied ? (
              <Check className="size-4" />
            ) : (
              <Link2 className="size-4" />
            )}
            {copied ? "Link copied" : "Copy customer link"}
          </Button>
          <Button variant="outline" asChild>
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <Download className="size-4" />
              Download PDF
            </a>
          </Button>
          <Button variant="ghost" className="ml-auto" onClick={onRevise}>
            <RotateCcw className="size-4" />
            Revise scope
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export function QuoteEngine({
  bid,
  lineItems,
  photos,
  proposals,
  proposalShares,
  totalSqft,
  buildingsCount,
  isLargeJob,
  catalogCount,
}: {
  bid: Bid;
  lineItems: LineItem[];
  photos: Photo[];
  proposals: Proposal[];
  proposalShares: { proposalId: string; share: ProposalShare }[];
  totalSqft: number;
  buildingsCount: number;
  isLargeJob: boolean | null;
  catalogCount: number;
}) {
  const aiLines = lineItems.filter((li) => li.source === "ai");
  const hasDraft = bid.draftScopeText != null && aiLines.length > 0;
  const maxVersion = proposals.reduce((m, p) => Math.max(m, p.version), 0);

  const [phase, setPhase] = useState<QuotePhase>(hasDraft ? "review" : "compose");
  const [scope, setScope] = useState(
    bid.draftScopeText ?? proposals[0]?.scopeText ?? "",
  );
  const [changeLog, setChangeLog] = useState<string | null>(
    bid.draftChangeLog ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    version: number;
    total: number;
    pdfUrl: string;
    proposalId: string;
    changeLog: string | null;
  } | null>(null);
  const [, startGenerate] = useTransition();
  const [approving, startApprove] = useTransition();
  const [shareBusy, startShare] = useTransition();
  const [copied, setCopied] = useState(false);

  const nextVersion = maxVersion + 1;
  const liveTotal = lineItems.reduce((s, li) => s + Number(li.amount), 0);
  // Latest share per proposal (shares arrive newest-first).
  const sharesByProposal = new Map<string, ProposalShare>();
  for (const { proposalId, share } of proposalShares) {
    if (!sharesByProposal.has(proposalId)) {
      sharesByProposal.set(proposalId, share);
    }
  }

  const onGenerate = () => {
    setError(null);
    setPhase("generating");
    startGenerate(async () => {
      const result = await generateQuoteDraft({ bidId: bid.id, scopeText: scope });
      if (result.ok) {
        setChangeLog(result.changeLog);
        setPhase("review");
      } else {
        setError(result.error);
        setPhase("compose");
      }
    });
  };

  const onApprove = () => {
    setApproveError(null);
    startApprove(async () => {
      const result = await generateProposalAction({ bidId: bid.id });
      if (result.error || !result.pdfUrl) {
        setApproveError(result.error ?? "Failed to generate the quote PDF.");
        return;
      }
      setDone({
        version: result.version ?? nextVersion,
        total: liveTotal,
        pdfUrl: result.pdfUrl,
        proposalId: result.proposalId ?? "",
        changeLog: result.changeLog ?? changeLog,
      });
      setPhase("done");
    });
  };

  const onCopyLink = () => {
    if (!done) return;
    startShare(async () => {
      const result = await createProposalShareAction({
        proposalId: done.proposalId,
      });
      if (result.shareUrl) {
        try {
          await navigator.clipboard.writeText(result.shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          window.prompt("Copy the customer link:", result.shareUrl);
        }
      }
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3 px-0.5">
        <h2 className="text-lg font-semibold tracking-tight">Quote</h2>
        <span className="text-sm text-muted-foreground">
          Propose from scope, review every line, stamp a versioned PDF.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex min-w-0 flex-col gap-4">
          {phase === "compose" && (
            <Composer
              bid={bid}
              photos={photos}
              totalSqft={totalSqft}
              buildingsCount={buildingsCount}
              catalogCount={catalogCount}
              isLargeJob={isLargeJob}
              scope={scope}
              setScope={setScope}
              onGenerate={onGenerate}
              error={error}
            />
          )}
          {phase === "generating" && (
            <Generating
              photoCount={photos.length}
              catalogCount={catalogCount}
              propertyName={bid.propertyName || bid.clientName || "this bid"}
            />
          )}
          {phase === "review" && (
            <QuoteReviewCard
              bidId={bid.id}
              items={lineItems}
              photos={photos}
              nextVersion={nextVersion}
              onApprove={onApprove}
              approving={approving}
              error={approveError}
            />
          )}
          {phase === "done" && done && (
            <DoneCard
              version={done.version}
              total={done.total}
              changeLog={done.changeLog}
              pdfUrl={done.pdfUrl}
              contactName={bid.clientName || "your customer"}
              onCopyLink={onCopyLink}
              copied={copied}
              shareBusy={shareBusy}
              onRevise={() => {
                setDone(null);
                setPhase("compose");
              }}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {(phase === "review" || phase === "done") && (
            <QuoteTotalsCard
              items={lineItems}
              isLargeJob={isLargeJob}
              marginPercent={
                bid.marginPercent != null ? Number(bid.marginPercent) : null
              }
            />
          )}
          <QuoteVersionHistory
            phase={phase}
            proposals={proposals}
            sharesByProposal={sharesByProposal}
            nextVersion={done?.version ?? nextVersion}
            draftChangeLog={done?.changeLog ?? changeLog}
            liveTotal={done?.total ?? liveTotal}
            doneSent={false}
          />
          {phase === "compose" && (
            <Card>
              <CardContent className="flex items-start gap-2.5 pt-5 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Mercer never sends anything on its own. It proposes; you
                  approve. The PDF is stamped from a fixed template so every
                  version looks identical.
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
