import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getBidStatusCounts,
  getDashboardPipelineFinances,
  getLeadStatusCounts,
  getProjectStatusCounts,
  logLeadContact,
} from "@/lib/store";

/**
 * Phase 1 of the MCP build (see `docs/build-plans/mcp.plan.md`).
 *
 * Two tools:
 *  - `pipeline_summary` — read-only funnel + dollar snapshot, mirrors `/dashboard`.
 *  - `log_lead_contact`  — write that increments contact_attempts and stamps last_contacted_at.
 *
 * Each call assumes a user-context AsyncLocalStorage scope has already been
 * opened upstream (see `src/app/api/mcp/route.ts`); the underlying store
 * helpers read that context via `requireUser()`.
 */
export function buildMercerMcpServer(): McpServer {
  const server = new McpServer(
    { name: "mercer", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Mercer exposes a contractor's leads, bids, and projects. " +
        "Use `pipeline_summary` to summarize the current pipeline and " +
        "`log_lead_contact` to record that the contractor reached out to a lead.",
    },
  );

  server.registerTool(
    "pipeline_summary",
    {
      title: "Pipeline summary",
      description:
        "Snapshot of the contractor's lead, bid, and project pipeline: counts by status and dollar totals (open vs. won). Equivalent to the in-app dashboard.",
      inputSchema: {},
    },
    async () => {
      const [leadCounts, bidCounts, projectCounts, finances] = await Promise.all([
        getLeadStatusCounts(),
        getBidStatusCounts(),
        getProjectStatusCounts(),
        getDashboardPipelineFinances(),
      ]);

      const text = [
        "Pipeline summary:",
        `- Leads: new=${leadCounts.new}, quoted=${leadCounts.quoted}, won=${leadCounts.won}, lost=${leadCounts.lost} (total ${leadCounts.total}).`,
        `- Bids: draft=${bidCounts.draft}, sent=${bidCounts.sent}, won=${bidCounts.won}, lost=${bidCounts.lost} (total ${bidCounts.total}).`,
        `- Projects: not_started=${projectCounts.not_started}, in_progress=${projectCounts.in_progress}, on_hold=${projectCounts.on_hold}, punch_out=${projectCounts.punch_out}, complete=${projectCounts.complete} (total ${projectCounts.total}).`,
        `- Open pipeline: $${finances.openPipelineUsd.toLocaleString("en-US")}`,
        `- Booked (won): $${finances.wonBookedUsd.toLocaleString("en-US")}`,
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: {
          leads: leadCounts,
          bids: bidCounts,
          projects: projectCounts,
          finances,
        },
      };
    },
  );

  server.registerTool(
    "log_lead_contact",
    {
      title: "Log lead contact attempt",
      description:
        "Record that the contractor just reached out to a lead. Stamps the lead's last_contacted_at to now and increments contact_attempts by one. Use this after a phone call, email send, or text.",
      inputSchema: {
        id: z
          .string()
          .uuid()
          .describe("UUID of the lead the contractor just contacted."),
      },
    },
    async ({ id }) => {
      const updated = await logLeadContact(id);
      if (!updated) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Lead ${id} not found or not owned by the authenticated user.`,
            },
          ],
        };
      }

      const last = updated.lastContactedAt
        ? new Date(updated.lastContactedAt).toISOString()
        : "unknown";
      return {
        content: [
          {
            type: "text",
            text: `Logged contact for ${updated.name || updated.email || id}. Attempts: ${updated.contactAttempts}. Last contacted: ${last}.`,
          },
        ],
        structuredContent: {
          id: updated.id,
          name: updated.name,
          contactAttempts: updated.contactAttempts,
          lastContactedAt: updated.lastContactedAt,
        },
      };
    },
  );

  return server;
}
