import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMercerMcpServer } from "@/lib/mcp/server";
import { withUserContext, type UserContext } from "@/lib/user-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 1 MCP endpoint (see `docs/build-plans/mcp.plan.md`).
 *
 * Auth is intentionally minimal: a single bearer token from `MCP_DEV_TOKEN`
 * resolves to `MCP_DEV_USER_ID`. This is enough to wire Claude.ai / ChatGPT
 * connectors against a real account before investing in the api_tokens table
 * + settings UI in Phase 2.
 *
 * Stateless transport (no `sessionIdGenerator`): each request runs through a
 * fresh `WebStandardStreamableHTTPServerTransport` connected to a fresh
 * `McpServer`. Stateless is cheap here because the tools are stateless and
 * we don't need server-initiated notifications. The user principal is
 * threaded into the store layer via `withUserContext` AsyncLocalStorage.
 */

function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Bearer realm="mercer-mcp"',
    },
  });
}

function resolvePrincipal(req: Request): UserContext | null {
  const expectedToken = process.env.MCP_DEV_TOKEN?.trim();
  const userId = process.env.MCP_DEV_USER_ID?.trim();
  if (!expectedToken || !userId) return null;

  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!match) return null;
  if (match[1] !== expectedToken) return null;

  const email = process.env.MCP_DEV_USER_EMAIL?.trim() || null;
  return {
    userId,
    tenantId: userId,
    email,
    source: "mcp_token",
  };
}

async function handle(req: Request): Promise<Response> {
  if (!process.env.MCP_DEV_TOKEN || !process.env.MCP_DEV_USER_ID) {
    return new Response(
      JSON.stringify({
        error:
          "MCP endpoint not configured. Set MCP_DEV_TOKEN and MCP_DEV_USER_ID.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const principal = resolvePrincipal(req);
  if (!principal) {
    return unauthorized("Invalid or missing bearer token.");
  }

  return withUserContext(principal, async () => {
    const server = buildMercerMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(req);
    } finally {
      await transport.close();
      await server.close();
    }
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}
