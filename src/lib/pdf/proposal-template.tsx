import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatDimensions } from "@/lib/dimensions";
import { formatCurrency } from "@/lib/pricing";
import {
  ACCESS_TYPE_LABELS,
  BUILDING_ARCHETYPE_LABELS,
  priceListCategoryLabel,
  pricingUnitLabel,
  type AccessType,
  type BuildingArchetype,
} from "@/lib/status-meta";
import type {
  ProposalSnapshot,
  SnapshotAccessItem,
  SnapshotLineItem,
} from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 32,
  },
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  brandLogo: {
    height: 28,
    maxWidth: 110,
    objectFit: "contain",
  },
  brandName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  brandTagline: {
    fontSize: 7.5,
    color: "#666666",
    marginTop: 1,
  },
  brandContact: {
    marginLeft: "auto",
    textAlign: "right",
  },
  brandContactLine: {
    fontSize: 7.5,
    color: "#666666",
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
  },
  propertyBlock: {
    marginBottom: 4,
  },
  propertyLabel: {
    fontSize: 9,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  propertyValue: {
    fontSize: 12,
    marginBottom: 8,
  },
  satelliteSection: {
    marginTop: 20,
  },
  satelliteImage: {
    width: 480,
    maxHeight: 280,
    objectFit: "contain" as const,
    marginTop: 8,
  },
  satelliteCaption: {
    fontSize: 8,
    color: "#666",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    marginTop: 24,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  buildingHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 12,
  },
  buildingArchetype: {
    fontSize: 9,
    color: "#666",
    fontFamily: "Helvetica",
  },
  partyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  partyCell: {
    width: "50%",
    paddingRight: 12,
    marginBottom: 10,
  },
  partyLabel: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  partyValue: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  partyValueMuted: {
    fontSize: 10,
    color: "#999",
  },
  accessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  accessRowAlt: {
    backgroundColor: "#f9f9f9",
  },
  accessDescription: {
    flex: 1,
    fontSize: 9,
  },
  accessMeta: {
    width: 110,
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  accessAmount: {
    width: 80,
    fontSize: 9,
    textAlign: "right",
  },
  surfaceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  surfaceRowAlt: {
    backgroundColor: "#f9f9f9",
  },
  surfaceName: {
    flex: 1,
    fontSize: 9,
  },
  surfaceDimensions: {
    width: 120,
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  surfaceSqft: {
    width: 80,
    fontSize: 9,
    textAlign: "right",
  },
  buildingTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  buildingTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  buildingTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  scopeText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  /* ── Quote line table (032+ snapshots with qty/unit pricing) ── */
  quoteCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  quoteCategoryLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    color: "#666",
  },
  quoteCategoryTotal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#666",
  },
  quoteLineRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  quoteLineRowAlt: {
    backgroundColor: "#f9f9f9",
  },
  quoteLineName: {
    flex: 1,
    fontSize: 9,
    paddingRight: 8,
  },
  quoteLineSku: {
    fontSize: 7,
    color: "#999",
  },
  quoteLineQty: {
    width: 90,
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  quoteLineUnitPrice: {
    width: 70,
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  quoteLineAmount: {
    width: 80,
    fontSize: 9,
    textAlign: "right",
  },
  quoteSubtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  quoteSubtotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  quoteSubtotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  rateCardNote: {
    marginTop: 4,
    fontSize: 7.5,
    color: "#666666",
  },
  priceSection: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  priceValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  notesSection: {
    marginTop: 20,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  /* ── Sales-document layer (§A2) — all sections conditional on snapshot.document ── */
  coverSubtitle: {
    fontSize: 9.5,
    color: "#444",
    lineHeight: 1.5,
    marginTop: -4,
    marginBottom: 8,
    maxWidth: 420,
  },
  eyebrow: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  whyUsHeadline: {
    fontSize: 20,
    fontFamily: "Times-Bold",
    marginBottom: 10,
  },
  leadParagraph: {
    fontSize: 10,
    color: "#444",
    lineHeight: 1.6,
    marginBottom: 14,
  },
  promiseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  promiseCell: {
    width: "50%",
    padding: 4,
  },
  promiseBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
    minHeight: 48,
  },
  promiseTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  promiseBody: {
    fontSize: 8.5,
    color: "#444",
    lineHeight: 1.5,
  },
  statRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: "#f3f3f3",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  statValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  statLabel: {
    fontSize: 6.5,
    color: "#666",
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 3,
  },
  includedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  includedCell: {
    width: "50%",
    paddingRight: 12,
    marginBottom: 8,
  },
  includedBody: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  includedLead: {
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  investStats: {
    fontSize: 8.5,
    color: "#666",
    textAlign: "right",
    marginTop: 6,
  },
  scheduleHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  scheduleHeadCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    color: "#666",
  },
  scheduleRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  scheduleMilestone: {
    flex: 1,
    fontSize: 9,
    paddingRight: 8,
  },
  scheduleShare: {
    width: 60,
    textAlign: "right",
  },
  scheduleShareValue: {
    width: 60,
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  scheduleAmount: {
    width: 80,
    textAlign: "right",
  },
  scheduleAmountValue: {
    width: 80,
    fontSize: 9,
    textAlign: "right",
  },
  stepRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    padding: 10,
  },
  stepEyebrow: {
    fontSize: 7,
    color: "#cccccc",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  stepTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginTop: 4,
  },
  stepBody: {
    fontSize: 8,
    color: "#e5e5e5",
    lineHeight: 1.5,
    marginTop: 3,
  },
  testimonialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  testimonialCell: {
    width: "50%",
    padding: 4,
  },
  testimonialBox: {
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    padding: 10,
  },
  testimonialQuote: {
    fontSize: 9,
    fontFamily: "Times-Italic",
    lineHeight: 1.6,
  },
  testimonialAttribution: {
    fontSize: 6.5,
    color: "#666",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  termRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  termBullet: {
    width: 12,
    fontSize: 9,
    color: "#444",
  },
  termText: {
    flex: 1,
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  termLead: {
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  holdCallout: {
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  holdCalloutText: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  acceptanceCta: {
    fontSize: 9.5,
    color: "#444",
    lineHeight: 1.5,
  },
  sigRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 26,
  },
  sigCellWide: {
    flex: 2,
  },
  sigCell: {
    flex: 1,
  },
  sigLine: {
    height: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 7.5,
    color: "#666",
  },
});

function accessMeta(item: SnapshotAccessItem): string {
  const parts: string[] = [];
  if (item.quantity != null) parts.push(`qty ${item.quantity}`);
  if (item.durationDays != null) parts.push(`${item.durationDays} d`);
  return parts.join(" · ");
}

const fmtQty = new Intl.NumberFormat("en-US");

/**
 * Group quote lines by category, largest total first — mirrors the review
 * screen so the customer document matches what the salesperson approved.
 */
function groupLinesByCategory(
  lines: SnapshotLineItem[],
): Array<{ label: string; total: number; lines: SnapshotLineItem[] }> {
  const groups = new Map<string, SnapshotLineItem[]>();
  for (const line of lines) {
    const key = line.category ?? "other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(line);
    else groups.set(key, [line]);
  }
  return [...groups.entries()]
    .map(([key, groupLines]) => ({
      label: priceListCategoryLabel(key),
      total: groupLines.reduce((s, l) => s + l.amount, 0),
      lines: groupLines,
    }))
    .sort((a, b) => b.total - a.total);
}

/** "4,000 sq ft" / "3 each" — empty for legacy amount-only lines. */
function lineQtyText(line: SnapshotLineItem): string {
  if (line.qty == null) return "";
  const unit = line.unit ? ` ${pricingUnitLabel(line.unit)}` : "";
  return `${fmtQty.format(line.qty)}${unit}`;
}

/** Whole-dollar money for per-unit stats ("$1,478 per unit"). */
const wholeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** ISO date → "December 31, 2026" (UTC so a date-only string can't roll back a day). */
function formatHeldThrough(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Pressure wash" → "Pressure wash." — the bold lead of a checklist item. */
function boldLead(title: string): string {
  const t = title.trim();
  return /[.:!?]$/.test(t) ? t : `${t}.`;
}

/** Testimonial quotes come with or without their own quote marks — normalize. */
function stripQuotes(quote: string): string {
  return quote.trim().replace(/^["“]/, "").replace(/["”]$/, "");
}

/** Terms carry their own "Price." / "Warranty." lead-ins — bold them. */
function TermLine({ text }: { text: string }) {
  const m = text.match(/^(.{1,48}?[.:])\s+([\s\S]+)$/);
  if (!m) return <Text style={styles.termText}>{text}</Text>;
  return (
    <Text style={styles.termText}>
      <Text style={styles.termLead}>{m[1]}</Text> {m[2]}
    </Text>
  );
}

export function ProposalDocument({
  snapshot,
}: {
  snapshot: ProposalSnapshot;
}) {
  const allSurfaceNames = new Set<string>();
  for (const b of snapshot.buildings) {
    for (const s of b.surfaces) {
      allSurfaceNames.add(s.name);
    }
  }
  const scopeList = Array.from(allSurfaceNames).join(", ");

  const formattedDate = new Date(snapshot.generatedAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const parties = snapshot.parties ?? null;
  const hasParties =
    parties != null &&
    (parties.managementCompany ||
      parties.ownerName ||
      parties.ownerAddress ||
      parties.ntoRecipientName);

  const accessItems = snapshot.accessItems ?? [];
  const hasBuildings = snapshot.buildings.length > 0;
  // Rate-only lines render as a separate rate card, not in the priced scope.
  const committedLines = snapshot.lineItems.filter((li) => !li.rateOnly);
  const rateLines = snapshot.lineItems.filter((li) => li.rateOnly === true);
  // Quote-engine snapshots carry per-line pricing; legacy ones are name+amount.
  const hasRichLines = committedLines.some(
    (li) => li.qty != null && li.unitPrice != null,
  );
  const lineGroups = hasRichLines ? groupLinesByCategory(committedLines) : [];
  const lineSubtotal = committedLines.reduce((s, l) => s + l.amount, 0);
  const versionSuffix =
    snapshot.version != null ? ` · v${snapshot.version}` : "";
  const brand = snapshot.brand ?? null;
  const accent = brand?.accentColor ?? brand?.primaryColor ?? null;

  // Sales-document copy layer (§A2) — absent on older snapshots, and any
  // slot may be null. Every section below degrades to the pre-A2 layout.
  const doc = snapshot.document ?? null;
  const promises = doc?.promises ?? [];
  const statChips = doc?.statChips ?? [];
  const included = doc?.included ?? [];
  const paymentSchedule = doc?.paymentSchedule ?? [];
  const whatToExpect = doc?.whatToExpect ?? [];
  const testimonials = doc?.testimonials ?? [];
  const terms = doc?.terms ?? [];
  const hasWhyUs =
    Boolean(doc?.whyUsHeadline || doc?.whyUsBody) ||
    promises.length > 0 ||
    statChips.length > 0;
  const heldThrough = doc?.priceHeldThrough
    ? formatHeldThrough(doc.priceHeldThrough)
    : null;
  const investStats: string[] = [];
  if (doc?.perSf != null)
    investStats.push(`${formatCurrency(doc.perSf)} per square foot`);
  if (doc?.perUnit != null)
    investStats.push(
      `${wholeCurrency.format(doc.perUnit)} per unit${
        doc.unitCount != null ? ` · ${fmtQty.format(doc.unitCount)} units` : ""
      }`,
    );
  if (doc?.durationLine) investStats.push(doc.durationLine);

  const footerEl = (
    <Text style={styles.footer}>
      {brand?.companyName
        ? `${brand.companyName}${brand.credentials ? ` · ${brand.credentials}` : ""} — ${formattedDate}${versionSuffix}`
        : `Generated by Mercer — ${formattedDate}${versionSuffix}`}
    </Text>
  );

  const coverContent = (
    <>
        {brand?.companyName ? (
          <View style={styles.brandBar}>
            {brand.logoUrl ? (
              /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */
              <Image src={brand.logoUrl} style={styles.brandLogo} />
            ) : null}
            <View>
              <Text style={styles.brandName}>{brand.companyName}</Text>
              {brand.tagline ? (
                <Text style={styles.brandTagline}>{brand.tagline}</Text>
              ) : null}
            </View>
            <View style={styles.brandContact}>
              {brand.phone ? (
                <Text style={styles.brandContactLine}>{brand.phone}</Text>
              ) : null}
              {brand.email ? (
                <Text style={styles.brandContactLine}>{brand.email}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
        <View
          style={
            accent
              ? [
                  styles.header,
                  {
                    borderBottomWidth: 2,
                    borderBottomColor: accent,
                    paddingBottom: 12,
                  },
                ]
              : styles.header
          }
        >
          <Text style={accent ? [styles.title, { color: accent }] : styles.title}>
            Proposal
          </Text>
          <Text style={styles.date}>
            {formattedDate}
            {versionSuffix}
          </Text>

          <View style={styles.propertyBlock}>
            <Text style={styles.propertyLabel}>Property</Text>
            <Text style={styles.propertyValue}>
              {snapshot.propertyName}
            </Text>
            {doc?.coverSubtitle ? (
              <Text style={styles.coverSubtitle}>{doc.coverSubtitle}</Text>
            ) : null}
          </View>
          <View style={styles.propertyBlock}>
            <Text style={styles.propertyLabel}>Address</Text>
            <Text style={styles.propertyValue}>{snapshot.address}</Text>
          </View>
          <View style={styles.propertyBlock}>
            <Text style={styles.propertyLabel}>Prepared for</Text>
            <Text style={styles.propertyValue}>{snapshot.clientName}</Text>
          </View>
        </View>

        {snapshot.satelliteImageDataUri ? (
          <View style={styles.satelliteSection}>
            <Text style={styles.sectionTitle}>Property location</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not a DOM img */}
            <Image
              src={snapshot.satelliteImageDataUri}
              style={styles.satelliteImage}
            />
            <Text style={styles.satelliteCaption}>Map imagery © Google</Text>
          </View>
        ) : null}

        {hasParties && parties ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Ownership & Notice to Owner</Text>
            <View style={styles.partyGrid}>
              <View style={styles.partyCell}>
                <Text style={styles.partyLabel}>Management company</Text>
                <Text
                  style={
                    parties.managementCompany
                      ? styles.partyValue
                      : styles.partyValueMuted
                  }
                >
                  {parties.managementCompany ?? "—"}
                </Text>
              </View>
              <View style={styles.partyCell}>
                <Text style={styles.partyLabel}>Legal owner</Text>
                <Text
                  style={
                    parties.ownerName
                      ? styles.partyValue
                      : styles.partyValueMuted
                  }
                >
                  {parties.ownerName ?? "—"}
                </Text>
              </View>
              <View style={styles.partyCell}>
                <Text style={styles.partyLabel}>Owner address</Text>
                <Text
                  style={
                    parties.ownerAddress
                      ? styles.partyValue
                      : styles.partyValueMuted
                  }
                >
                  {parties.ownerAddress ?? "—"}
                </Text>
              </View>
              <View style={styles.partyCell}>
                <Text style={styles.partyLabel}>Notice to Owner recipient</Text>
                <Text
                  style={
                    parties.ntoRecipientName
                      ? styles.partyValue
                      : styles.partyValueMuted
                  }
                >
                  {parties.ntoRecipientName ?? "—"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
    </>
  );

  // "Why us" (§A2) — its own page after the cover, Jordan-style.
  const whyUsContent = hasWhyUs ? (
    <View>
      <Text style={accent ? [styles.eyebrow, { color: accent }] : styles.eyebrow}>
        Why {brand?.companyName ?? "us"}
      </Text>
      {doc?.whyUsHeadline ? (
        <Text style={styles.whyUsHeadline}>{doc.whyUsHeadline}</Text>
      ) : null}
      {doc?.whyUsBody ? (
        <Text style={styles.leadParagraph}>{doc.whyUsBody}</Text>
      ) : null}
      {promises.length > 0 ? (
        <View style={styles.promiseGrid}>
          {promises.map((p, i) => (
            <View key={i} style={styles.promiseCell}>
              <View style={styles.promiseBox}>
                <Text
                  style={
                    accent
                      ? [styles.promiseTitle, { color: accent }]
                      : styles.promiseTitle
                  }
                >
                  {p.title}
                </Text>
                <Text style={styles.promiseBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {statChips.length > 0 ? (
        <View style={styles.statRow}>
          {statChips.map((c, i) => (
            <View key={i} style={styles.statChip}>
              <Text style={styles.statValue}>{c.value}</Text>
              <Text style={styles.statLabel}>{c.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  ) : null;

  const mainContent = (
    <>
        {doc?.scopeIntro ? (
          <View>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            <Text style={styles.scopeText}>{doc.scopeIntro}</Text>
          </View>
        ) : null}

        {hasBuildings && (
          <Text style={styles.sectionTitle}>Building Breakdown</Text>
        )}

        {snapshot.buildings.map((building, bi) => (
          <View key={bi} wrap={false}>
            <Text style={styles.buildingHeader}>
              {building.label}
              {building.count > 1 ? ` (x${building.count})` : ""}
              {building.archetype ? (
                <Text style={styles.buildingArchetype}>
                  {"  ·  "}
                  {BUILDING_ARCHETYPE_LABELS[
                    building.archetype as BuildingArchetype
                  ] ?? building.archetype}
                </Text>
              ) : null}
            </Text>

            {building.surfaces.map((surface, si) => (
              <View
                key={si}
                style={
                  si % 2 === 1
                    ? [styles.surfaceRow, styles.surfaceRowAlt]
                    : styles.surfaceRow
                }
              >
                <Text style={styles.surfaceName}>{surface.name}</Text>
                <Text style={styles.surfaceDimensions}>
                  {formatDimensions(surface.dimensions)}
                </Text>
                <Text style={styles.surfaceSqft}>
                  {surface.totalSqft.toLocaleString()} sqft
                </Text>
              </View>
            ))}

            <View style={styles.buildingTotal}>
              <Text style={styles.buildingTotalLabel}>
                Building total
              </Text>
              <Text style={styles.buildingTotalValue}>
                {building.totalSqft.toLocaleString()} sqft
              </Text>
            </View>
            {building.count > 1 && (
              <View
                style={[styles.buildingTotal, { borderTopWidth: 0 }]}
              >
                <Text style={styles.buildingTotalLabel}>
                  x {building.count} buildings
                </Text>
                <Text style={styles.buildingTotalValue}>
                  {(building.totalSqft * building.count).toLocaleString()}{" "}
                  sqft
                </Text>
              </View>
            )}
          </View>
        ))}

        {hasBuildings && (
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Area</Text>
            <Text style={styles.grandTotalValue}>
              {snapshot.totalSqft.toLocaleString()} sqft
            </Text>
          </View>
        )}

        {included.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{"What's Included"}</Text>
            <View style={styles.includedGrid}>
              {included.map((item, i) => (
                <View key={i} style={styles.includedCell}>
                  <Text style={styles.includedBody}>
                    <Text
                      style={
                        accent
                          ? [styles.includedLead, { color: accent }]
                          : styles.includedLead
                      }
                    >
                      {boldLead(item.title)}
                    </Text>{" "}
                    {item.body}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {scopeList && (
          <>
            <Text style={styles.sectionTitle}>Scope Includes</Text>
            <Text style={styles.scopeText}>{scopeList}</Text>
          </>
        )}

        {accessItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Access</Text>
            {accessItems.map((item, i) => (
              <View
                key={i}
                style={
                  i % 2 === 1
                    ? [styles.accessRow, styles.accessRowAlt]
                    : styles.accessRow
                }
              >
                <Text style={styles.accessDescription}>
                  {ACCESS_TYPE_LABELS[item.type as AccessType] ?? item.type}
                  {item.method ? ` — ${item.method}` : ""}
                </Text>
                <Text style={styles.accessMeta}>{accessMeta(item)}</Text>
                <Text style={styles.accessAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </>
        )}

        {hasRichLines ? (
          <>
            <Text style={styles.sectionTitle}>Scope & Pricing</Text>
            {lineGroups.map((group) => (
              <View key={group.label} wrap={false}>
                <View style={styles.quoteCategoryHeader}>
                  <Text style={styles.quoteCategoryLabel}>{group.label}</Text>
                  <Text style={styles.quoteCategoryTotal}>
                    {formatCurrency(group.total)}
                  </Text>
                </View>
                {group.lines.map((line, i) => (
                  <View
                    key={i}
                    style={
                      i % 2 === 1
                        ? [styles.quoteLineRow, styles.quoteLineRowAlt]
                        : styles.quoteLineRow
                    }
                  >
                    <Text style={styles.quoteLineName}>
                      {line.name}
                      {line.sku ? (
                        <Text style={styles.quoteLineSku}>
                          {"  "}
                          {line.sku}
                        </Text>
                      ) : null}
                    </Text>
                    <Text style={styles.quoteLineQty}>
                      {lineQtyText(line)}
                    </Text>
                    <Text style={styles.quoteLineUnitPrice}>
                      {line.unitPrice != null
                        ? formatCurrency(line.unitPrice)
                        : ""}
                    </Text>
                    <Text style={styles.quoteLineAmount}>
                      {formatCurrency(line.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.quoteSubtotalRow}>
              <Text style={styles.quoteSubtotalLabel}>Subtotal</Text>
              <Text style={styles.quoteSubtotalValue}>
                {formatCurrency(lineSubtotal)}
              </Text>
            </View>
          </>
        ) : committedLines.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Additional Items</Text>
            {committedLines.map((item, i) => (
              <View
                key={i}
                style={
                  i % 2 === 1
                    ? [styles.quoteLineRow, styles.quoteLineRowAlt]
                    : styles.quoteLineRow
                }
              >
                <Text style={styles.quoteLineName}>{item.name}</Text>
                <Text style={styles.quoteLineAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {rateLines.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Unit Rates — As Found Work</Text>
            {doc?.publishedRatesIntro ? (
              <Text style={[styles.scopeText, { marginBottom: 6 }]}>
                {doc.publishedRatesIntro}
              </Text>
            ) : null}
            {rateLines.map((line, i) => (
              <View
                key={i}
                style={
                  i % 2 === 1
                    ? [styles.quoteLineRow, styles.quoteLineRowAlt]
                    : styles.quoteLineRow
                }
              >
                <Text style={styles.quoteLineName}>
                  {line.name}
                  {line.sku ? (
                    <Text style={styles.quoteLineSku}>
                      {"  "}
                      {line.sku}
                    </Text>
                  ) : null}
                </Text>
                <Text style={styles.quoteLineQty}>as found</Text>
                <Text style={styles.quoteLineUnitPrice}></Text>
                <Text style={styles.quoteLineAmount}>
                  {line.unitPrice != null
                    ? `${formatCurrency(line.unitPrice)}${line.unit ? ` / ${pricingUnitLabel(line.unit)}` : ""}`
                    : ""}
                </Text>
              </View>
            ))}
            <Text style={styles.rateCardNote}>
              Billed at the listed rate as work is found and approved (see
              Additional Work). Not included in the total below.
            </Text>
          </View>
        ) : null}

        <View style={styles.priceSection} wrap={false}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.priceValue}>
            {formatCurrency(snapshot.grandTotal)}
          </Text>
        </View>

        {investStats.length > 0 ? (
          <Text style={styles.investStats}>{investStats.join("   ·   ")}</Text>
        ) : null}

        {paymentSchedule.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleHeadCell, { flex: 1 }]}>
                Milestone
              </Text>
              <Text style={[styles.scheduleHeadCell, styles.scheduleShare]}>
                Share
              </Text>
              <Text style={[styles.scheduleHeadCell, styles.scheduleAmount]}>
                Amount
              </Text>
            </View>
            {paymentSchedule.map((m, i) => (
              <View
                key={i}
                style={
                  i % 2 === 1
                    ? [styles.scheduleRow, styles.quoteLineRowAlt]
                    : styles.scheduleRow
                }
              >
                <Text style={styles.scheduleMilestone}>{m.milestone}</Text>
                <Text style={styles.scheduleShareValue}>
                  {Math.round(m.sharePct)}%
                </Text>
                <Text style={styles.scheduleAmountValue}>
                  {formatCurrency(m.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {doc?.scheduleBody ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <Text style={styles.scopeText}>{doc.scheduleBody}</Text>
          </View>
        ) : null}

        {snapshot.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{snapshot.notes}</Text>
          </View>
        )}

        {whatToExpect.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>What to Expect</Text>
            <View style={styles.stepRow}>
              {whatToExpect.map((step, i) => (
                <View key={i} style={styles.stepCard}>
                  <Text style={styles.stepEyebrow}>Step {i + 1}</Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {testimonials.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>What Other Communities Say</Text>
            <View style={styles.testimonialGrid}>
              {testimonials.map((t, i) => (
                <View key={i} style={styles.testimonialCell}>
                  <View style={styles.testimonialBox}>
                    <Text style={styles.testimonialQuote}>
                      {"“"}
                      {stripQuotes(t.quote)}
                      {"”"}
                    </Text>
                    <Text style={styles.testimonialAttribution}>
                      {t.attribution.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {terms.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Terms of This Proposal</Text>
            {terms.map((term, i) => (
              <View key={i} style={styles.termRow} wrap={false}>
                <Text style={styles.termBullet}>•</Text>
                <TermLine text={term} />
              </View>
            ))}
          </View>
        ) : null}

        {heldThrough ? (
          <View style={styles.holdCallout} wrap={false}>
            <Text style={styles.holdCalloutText}>
              This price is held through {heldThrough}.
            </Text>
          </View>
        ) : null}

        {doc?.acceptanceCta ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Acceptance</Text>
            <Text style={styles.acceptanceCta}>{doc.acceptanceCta}</Text>
            <View style={styles.sigRow}>
              <View style={styles.sigCellWide}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>
                  Signature — {snapshot.clientName}
                </Text>
              </View>
              <View style={styles.sigCell}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Date</Text>
              </View>
            </View>
            <View style={styles.sigRow}>
              <View style={styles.sigCellWide}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Printed name & title</Text>
              </View>
              <View style={styles.sigCell} />
            </View>
          </View>
        ) : null}
    </>
  );

  // Why-us gets its own page after the cover (Jordan's proposal structure);
  // without the document layer everything stays on one flowing page, as before.
  return (
    <Document>
      {whyUsContent ? (
        <>
          <Page size="LETTER" style={styles.page}>
            {coverContent}
            {footerEl}
          </Page>
          <Page size="LETTER" style={styles.page}>
            {whyUsContent}
            {footerEl}
          </Page>
          <Page size="LETTER" style={styles.page}>
            {mainContent}
            {footerEl}
          </Page>
        </>
      ) : (
        <Page size="LETTER" style={styles.page}>
          {coverContent}
          {mainContent}
          {footerEl}
        </Page>
      )}
    </Document>
  );
}
