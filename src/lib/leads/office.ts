import type { Lead } from "@/lib/store";

/**
 * Office / management-company helpers shared across the leads list and
 * lead detail surfaces. Also hosts the paint-decision role ranking and the
 * per-management-company portfolio aggregation (offices / properties / leads
 * present in the user's CSV imports).
 */

const CITY_KEYS = ["city", "City", "CITY"];

/**
 * Pull a lead's office city from the raw CSV row. Trade-show CSVs carry
 * Address/City/State but we never promoted them to typed columns. Falls
 * through a regex scan so "Billing City" / "Mailing City" still resolve.
 */
export function leadCity(lead: Lead): string {
  const raw = lead.rawRow;
  if (!raw) return "";
  for (const k of CITY_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(raw)) {
    if (/city/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const ROLE_KEYS = [
  "Role with Company",
  "role with company",
  "Role",
  "role",
  "Title",
  "title",
];

export function leadRole(lead: Lead): string {
  const raw = lead.rawRow;
  if (!raw) return "";
  for (const k of ROLE_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(raw)) {
    if (/\brole\b|\btitle\b/i.test(k) && typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "";
}

/**
 * Paint-decision authority ranking for attendee roles. Lower number = more
 * likely to own the exterior-paint decision for a multifamily community.
 * Rough hierarchy: owners / regional leadership > site manager + maintenance
 * supervisor > assistant / leasing manager > corporate generalists > leasing
 * agents + technicians > support roles.
 */
const ROLE_PRIORITY: Array<{ match: RegExp; rank: number }> = [
  { match: /\bowner\b/i, rank: 1 },
  { match: /\bregional maintenance\b/i, rank: 2 },
  { match: /\bregional\b/i, rank: 2 },
  { match: /\bcommunity manager\b/i, rank: 3 },
  { match: /\bmaintenance supervisor\b/i, rank: 4 },
  { match: /\bassistant (community )?manager\b/i, rank: 5 },
  { match: /\bleasing manager\b/i, rank: 5 },
  { match: /\btraining director\b/i, rank: 6 },
  { match: /\bcorporate\b/i, rank: 6 },
  { match: /\bleasing\b/i, rank: 7 },
  { match: /\bmaintenance (technician|tech)\b/i, rank: 7 },
  { match: /\b(marketing|accounting)\b/i, rank: 8 },
  { match: /\b(groundskeeper|porter|housekeep(er|ing))\b/i, rank: 9 },
];

export function rolePriority(role: string): number {
  if (!role) return 99;
  for (const entry of ROLE_PRIORITY) {
    if (entry.match.test(role)) return entry.rank;
  }
  return 10;
}

export function officeKeyFor(lead: Lead): string {
  const company = (lead.company ?? "").trim();
  const city = leadCity(lead);
  if (!company && !city) return "";
  return `${company}~${city}`;
}

export function officeLabel(company: string, city: string): string {
  if (company && city) return `${company}, ${city}`;
  if (company) return company;
  if (city) return city;
  return "Ungrouped";
}

export type CompanyPortfolio = {
  company: string;
  offices: number;
  properties: number;
  leads: number;
};

/**
 * Roll a set of leads up by management company into a portfolio signal:
 * distinct office cities, distinct property names, total attendee count.
 * One management company with attendees across many cities is a bigger
 * relationship than one with many attendees in the same office.
 */
export function computeCompanyPortfolios(
  leads: Lead[]
): Map<string, CompanyPortfolio> {
  const byCompany = new Map<
    string,
    { offices: Set<string>; properties: Set<string>; leads: number }
  >();
  for (const lead of leads) {
    const company = (lead.company ?? "").trim();
    if (!company) continue;
    const key = company.toLowerCase();
    let entry = byCompany.get(key);
    if (!entry) {
      entry = { offices: new Set(), properties: new Set(), leads: 0 };
      byCompany.set(key, entry);
    }
    entry.leads += 1;
    const city = leadCity(lead);
    if (city) entry.offices.add(city.toLowerCase());
    const prop = (lead.propertyName ?? "").trim();
    if (prop) entry.properties.add(prop.toLowerCase());
  }
  const out = new Map<string, CompanyPortfolio>();
  for (const [key, entry] of byCompany) {
    out.set(key, {
      // preserve display casing from the first lead we saw for this company
      company:
        leads.find((l) => (l.company ?? "").trim().toLowerCase() === key)
          ?.company?.trim() ?? key,
      offices: entry.offices.size,
      properties: entry.properties.size,
      leads: entry.leads,
    });
  }
  return out;
}

export function portfolioFor(
  portfolios: Map<string, CompanyPortfolio>,
  company: string | null | undefined
): CompanyPortfolio | null {
  if (!company) return null;
  return portfolios.get(company.trim().toLowerCase()) ?? null;
}
