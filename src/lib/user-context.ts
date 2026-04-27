import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request authenticated principal context.
 *
 * Set at request boundaries that aren't covered by the existing browser
 * cookie / `x-mercer-user-id` header path — today that's the MCP route,
 * tomorrow it's anywhere else we'd want to dispatch into store helpers
 * with a non-cookie principal.
 *
 * Shape carries `tenantId` from day one so leaf code that scopes by
 * tenant (none yet, but coming with workspaces — see
 * `docs/build-plans/mcp.plan.md → Multi-tenancy`) can read a stable field.
 * In v1 `tenantId === userId` because the user IS the tenant. When
 * workspaces ship the resolver changes; leaf code does not.
 */
export type UserContext = {
  userId: string;
  tenantId: string;
  email: string | null;
  source: "mcp_token";
};

const storage = new AsyncLocalStorage<UserContext>();

export function withUserContext<T>(
  ctx: UserContext,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  return storage.run(ctx, fn);
}

export function getUserContext(): UserContext | null {
  return storage.getStore() ?? null;
}
