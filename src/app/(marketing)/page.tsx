import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Camera,
  Check,
  FileSearch,
  FileSignature,
  Layers,
  LineChart,
  ListChecks,
  MessageSquareText,
  ScanLine,
  Share2,
  ShieldCheck,
  Sparkles,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { getSessionUser } from "@/lib/supabase/auth-cache";

type Icon = ComponentType<{ className?: string }>;

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
      <Hero />
      <Positioning />
      <WhyNot />
      <Workflow />
      <Product />
      <Principles />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   HERO                                     */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-ink)]">
      <div className="absolute inset-0 bg-grid-ink" aria-hidden />
      <div className="hero-vignette absolute inset-0" aria-hidden />
      <div className="noise-overlay absolute inset-0" aria-hidden />

      {/* Top trim rule */}
      <div
        className="absolute inset-x-0 top-20 h-px bg-[var(--color-ink-rule)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-16 px-6 pt-36 pb-24 lg:px-10 lg:pt-44 lg:pb-32">
        {/* Top meta row */}
        <div className="flex flex-wrap items-center gap-4 text-white/60">
          <span className="kicker text-[var(--color-amber-soft)]">
            §&nbsp;01 · Phase&nbsp;1 in build with Renobase
          </span>
          <span className="hidden h-px flex-1 bg-white/10 sm:block" aria-hidden />
          <span className="kicker hidden sm:inline">
            Commercial&nbsp;multifamily&nbsp;·&nbsp;Exterior&nbsp;renovation&nbsp;·&nbsp;Painting&nbsp;first
          </span>
        </div>

        {/* Masthead headline */}
        <h1 className="font-display-editorial text-[clamp(2rem,5.2vw,5.5rem)] leading-[0.92] text-white lg:text-[clamp(2.25rem,4.25vw,6rem)]">
          <span className="block sm:whitespace-nowrap">The AI-native operating system for</span>
          <span className="block italic text-white/95 sm:whitespace-nowrap">
            commercial renovation contractors
            <span className="not-italic text-[var(--color-amber)]">.</span>
          </span>
        </h1>

        <div className="grid grid-cols-1 gap-x-10 gap-y-14 lg:grid-cols-12">
          {/* Subhead + CTAs */}
          <div className="lg:col-span-7">
            <p className="max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Turn a walk-around into a bid. Review the takeoff. Send a live
              proposal your customer can sign. Agents handle the busywork between
              leads, scope, and signature so you bid in minutes, win on cleaner
              scope, and watch your whole pipeline move on one screen.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-[var(--color-amber)] px-6 text-base font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_-12px_rgba(232,93,35,0.65)] transition-transform hover:-translate-y-[1px] hover:bg-[var(--color-amber-soft)]"
              >
                Start a free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#workflow"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-base font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/10"
              >
                See the workflow
              </Link>
            </div>

            <p className="mt-5 text-sm text-white/45">
              No credit card. Walk a property and run it through the takeoff
              agent in a single session.
            </p>
          </div>

          {/* Takeoff draft card */}
          <aside className="lg:col-span-5">
            <FieldCard />
          </aside>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-2 border-y border-[var(--color-ink-rule)] md:grid-cols-5">
          <KpiCell label="Capture to draft" value="47s" hint="Vision agent median" />
          <KpiCell
            label="Surfaces drafted"
            value="187"
            hint="Multifamily, 3-story walk"
            accent
          />
          <KpiCell label="Scope flags caught" value="3" hint="Spec · capture · request" />
          <KpiCell label="Confidence" value="92%" hint="Above edit threshold" />
          <KpiCell
            label="Pipeline"
            value="$1.24M"
            hint="Captured + signed"
            wide
          />
        </div>
      </div>
    </section>
  );
}

function KpiCell({
  label,
  value,
  hint,
  accent,
  wide,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col gap-2 border-[var(--color-ink-rule)] px-5 py-6 first:border-l-0 md:border-l ${
        wide ? "col-span-2 md:col-span-1" : ""
      }`}
    >
      <span className="kicker text-white/45">{label}</span>
      <span
        className={`font-display text-3xl sm:text-4xl ${accent ? "text-[var(--color-amber)]" : "text-white"}`}
      >
        {value}
      </span>
      <span className="font-mono text-[11px] text-white/40">{hint}</span>
    </div>
  );
}

function FieldCard() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="kicker text-white/45">Capture · bid #0327</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-amber)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-amber-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-amber)]" />
          Drafted by agent
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <span className="text-sm text-white/50">8-building, 3-story walk</span>
        <span className="font-display text-2xl leading-tight text-white">
          Fountains at Pershing
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[12px]">
        <div>
          <dt className="text-white/40">Buildings detected</dt>
          <dd className="text-white/85">8 · auto from video</dd>
        </div>
        <div>
          <dt className="text-white/40">Surfaces drafted</dt>
          <dd className="text-white/85">187 · 4 substrates</dd>
        </div>
        <div>
          <dt className="text-white/40">Est. exterior sqft</dt>
          <dd className="text-white/85">412,900</dd>
        </div>
        <div>
          <dt className="text-white/40">Draft total</dt>
          <dd className="text-[var(--color-amber-soft)]">
            $1,102,400
          </dd>
        </div>
      </dl>

      {/* Mini footprint mock */}
      <div className="relative mt-6 h-32 overflow-hidden rounded-lg border border-white/10 bg-[var(--color-ink-soft)]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
          aria-hidden
        />
        <svg
          viewBox="0 0 220 128"
          className="relative h-full w-full text-[var(--color-amber)]"
          aria-hidden
        >
          <g fill="currentColor" fillOpacity="0.25" stroke="currentColor">
            <rect x="20" y="24" width="34" height="18" />
            <rect x="62" y="22" width="30" height="20" />
            <rect x="100" y="28" width="38" height="16" />
            <rect x="148" y="24" width="28" height="20" />
            <rect x="20" y="62" width="40" height="18" />
            <rect x="70" y="64" width="32" height="18" />
            <rect x="112" y="60" width="26" height="22" />
            <rect x="146" y="64" width="36" height="18" />
          </g>
        </svg>
        <span className="absolute bottom-2 left-3 font-mono text-[10px] text-white/40">
          Buildings detected · 92% confidence
        </span>
      </div>

      <Link
        href="#workflow"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/75 transition-colors hover:text-white"
      >
        How the takeoff agent works
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                POSITIONING                                 */
/* -------------------------------------------------------------------------- */

type Competitor = {
  name: string;
  owns: string;
  owns_short: string;
  blurb: string;
  tone: "muted" | "highlight";
};

const competitors: Competitor[] = [
  {
    name: "EagleView · Hover",
    owns: "Aerial measurement",
    owns_short: "measurement",
    blurb:
      "Accurate 3D property reports, mostly residential. One step of the job. System of record with export buttons. Useful upstream input, not a workflow.",
    tone: "muted",
  },
  {
    name: "Salesforce · HubSpot",
    owns: "Generic pipeline + AI add-ons",
    owns_short: "CRM + chatbot",
    blurb:
      "Infinitely configurable, speaks nothing. 2026 AI releases are chatbots and email drafts, not agents that read a building, reconcile a scope, or draft a takeoff.",
    tone: "muted",
  },
  {
    name: "JobNimbus · AccuLynx",
    owns: "Roofing CRM + AI add-ons",
    owns_short: "roofing",
    blurb:
      "Purpose-built lead-to-close for roofing, commercial and residential. The pattern proof. Still a system of record. The forms assume a human types the numbers.",
    tone: "muted",
  },
  {
    name: "Procore · BuilderTrend",
    owns: "Post-sale ops",
    owns_short: "project ops",
    blurb:
      "Schedules, subs, RFIs, punch lists. Start after the contract is signed, built for ground-up. No opinion about pre-sale capture or scope reconciliation.",
    tone: "muted",
  },
  {
    name: "STACK · PlanSwift",
    owns: "Blueprint takeoff",
    owns_short: "takeoffs",
    blurb:
      "Digital takeoffs from PDFs and elevations. Only useful when you have plans, which you mostly don't on an occupied asset. Single-step, human-driven.",
    tone: "muted",
  },
  {
    name: "Mercer",
    owns: "AI-native workflow engine",
    owns_short: "the whole job",
    blurb:
      "Capture-first takeoff, scope reconciliation, negotiation agent, live proposal URL. Painting first, siding and envelope next. AI does the work; humans supervise and edit.",
    tone: "highlight",
  },
];

function Positioning() {
  return (
    <section
      id="positioning"
      className="relative isolate overflow-hidden bg-[var(--color-parchment)] text-[var(--color-ink)]"
    >
      <div className="absolute inset-0 bg-grid-parchment opacity-70" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-28 lg:px-10 lg:py-36">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="kicker text-[var(--color-amber)]">
              §&nbsp;02 · The map of the category
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95]">
              System of record.
              <br />
              <span className="italic">Or system that does the work?</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            Every incumbent is a database with human data entry and a 2026 AI
            chatbot bolted on. Mercer inverts that. The agents are the work.
            The records are the substrate.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {competitors.map((c) => (
            <CompetitorCard key={c.name} competitor={c} />
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 border-t border-[var(--color-parchment-border)] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl font-display text-xl italic leading-snug text-[var(--color-ink)]/80">
            &ldquo;Bolting AI-powered onto JobNimbus doesn&rsquo;t close the
            gap. The forms assume a human types the numbers. The premise of
            the product is wrong for the AI era.&rdquo;
          </p>
          <span className="kicker text-[var(--color-ink)]/50">
            / Mercer positioning note
          </span>
        </div>
      </div>
    </section>
  );
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const highlight = competitor.tone === "highlight";
  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-colors ${
        highlight
          ? "border-[var(--color-amber)] bg-[var(--color-ink)] text-white shadow-[0_30px_60px_-20px_rgba(232,93,35,0.45)]"
          : "border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)] text-[var(--color-ink)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`kicker ${highlight ? "text-[var(--color-amber-soft)]" : "text-[var(--color-ink)]/45"}`}
        >
          Owns · {competitor.owns_short}
        </span>
        {highlight ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-amber)]/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-amber-soft)]">
            Us
          </span>
        ) : null}
      </div>

      <div className="mt-10 flex flex-col gap-2">
        <span
          className={`font-display text-2xl leading-tight ${highlight ? "text-white" : ""}`}
        >
          {competitor.name}
        </span>
        <span
          className={`text-sm ${highlight ? "text-white/70" : "text-[var(--color-ink)]/60"}`}
        >
          {competitor.owns}
        </span>
      </div>

      <p
        className={`mt-6 text-sm leading-relaxed ${highlight ? "text-white/80" : "text-[var(--color-ink)]/70"}`}
      >
        {competitor.blurb}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  WHY NOT                                   */
/* -------------------------------------------------------------------------- */

type Objection = {
  target: string;
  question: string;
  answer: string;
};

const objections: Objection[] = [
  {
    target: "Salesforce · HubSpot + AI",
    question: "Why not a generic CRM with the new AI add-ons?",
    answer:
      "No domain model for buildings, surfaces, substrates, coverage, or takeoffs. The AI add-ons are chatbots and generative email drafts. No vision capture. No scope reconciliation. Configure the fields yourself and you've built a bad Mercer at ten times the maintenance cost.",
  },
  {
    target: "JobNimbus · AccuLynx",
    question: "Why not the roofing CRMs?",
    answer:
      "Closest workflow analogue, and they serve commercial roofing well. Two problems. Roofing-only: bid, measurement, and pricing are built around shingles and slopes. System of record: their 2025-2026 AI features are generative proposal copy and pipeline summaries, not capture-driven takeoffs. The premise is the wrong shape.",
  },
  {
    target: "Procore · BuilderTrend",
    question: "Why not a construction ops suite?",
    answer:
      "Built for ground-up or residential remodel. Post-sale only. No opinion about lead qualification or pre-sale capture, which is where the AI leverage lives on renovation work. They're downstream of Mercer, not a substitute.",
  },
];

function WhyNot() {
  return (
    <section
      id="why-not"
      className="relative isolate overflow-hidden bg-[var(--color-parchment-soft)] text-[var(--color-ink)]"
    >
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="kicker text-[var(--color-amber)]">
              §&nbsp;03 · The objections, addressed
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.25rem,5.5vw,4.75rem)] leading-[0.95]">
              Why not just use
              <br />
              <span className="italic">the obvious one?</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            Every buyer asks this. The short version of why each usual suspect
            falls short for an AI-native take on commercial multifamily
            exterior renovation.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {objections.map((o) => (
            <div
              key={o.target}
              className="flex flex-col gap-4 rounded-2xl border border-[var(--color-parchment-border)] bg-white p-7"
            >
              <span className="kicker text-[var(--color-ink)]/45">
                {o.target}
              </span>
              <h3 className="font-display text-2xl leading-tight">
                {o.question}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-ink)]/70">
                {o.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 WORKFLOW                                   */
/* -------------------------------------------------------------------------- */

type Stage = {
  number: string;
  title: string;
  tagline: string;
  description: string;
  icon: Icon;
  bullets: string[];
};

const stages: Stage[] = [
  {
    number: "01",
    title: "Qualify",
    tagline: "Ranked pipeline, not a list to triage",
    description:
      "Drop in the trade-show CSV. The qualification agent resolves each company to its property portfolio, pulls public data on year built and unit count, estimates recoat timing from typical cycles and visible satellite condition, and writes a brief per lead. Your queue is ranked, with reasons.",
    icon: WorkflowIcon,
    bullets: [
      "Company to portfolio resolution",
      "Paint-timing from public + satellite signal",
      "Confidence-scored ranking with brief",
    ],
  },
  {
    number: "02",
    title: "Capture",
    tagline: "Walk the property. Get a takeoff draft.",
    description:
      "Open Mercer in the parking lot. Capture photo and video as you walk the buildings. The vision takeoff agent identifies building types, enumerates surfaces per type, and estimates dimensions with a confidence score on every field. The form exists as the edit surface, not the origination point.",
    icon: Camera,
    bullets: [
      "Photo + video, async upload on spotty cell",
      "Building types, surfaces, dim estimates",
      "Manual fallback always available",
    ],
  },
  {
    number: "03",
    title: "Reconcile",
    tagline: "Scope gaps stop being a guessing game",
    description:
      "Scope is a structured object. Every line item traces to a measurement, a spec PDF, an image from the capture, or a customer request. The reconciliation agent flags what's missing: metal primer per the spec, porch floors visible in the walk, the stairwell the customer mentioned. You accept, modify, or dismiss with a reason.",
    icon: ListChecks,
    bullets: [
      "Spec PDF parsing to structured products + areas",
      "Customer request ingestion (email, voice)",
      "Flag review with traceable source refs",
    ],
  },
  {
    number: "04",
    title: "Negotiate",
    tagline: "A URL that responds. A handoff that's automatic.",
    description:
      "The proposal is a live page, not a PDF. The property manager hovers to see why metal primer is in the scope. They request a descope; the negotiation agent drafts a revised bid for your approval. Accept flips the bid to won, the lead to won, and the same URL becomes the project status page.",
    icon: MessageSquareText,
    bullets: [
      "Hover-to-source on every line item",
      "Scope-change requests via negotiation agent",
      "Post-accept URL = project status page",
    ],
  },
];

function Workflow() {
  return (
    <section
      id="workflow"
      className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white"
    >
      <div className="absolute inset-0 bg-grid-ink" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-px bg-[var(--color-amber)]/40"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-28 lg:px-10 lg:py-36">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="kicker text-[var(--color-amber-soft)]">
              §&nbsp;04 · The four-stage arc
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95] text-white">
              Qualify. Capture.
              <br />
              <span className="italic">Reconcile. Negotiate.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-white/65">
            Mercer doesn&rsquo;t add a new step to your day. It removes the
            ones you were doing by hand, and it puts an agent in the seat for
            each of the rest.
          </p>
        </div>

        {/* Timeline rule */}
        <div className="relative mt-16">
          <div
            className="absolute left-0 right-0 top-10 hidden h-px bg-white/10 md:block"
            aria-hidden
          />
          <ol className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {stages.map((stage, i) => (
              <li key={stage.number} className="relative flex flex-col">
                {/* Dot */}
                <div className="hidden md:block">
                  <div
                    className={`absolute left-0 top-9 h-3 w-3 rounded-full ${
                      i === 0
                        ? "bg-[var(--color-amber)]"
                        : "bg-white/20 ring-4 ring-[var(--color-ink)]"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-3 pt-0 md:pt-20">
                  <span className="font-mono text-xs text-white/40">
                    {stage.number}
                  </span>
                  <stage.icon className="h-4 w-4 text-[var(--color-amber-soft)]" />
                </div>
                <h3 className="mt-4 font-display text-3xl leading-tight">
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {stage.tagline}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  {stage.description}
                </p>
                <ul className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
                  {stage.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-amber-soft)]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  PRODUCT                                   */
/* -------------------------------------------------------------------------- */

function Product() {
  return (
    <section
      id="product"
      className="relative isolate overflow-hidden bg-[var(--color-parchment-soft)] text-[var(--color-ink)]"
    >
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-28 lg:px-10 lg:py-36">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="kicker text-[var(--color-amber)]">
              §&nbsp;05 · What&rsquo;s in the tin
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.25rem,5.5vw,4.75rem)] leading-[0.95]">
              Agents that do the work.
              <br />
              <span className="italic">Records that run the business.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            Every capability below is in the Phase 1 build against the Reno
            Base design partnership. Expense reconciliation, voice-first
            quoting, and the ops-agent layer follow as the foundation holds.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Bot}
            title="Lead qualification agent"
            body="Company to portfolio, public data pull, paint-timing score, generated brief per lead. Your queue is ranked with reasons, not a spreadsheet to triage."
            tag="Qualify"
          />
          <FeatureCard
            icon={Camera}
            title="Mobile capture"
            body="Photo and video from the parking lot. Async upload, offline queue, optional scale references. Works with spotty cell."
            tag="Capture"
          />
          <FeatureCard
            icon={ScanLine}
            title="Vision takeoff agent"
            body="Buildings identified and counted, surfaces enumerated per type, dimensions estimated with a confidence score on every field."
            tag="Capture"
            featured
          />
          <FeatureCard
            icon={Layers}
            title="Structured scope object"
            body="Every line item traces to a measurement, spec, capture image, or customer request. Source-ref is first-class, not a comment field."
            tag="Reconcile"
          />
          <FeatureCard
            icon={FileSearch}
            title="Spec + request ingestion"
            body="Upload a Sherwin-Williams spec PDF; paste a customer RFQ; forward an email. The parser turns each into structured inputs the agents can reconcile."
            tag="Reconcile"
          />
          <FeatureCard
            icon={ListChecks}
            title="Reconciliation agent"
            body="Flags the gap before it becomes a change order. Metal primer missing from the takeoff. Porch floors visible in the capture. Stairwells the customer asked about."
            tag="Reconcile"
          />
          <FeatureCard
            icon={Share2}
            title="Live proposal URL"
            body="Per-building breakdown, hover-to-source on every line, structured comments. No login, no PDF attached. The same URL becomes the project status page on accept."
            tag="Negotiate"
            featured
          />
          <FeatureCard
            icon={MessageSquareText}
            title="Negotiation agent"
            body="Property manager requests a descope or a timeline shift. The negotiation agent drafts a revised bid against your margin targets. You review and send."
            tag="Negotiate"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Audit-ready agent runs"
            body="Every agent operation logs inputs, outputs, model, prompt version, confidence, and cost. Replayable, comparable, tuneable. The bar for trusting agents with money."
            tag="Architecture"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: IconCmp,
  title,
  body,
  tag,
  featured,
}: {
  icon: Icon;
  title: string;
  body: string;
  tag: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-2xl border p-7 transition-colors ${
        featured
          ? "border-[var(--color-amber)]/60 bg-[var(--color-ink)] text-white"
          : "border-[var(--color-parchment-border)] bg-white hover:border-[var(--color-ink)]/25"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            featured
              ? "bg-[var(--color-amber)]/15 text-[var(--color-amber-soft)]"
              : "bg-[var(--color-parchment)] text-[var(--color-ink)]"
          }`}
        >
          <IconCmp className="h-5 w-5" />
        </div>
        <span
          className={`kicker ${featured ? "text-[var(--color-amber-soft)]" : "text-[var(--color-ink)]/45"}`}
        >
          {tag}
        </span>
      </div>
      <h3
        className={`font-display text-xl leading-tight ${featured ? "text-white" : ""}`}
      >
        {title}
      </h3>
      <p
        className={`text-sm leading-relaxed ${featured ? "text-white/75" : "text-[var(--color-ink)]/70"}`}
      >
        {body}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 PRINCIPLES                                 */
/* -------------------------------------------------------------------------- */

const principles: { title: string; body: string }[] = [
  {
    title: "AI does the work.",
    body: "Humans supervise and edit. If a feature looks like human data entry is the origination point, we&rsquo;ve built the wrong shape.",
  },
  {
    title: "Deterministic math, never generative.",
    body: "Square footage, quantities, labor hours, totals, margins. All computed in code from structured inputs. Models orchestrate, read, explain. They don&rsquo;t emit the numbers the business runs on.",
  },
  {
    title: "Every output has a source and a confidence score.",
    body: "Every line item traces back to a measurement, spec, capture, or customer request. Every agent-produced field ships with a confidence score. Trust is built on the paper trail.",
  },
  {
    title: "Capture-first. Form-second.",
    body: "The phone walks the building. The agent drafts. The form is where you edit, not where the record begins.",
  },
  {
    title: "Graceful degradation.",
    body: "When the AI is uncertain, surface it. Low-confidence output is flagged for review, not fabricated into confident numbers.",
  },
  {
    title: "Human override is first-class.",
    body: "Corrections are logged, attributed, and fed back into the eval set. Every edit makes the model better on the next bid.",
  },
  {
    title: "Output that wins work.",
    body: "The property manager&rsquo;s experience is what wins the next bid. The live URL is the differentiator that makes the contractor look good in front of the ownership group.",
  },
];

function Principles() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
      <div className="absolute inset-0 bg-grid-ink" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-28 lg:px-10 lg:py-36">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="kicker text-[var(--color-amber-soft)]">
              §&nbsp;06 · Build principles
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95]">
              Built by a contractor&rsquo;s kid.
              <br />
              <span className="italic text-white/90">
                Not a dashboard designer.
              </span>
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-white/65">
              Mercer&rsquo;s roots are in the family exterior-renovation
              business. Every decision in the product gets measured against a
              single question: <em>does this help the person in the parking
              lot win the job, and does the agent do what the contractor
              used to do?</em>
            </p>
            <div className="mt-10 flex items-center gap-3 text-[var(--color-amber-soft)]">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="kicker">AI-native, not AI-added</span>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {principles.map((p) => (
                <li
                  key={p.title}
                  className="grid grid-cols-1 gap-3 py-6 md:grid-cols-[14rem_1fr] md:gap-10"
                >
                  <h3 className="font-display text-xl leading-tight text-white">
                    {p.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed text-white/70"
                    dangerouslySetInnerHTML={{ __html: p.body }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                FINAL CTA                                   */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-amber)] text-[var(--color-ink)]">
      <div
        className="absolute inset-0 opacity-20 mix-blend-multiply"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(11,12,14,0.18) 1px, transparent 1px),linear-gradient(to bottom, rgba(11,12,14,0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-28 lg:px-10 lg:py-32">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="kicker text-[var(--color-ink)]/60">
              §&nbsp;07 · Your move
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.75rem)] leading-[0.92]">
              Stop transcribing.
              <br />
              <span className="italic">Start capturing.</span>
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--color-ink)]/80">
              Free account, no credit card. Walk a property, run the takeoff
              agent, ship a live proposal URL. One session, start to finish.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-8 text-base font-medium text-white shadow-[0_18px_40px_-12px_rgba(11,12,14,0.5)] transition-transform hover:-translate-y-[1px]"
            >
              Create free account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[var(--color-ink)]/30 bg-transparent px-8 text-base font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)]/5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  FOOTER                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="relative bg-[var(--color-ink)] text-white/55">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-baseline gap-2 text-white">
              <span className="font-display text-2xl">Mercer</span>
              <span className="kicker text-white/40">
                AI-native · Commercial multifamily · Painting first
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              The AI-native operating system for commercial multifamily
              exterior renovation. Painting first, siding and envelope next.
              Point a phone at a building, get a bid.
            </p>
          </div>

          <FooterCol
            title="Product"
            items={[
              ["Workflow", "#workflow"],
              ["Why Mercer", "#positioning"],
              ["Why not the obvious?", "#why-not"],
              ["Capabilities", "#product"],
            ]}
          />
          <FooterCol
            title="Get started"
            items={[
              ["Create account", "/signup"],
              ["Sign in", "/login"],
            ]}
          />
          <FooterCol
            title="Company"
            items={[
              ["Roadmap", "/#product"],
              ["Contact", "mailto:hello@mercer.build"],
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs md:flex-row md:items-center">
          <p className="font-mono text-white/40">
            © {new Date().getFullYear()} Mercer · Built with family in the
            trade
          </p>
          <p className="font-mono text-white/30">
            v0.3 · AI-native preview
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: [label: string, href: string][];
}) {
  return (
    <div>
      <h4 className="kicker text-white/45">{title}</h4>
      <ul className="mt-5 flex flex-col gap-2 text-sm">
        {items.map(([label, href]) => (
          <li key={`${label}-${href}`}>
            <Link
              href={href}
              className="text-white/70 transition-colors hover:text-white"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
