import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const CompanyProfileExtractionSchema = z.object({
  companyName: z.string().nullable(),
  tagline: z.string().nullable(),
  street: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  logoUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
});

export type CompanyProfileExtraction = z.infer<
  typeof CompanyProfileExtractionSchema
>;

const SYSTEM_PROMPT = `You extract company profile data from a contractor's website HTML.

The user is a small commercial painting / exterior renovation business. Their site is usually a single-page Squarespace, GoDaddy, or Wix template. Pull the following from the head meta tags, body text, and any visible CSS:

- companyName: the legal or doing-business-as name. Prefer the name in the logo, the page title, or a prominent header. Do not include legal suffixes like "LLC" unless they appear on the site.
- tagline: a short marketing tagline if one is prominent (one line, under 80 chars).
- street, city, state, zip: U.S. mailing address split into parts. Look in the footer, contact page section, or schema.org markup.
- phone: primary contact phone, formatted as "(XXX) XXX-XXXX".
- email: primary contact email.
- logoUrl: absolute or relative URL of the company logo image. Look for an <img> in the header, or a link rel="icon" / og:image fallback.
- primaryColor: a 6-digit hex color (with leading #) for the brand accent. Pull from CSS variables like --primary, --accent, or the most prominent non-neutral color in the design. Skip pure black, white, and grays.

Return null for any field you cannot find with reasonable confidence. Do not guess or invent values.`;

const FETCH_TIMEOUT_MS = 5000;
const MODEL_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 500_000;
const MAX_HTML_CHARS_TO_MODEL = 60_000;

export class EnrichmentError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "EnrichmentError";
  }
}

export async function enrichCompanyFromWebsite(
  websiteUrl: string,
  opts: { signal?: AbortSignal } = {}
): Promise<CompanyProfileExtraction> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new EnrichmentError("ANTHROPIC_API_KEY is not configured");
  }

  const html = await fetchHomepageHtml(websiteUrl, opts.signal);
  const condensed = stripHtmlNoise(html).slice(0, MAX_HTML_CHARS_TO_MODEL);

  const client = new Anthropic();

  const response = await client.messages.parse(
    {
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: zodOutputFormat(CompanyProfileExtractionSchema),
      },
      messages: [
        {
          role: "user",
          content: `Source URL: ${websiteUrl}\n\nHomepage HTML:\n\`\`\`html\n${condensed}\n\`\`\``,
        },
      ],
    },
    { signal: opts.signal, timeout: MODEL_TIMEOUT_MS }
  );

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new EnrichmentError(
      `Model did not return a structured response (stop_reason=${response.stop_reason})`
    );
  }

  return resolveLogoUrl(parsed, websiteUrl);
}

async function fetchHomepageHtml(
  websiteUrl: string,
  outerSignal?: AbortSignal
): Promise<string> {
  const fetchController = new AbortController();
  const fetchTimer = setTimeout(
    () => fetchController.abort(new Error("homepage fetch timeout")),
    FETCH_TIMEOUT_MS
  );
  const onOuterAbort = () => fetchController.abort(outerSignal?.reason);
  outerSignal?.addEventListener("abort", onOuterAbort);

  try {
    const response = await fetch(websiteUrl, {
      signal: fetchController.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mercer-Onboarding/0.1 (+https://usemercer.com; contact: hi@usemercer.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      throw new EnrichmentError(
        `Homepage returned HTTP ${response.status}`
      );
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new EnrichmentError("Homepage response had no body");
    }
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;
    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    await reader.cancel().catch(() => {});
    return html;
  } finally {
    clearTimeout(fetchTimer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}

function stripHtmlNoise(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function resolveLogoUrl(
  extraction: CompanyProfileExtraction,
  websiteUrl: string
): CompanyProfileExtraction {
  if (!extraction.logoUrl) return extraction;
  try {
    const absolute = new URL(extraction.logoUrl, websiteUrl).toString();
    return { ...extraction, logoUrl: absolute };
  } catch {
    return { ...extraction, logoUrl: null };
  }
}
