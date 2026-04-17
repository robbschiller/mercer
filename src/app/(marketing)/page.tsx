import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  FileSignature,
  FileText,
  Layers,
  LineChart,
  MapPin,
  Ruler,
  Share2,
  UploadCloud,
} from "lucide-react";
import type { ComponentType } from "react";
import { getSessionUser } from "@/lib/supabase/auth-cache";

type Icon = ComponentType<{ className?: string }>;

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/bids");

  return (
    <div className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
      <Hero />
      <Positioning />
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
            §&nbsp;01 · Now in field trials with Reno Base
          </span>
          <span className="hidden h-px flex-1 bg-white/10 sm:block" aria-hidden />
          <span className="kicker hidden sm:inline">
            Multifamily&nbsp;·&nbsp;Exterior&nbsp;renovation&nbsp;·&nbsp;Lead&nbsp;→&nbsp;Close
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-14 lg:grid-cols-12">
          {/* Headline */}
          <div className="lg:col-span-8">
            <h1 className="font-display-editorial text-[clamp(3rem,8.2vw,7.25rem)] leading-[0.9] text-white">
              From trade show list
              <br />
              <span className="italic text-white/95">
                to signed deal<span className="text-[var(--color-amber)]">.</span>
              </span>
            </h1>
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Mercer is the sales platform for exterior renovation contractors
              bidding multifamily. Ingest an attendee list, enrich every row
              with property intelligence, build the bid, and close on a
              shareable link — all in one place.
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
              No credit card. Import your next trade show list in under five
              minutes.
            </p>
          </div>

          {/* Field-notes card */}
          <aside className="lg:col-span-4">
            <FieldCard />
          </aside>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-2 border-y border-[var(--color-ink-rule)] md:grid-cols-5">
          <KpiCell label="Leads imported" value="247" hint="NAA Orlando 2026" />
          <KpiCell
            label="Enriched"
            value="198"
            hint="Property + footprint"
            accent
          />
          <KpiCell label="Quoted" value="34" hint="Proposals sent" />
          <KpiCell label="Won" value="8" hint="On signed URL" />
          <KpiCell
            label="Pipeline"
            value="$1.24M"
            hint="Est. + actual"
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
        <span className="kicker text-white/45">Field card · lead #0238</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-amber)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-amber-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-amber)]" />
          Enriched
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <span className="text-sm text-white/50">Willowood at Perimeter</span>
        <span className="font-display text-2xl leading-tight text-white">
          Greystar Real Estate
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[12px]">
        <div>
          <dt className="text-white/40">Address</dt>
          <dd className="text-white/85">8205 Hammond Dr NE · GA</dd>
        </div>
        <div>
          <dt className="text-white/40">Buildings</dt>
          <dd className="text-white/85">49 · OSM footprint</dd>
        </div>
        <div>
          <dt className="text-white/40">Est. exterior sqft</dt>
          <dd className="text-white/85">412,900</dd>
        </div>
        <div>
          <dt className="text-white/40">Preliminary bid</dt>
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
            <rect x="28" y="96" width="28" height="16" />
            <rect x="66" y="98" width="42" height="14" />
            <rect x="118" y="94" width="30" height="18" />
            <rect x="158" y="98" width="24" height="14" />
          </g>
        </svg>
        <span className="absolute bottom-2 left-3 font-mono text-[10px] text-white/40">
          OSM · building footprints
        </span>
      </div>

      <Link
        href="#workflow"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/75 transition-colors hover:text-white"
      >
        How the enrichment works
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
    name: "EagleView",
    owns: "Aerial measurement",
    owns_short: "measurements",
    blurb:
      "High-accuracy 3D property reports. Owns the pixels in the sky. Stops at the measurement.",
    tone: "muted",
  },
  {
    name: "STACK · PlanSwift",
    owns: "Blueprint takeoff",
    owns_short: "takeoffs",
    blurb:
      "Digital takeoffs from PDFs and elevations. Only useful when you actually have plans — which you mostly don't.",
    tone: "muted",
  },
  {
    name: "Salesforce · Procore",
    owns: "Generic pipeline",
    owns_short: "CRM",
    blurb:
      "Powerful, infinitely configurable, and built for anyone. Doesn't speak takeoff, building, or multifamily.",
    tone: "muted",
  },
  {
    name: "Mercer",
    owns: "Lead → close",
    owns_short: "the whole job",
    blurb:
      "Trade show list in, signed proposal out. Every step in the language of the exterior renovation contractor.",
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
              Everyone owns a piece.
              <br />
              <span className="italic">Nobody owns the whole job.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            The exterior renovation contractor working multifamily stitches
            four tools together and still ends up re-keying property data into
            a spreadsheet. Mercer is the seam.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {competitors.map((c) => (
            <CompetitorCard key={c.name} competitor={c} />
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 border-t border-[var(--color-parchment-border)] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl font-display text-xl italic leading-snug text-[var(--color-ink)]/80">
            &ldquo;Nobody owns the full lead-to-close workflow for the
            exterior renovation contractor working multifamily. That&rsquo;s
            the niche.&rdquo;
          </p>
          <span className="kicker text-[var(--color-ink)]/50">
            — Mercer strategy note
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
    title: "Ingest",
    tagline: "Drop in a trade show list",
    description:
      "Upload the raw CSV you exported from the conference portal. Mercer parses columns client-side, maps name / company / email / property, and tags the batch (e.g. NAA Orlando 2026).",
    icon: UploadCloud,
    bullets: [
      "Papa-Parse client-side preview",
      "Hardcoded column mapping",
      "Everything else preserved as jsonb",
    ],
  },
  {
    number: "02",
    title: "Enrich",
    tagline: "Turn names into property intelligence",
    description:
      "Google Places resolves each company and property to an address, lat/lng, and place_id. OpenStreetMap returns building footprints within 75m. Mercer does the geometry and writes back a preliminary bid.",
    icon: MapPin,
    bullets: [
      "Places · address + coordinates",
      "OSM · footprint + story count",
      "Est. sqft × your $/sqft → est. bid",
    ],
  },
  {
    number: "03",
    title: "Bid",
    tagline: "Build it from the parking lot",
    description:
      "Click through to the existing bid engine with property data pre-filled. Add building types as you walk, enter dimensions naturally (\u201c90 \u00d7 33\u201d), price coverage / labor / margin, stack line items. Live totals, every keystroke.",
    icon: Ruler,
    bullets: [
      "Pre-populated property + satellite",
      "Building-count multiplier",
      "Coverage, labor, margin, line items",
    ],
  },
  {
    number: "04",
    title: "Close",
    tagline: "Ship a link that accepts itself",
    description:
      "Generate a shareable proposal URL — no login, no PDF attachment in a thread. The customer taps Accept; the bid flips to Won, the lead flips to Won, the pipeline updates in real time.",
    icon: FileSignature,
    bullets: [
      "Public /p/[slug] HTML proposal",
      "One-tap Accept / Decline",
      "Status propagates automatically",
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
              §&nbsp;03 · The four-stage arc
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95] text-white">
              Ingest. Enrich.
              <br />
              <span className="italic">Bid. Close.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-white/65">
            Mercer doesn&apos;t add a new step to your day. It removes three
            of them — and gives you a single pane of glass from first contact
            to signed deal.
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
              §&nbsp;04 · What&rsquo;s in the tin
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.25rem,5.5vw,4.75rem)] leading-[0.95]">
              One app. The whole funnel.
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            Every capability below is shipping in the Reno Base MVP.
            Photos-in-proposals and per-salesperson attribution are on deck;
            ERP scope (contracts, schedules, subs) arrives post-validation.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={UploadCloud}
            title="CSV lead import"
            body="Upload an attendee list, preview the first 10 rows, map columns, tag the source, and bulk-insert."
            tag="Ingest"
          />
          <FeatureCard
            icon={MapPin}
            title="Property intelligence"
            body="Google Places + OpenStreetMap enrichment. Address, coordinates, building count, footprint sqft."
            tag="Enrich"
            featured
          />
          <FeatureCard
            icon={LineChart}
            title="Preliminary bid estimates"
            body={"Footprint \u00d7 stories \u00d7 your $/sqft defaults turn every row into a dollar number before you\u2019ve picked up the phone."}
            tag="Enrich"
          />
          <FeatureCard
            icon={Building2}
            title="On-site bid engine"
            body="Buildings with counts. Natural dimension entry. Surface presets. Live totals. Coverage, labor, margin, line items."
            tag="Bid"
          />
          <FeatureCard
            icon={Ruler}
            title="Satellite + footprints"
            body={"Static Maps thumbnails and OSM overlays confirm you\u2019re looking at the right property \u2014 before you bid it."}
            tag="Bid"
          />
          <FeatureCard
            icon={FileText}
            title="Client-facing proposals"
            body="Per-building breakdowns, scope, total price, satellite image. HTML on the web, PDF on demand."
            tag="Close"
          />
          <FeatureCard
            icon={Share2}
            title="Shareable accept link"
            body="A hosted /p/[slug] URL the customer can Accept without creating an account. Wins flip the pipeline automatically."
            tag="Close"
            featured
          />
          <FeatureCard
            icon={Layers}
            title="Unified pipeline"
            body="Leads · Quoted · Won · Lost · Pipeline $. Filter by trade show, funnel conversion between stages."
            tag="Close"
          />
          <FeatureCard
            icon={FileSignature}
            title="Audit trail"
            body="Who accepted, when, from what IP, on what device. Declined reasons captured so lost is never a mystery."
            tag="Close"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
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
          <Icon className="h-5 w-5" />
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
    title: "Mobile-first, on-site.",
    body: "Contractors use it in the parking lot. Fast inputs, large tap targets, no layouts that hide behind a keyboard.",
  },
  {
    title: "Bid in real time.",
    body: "Every change updates totals immediately. No \u201chit calculate\u201d button. Numbers move with your fingers.",
  },
  {
    title: "Suggest, don\u2019t constrain.",
    body: "Real properties don\u2019t fit templates. Presets for surfaces, defaults for rates \u2014 override anything, any time.",
  },
  {
    title: "Automate the tedium.",
    body: "Satellite imagery, building footprints, CSV enrichment. The computer does the keying; you do the judgment.",
  },
  {
    title: "Close the loop.",
    body: "Lead, bid, proposal, accept, won. One system. One audit trail. No spreadsheet shadow pipeline.",
  },
  {
    title: "Output that wins work.",
    body: "Proposals a property manager actually enjoys reading \u2014 and can sign in the same tab.",
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
              §&nbsp;05 · Build principles
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
              lot win the job?</em>
            </p>
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
                  <p className="text-sm leading-relaxed text-white/70">
                    {p.body}
                  </p>
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
              §&nbsp;06 · Your move
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.75rem)] leading-[0.92]">
              Bring in your next
              <br />
              <span className="italic">trade show list.</span>
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--color-ink)]/80">
              Free account, no credit card. Upload your CSV, watch the rows
              resolve, and generate a bid on a real property in under an hour.
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
                Sales platform · Exterior renovation
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              The sales platform for exterior renovation contractors bidding
              multifamily. Trade show list in, signed deal out.
            </p>
          </div>

          <FooterCol
            title="Product"
            items={[
              ["Workflow", "#workflow"],
              ["Why Mercer", "#positioning"],
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
            v0.2 · Lead-to-close preview
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
          <li key={label}>
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
