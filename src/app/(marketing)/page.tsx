import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calculator,
  Check,
  ClipboardList,
  HardHat,
  MessageSquareText,
  Share2,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

type Icon = ComponentType<{ className?: string }>;

export default function Home() {
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
            §&nbsp;01 · Built with a working painting contractor
          </span>
          <span className="hidden h-px flex-1 bg-white/10 sm:block" aria-hidden />
          <span className="kicker hidden sm:inline">
            Commercial&nbsp;multifamily&nbsp;·&nbsp;Exterior&nbsp;renovation&nbsp;·&nbsp;Painting&nbsp;first
          </span>
        </div>

        {/* Masthead headline */}
        <h1 className="font-display-editorial text-[clamp(2rem,5.2vw,5.5rem)] leading-[0.92] text-white lg:text-[clamp(2.25rem,4.25vw,6rem)]">
          <span className="block sm:whitespace-nowrap">From trade-show list to signed job,</span>
          <span className="block italic text-white/95 sm:whitespace-nowrap">
            on one screen
            <span className="not-italic text-[var(--color-amber)]">.</span>
          </span>
        </h1>

        <div className="grid grid-cols-1 gap-x-10 gap-y-14 lg:grid-cols-12">
          {/* Subhead + CTAs */}
          <div className="lg:col-span-7">
            <p className="max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Mercer is the sales and job system for commercial multifamily
              exterior contractors. Load the attendee list, work the leads by
              property, quote from your own rates, send a proposal the property
              manager can accept from a link, and run the job to the final
              invoice. AI drafts. You decide.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-[var(--color-amber)] px-6 text-base font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_-12px_rgba(232,93,35,0.65)] transition-transform hover:-translate-y-[1px] hover:bg-[var(--color-amber-soft)]"
              >
                Start a free trial
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
              14 days free, no credit card. Invite your team from settings.
            </p>
          </div>

          {/* Opportunity card */}
          <aside className="lg:col-span-5">
            <OpportunityCard />
          </aside>
        </div>

        {/* Flow strip */}
        <div className="mt-4 grid grid-cols-2 border-y border-[var(--color-ink-rule)] md:grid-cols-5">
          <FlowCell label="01" value="Lists" hint="CSV in, nothing invented" />
          <FlowCell label="02" value="Leads" hint="Grouped by property" />
          <FlowCell label="03" value="Opportunities" hint="Quote, sent, decision" accent />
          <FlowCell label="04" value="Proposal" hint="Live link, accept online" />
          <FlowCell label="05" value="Jobs" hint="Schedule to final invoice" wide />
        </div>
      </div>
    </section>
  );
}

function FlowCell({
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

function OpportunityCard() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="kicker text-white/45">Opportunity · 2027 repaint</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-amber)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-amber-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-amber)]" />
          Proposal sent
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <span className="text-sm text-white/50">Greystar · 8 buildings, 3 stories</span>
        <span className="font-display text-2xl leading-tight text-white">
          Fountains at Pershing
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[12px]">
        <div>
          <dt className="text-white/40">Quote</dt>
          <dd className="text-[var(--color-amber-soft)]">$412,900</dd>
        </div>
        <div>
          <dt className="text-white/40">Sent</dt>
          <dd className="text-white/85">Sep 12</dd>
        </div>
        <div>
          <dt className="text-white/40">Decision expected</dt>
          <dd className="text-white/85">Oct 1 · 11 days</dd>
        </div>
        <div>
          <dt className="text-white/40">Contact</dt>
          <dd className="text-white/85">M. Alvarez, Regional</dd>
        </div>
      </dl>

      {/* Mini timeline mock */}
      <div className="mt-6 flex flex-col gap-2 rounded-lg border border-white/10 bg-[var(--color-ink-soft)] p-4 font-mono text-[11px]">
        {[
          ["Sep 4", "Converted from BAAA attendee list"],
          ["Sep 9", "Quote drafted from your rate card"],
          ["Sep 12", "Proposal link sent, opened twice"],
          ["Sep 18", "Descope requested, revision drafted"],
        ].map(([when, what]) => (
          <div key={when} className="flex items-baseline gap-3">
            <span className="w-12 shrink-0 text-white/40">{when}</span>
            <span className="text-white/80">{what}</span>
          </div>
        ))}
      </div>

      <Link
        href="#workflow"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/75 transition-colors hover:text-white"
      >
        How an opportunity moves
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                POSITIONING                                 */
/* -------------------------------------------------------------------------- */

type Objection = {
  target: string;
  question: string;
  answer: string;
};

const objections: Objection[] = [
  {
    target: "JobNimbus · AccuLynx",
    question: "Why not the roofing CRMs?",
    answer:
      "The closest fit, and they serve commercial roofing well. But bids, measurements, and pricing are shaped around shingles and slopes. Mercer is shaped around buildings, surfaces, and the multifamily property managers who buy exterior work.",
  },
  {
    target: "Salesforce · HubSpot",
    question: "Why not a generic CRM?",
    answer:
      "No idea what a property, an account, or a repaint cycle is. You would spend months configuring fields to end up with a slower Mercer. Mercer ships with the multifamily data model already in it.",
  },
  {
    target: "Procore · BuilderTrend",
    question: "Why not a construction ops suite?",
    answer:
      "Built for ground-up and residential remodel, and they start after the contract is signed. Mercer covers the sale, then runs the job, in one record from first contact to final invoice.",
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
              §&nbsp;02 · Why not the obvious one
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95]">
              Built for the trade.
              <br />
              <span className="italic">Not configured for it.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            Every tool you could use today was built for someone else and bent
            to fit. Mercer starts from how commercial exterior work is actually
            sold and run.
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

        <div className="mt-14 flex flex-col items-start gap-3 border-t border-[var(--color-parchment-border)] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl font-display text-xl italic leading-snug text-[var(--color-ink)]/80">
            &ldquo;The rep follows the firm. A property manager moves companies
            and takes twelve buildings with them. Your CRM should know
            that.&rdquo;
          </p>
          <span className="kicker text-[var(--color-ink)]/50">
            / Design partner, commercial painting
          </span>
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
    title: "Lists",
    tagline: "The trade-show CSV, held as a list",
    description:
      "Drop in the attendee export. Rows stay inert until you convert one. Nothing becomes a lead, contact, or account until you say so, so the pipeline only holds people you actually mean to call.",
    icon: ClipboardList,
    bullets: [
      "CSV import with no side effects",
      "Convert a row into a lead in one click",
      "Converted rows stay stamped",
    ],
  },
  {
    number: "02",
    title: "Leads",
    tagline: "Grouped by property, not by person",
    description:
      "Every lead sits on a property, under an account, with its contacts. See who manages twelve buildings and who manages one. Log the call, set the follow-up, and let the morning brief tell you who is due.",
    icon: Target,
    bullets: [
      "Property, account, and contact spine",
      "Work type and rough size on every lead",
      "Follow-up dates and a daily agenda",
    ],
  },
  {
    number: "03",
    title: "Opportunities",
    tagline: "Quote amount, sent date, decision date",
    description:
      "An opportunity is a tracking record first. Type the quote or let the engine draft one from your saved rates. Record when it went out and when they said they would decide. Overdue decisions surface on their own.",
    icon: Calculator,
    bullets: [
      "Quote engine on your own rate card",
      "Sent and decision dates with overdue flags",
      "Takeoff and pricing folded away until needed",
    ],
  },
  {
    number: "04",
    title: "Proposal",
    tagline: "A link they can accept, not a PDF they lose",
    description:
      "Compose the proposal, send a link. The property manager reads it in the browser and accepts or declines there. Ask for a revision in plain English and Mercer redrafts the numbers against your rates.",
    icon: Share2,
    bullets: [
      "Branded page, no login for the customer",
      "Accept or decline recorded with a name",
      "Conversational revisions, deterministic math",
    ],
  },
  {
    number: "05",
    title: "Jobs",
    tagline: "The same record runs the work",
    description:
      "Accepting flips the opportunity into a job. Schedule, pre-start checklist, expense ledger, budget versus actual, change orders, and invoices and draws all live on the job. Margin is delivered, not guessed.",
    icon: HardHat,
    bullets: [
      "Schedule and pre-start checklist",
      "Expenses, budget, and change orders",
      "Invoices and draws to close-out",
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
              §&nbsp;03 · The workflow
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95] text-white">
              List. Lead. Quote.
              <br />
              <span className="italic">Proposal. Job.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-white/65">
            Five stages, one record. Mercer does not add steps to your day. It
            keeps the ones you already do in a single place, and drafts the
            parts that used to be retyping.
          </p>
        </div>

        {/* Timeline rule */}
        <div className="relative mt-16">
          <div
            className="absolute left-0 right-0 top-10 hidden h-px bg-white/10 md:block"
            aria-hidden
          />
          <ol className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-6">
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
              Records that run the business.
              <br />
              <span className="italic">AI that drafts, never decides.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-[var(--color-ink)]/70">
            Everything below is live today and included in one flat monthly
            price. No per-seat math, no AI credits to watch.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={ClipboardList}
            title="Lists and convert"
            body="Import the attendee CSV as a list. Convert a row when you mean it. Leads, contacts, and accounts only get created on purpose."
            tag="Lists"
          />
          <FeatureCard
            icon={Building2}
            title="Property, account, contact spine"
            body="Every lead sits on a property under a management account with its people. Contacts move firms and the history follows them. Portfolio counts show who is worth the call."
            tag="Leads"
            featured
          />
          <FeatureCard
            icon={Sparkles}
            title="Spec-to-lead intake"
            body="Upload the paint spec, the RFP, or a forwarded email. Mercer pulls the property, contact, work type, and rough size into the lead form for you to check before it saves."
            tag="Leads"
          />
          <FeatureCard
            icon={Calculator}
            title="Quote engine on your rates"
            body="Describe the job in a sentence. The engine multiplies paintable area, access, and margin target against your saved rate card. The model reads the sentence. Code does the math."
            tag="Opportunities"
          />
          <FeatureCard
            icon={Share2}
            title="Live proposal link"
            body="Branded proposal page, no login, no attachment. The property manager accepts or declines in the browser and the opportunity updates itself."
            tag="Proposal"
            featured
          />
          <FeatureCard
            icon={MessageSquareText}
            title="Revise in plain English"
            body="Drop the second coat on building four, add the stairwells. Mercer drafts the next version against your rates and you review every line item before it goes out."
            tag="Proposal"
          />
          <FeatureCard
            icon={HardHat}
            title="Jobs to final invoice"
            body="Schedule, pre-start checklist, expense ledger, budget versus actual, change orders, invoices and draws. The job is the same record you sold."
            tag="Jobs"
          />
          <FeatureCard
            icon={BarChart3}
            title="Reports that answer the owner"
            body="Funnel by source, work by type, delivered margin, why quotes declined, and the six-month rhythm. Plus an Ask tab for the question the report did not anticipate."
            tag="Reports"
          />
          <FeatureCard
            icon={Users}
            title="Your whole team"
            body="Invite reps and office staff by email. Every account has an internal rep so the relationship survives turnover. The morning brief tells each person what is due today."
            tag="Team"
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
    title: "Deterministic math, never generative.",
    body: "Square footage, labor hours, totals, and margins are computed in code from your saved rates. The model reads and explains. It does not invent the number the business runs on.",
  },
  {
    title: "AI drafts. You decide.",
    body: "Every draft, whether a lead, a quote, or a revised proposal, lands in a form for you to check before it saves or sends. Nothing goes to a customer without a human clicking send.",
  },
  {
    title: "One record, first call to final invoice.",
    body: "The list row becomes the lead, becomes the opportunity, becomes the job. Nothing is retyped between stages and nothing is lost when the deal changes hands.",
  },
  {
    title: "The rep follows the firm.",
    body: "Accounts carry an internal owner. Contacts carry employment history. When a property manager changes companies, you still know who to call and who owns the relationship.",
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
              §&nbsp;05 · How we build
            </span>
            <h2 className="mt-6 font-display-editorial text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95]">
              Built by a contractor&rsquo;s kid.
              <br />
              <span className="italic text-white/90">
                Shaped by a working crew.
              </span>
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-white/65">
              Mercer&rsquo;s roots are in the family exterior-renovation
              business, and every release is built against a real commercial
              painting contractor&rsquo;s pipeline. One question decides what
              ships: <em>does this help the person in the parking lot win the
              job and get paid for it?</em>
            </p>
            <div className="mt-10 flex items-center gap-3 text-[var(--color-amber-soft)]">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="kicker">AI included, not added on</span>
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
              Stop retyping.
              <br />
              <span className="italic">Start closing.</span>
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--color-ink)]/80">
              14 days free, no credit card. Load your last trade-show list,
              convert one lead, send one proposal link. You will know by the
              end of the afternoon.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-8 text-base font-medium text-white shadow-[0_18px_40px_-12px_rgba(11,12,14,0.5)] transition-transform hover:-translate-y-[1px]"
            >
              Start free trial
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
                Commercial multifamily · Painting first
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              The sales and job system for commercial multifamily exterior
              contractors. Painting first, siding and envelope next. From the
              trade-show list to the final invoice.
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
              ["Start free trial", "/signup"],
              ["Sign in", "/login"],
            ]}
          />
          <FooterCol
            title="Company"
            items={[["Contact", "mailto:hello@mercer.build"]]}
          />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs md:flex-row md:items-center">
          <p className="font-mono text-white/40">
            © {new Date().getFullYear()} Mercer · Built with family in the
            trade
          </p>
          <p className="font-mono text-white/30">Early access</p>
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
