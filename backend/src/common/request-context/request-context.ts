import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context. Because `AuditService` is a singleton (not
 * request-scoped), it can't inject `@Req()` directly — this AsyncLocalStorage
 * store is the bridge: the middleware below fills it with the (redacted)
 * request body + id, and `AuditService.log()` reads it back.
 */
export interface RequestContext {
  requestId?: string | null;
  /** Redacted request body for mutating requests (undefined otherwise). */
  body?: unknown;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
