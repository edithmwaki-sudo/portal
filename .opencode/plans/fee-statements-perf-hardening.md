# Plan: Verify & harden fee statements for 1000 concurrent users

## Context / analysis (already completed, read-only)

Confirmed via code review + `EXPLAIN ANALYZE` against the live DB:

- **No bugs remain** in the fee-statements feature (the two earlier bugs — list 500 `ORDER BY`
  alias-in-expression, detail 400 `page/limit` — are fixed and verified).
- **No N+1.** `list` = 2 SQL (1 aggregate + 1 count). `detail` = bounded ~8–13 queries
  (constant per request, zero per-row DB access; all grouping in-memory).
- JWT auth + permission guard are fully stateless (permissions embedded in the access token,
  **no DB hit per request**).
- Reversal math verified against `invoices.service.ts` (INVOICE_REVERSAL writes `credit`) and
  `payments.service.ts` (PAYMENT_REVERSAL writes `debit`) — matches the statement math.
- `resolveUnallocated` correctly excludes `REVERSED` payments.
- Warm list execution: **0.4–0.7 ms** (EXPLAIN verified); the earlier 823 ms was cold-catalog planning.

### Scalability findings (blocking the "1000 concurrent unique users" goal)

1. **Throttler** `app.module.ts:92-93` = 100 req/min/IP. For 1000 concurrent *unique users* this
   is only a problem when many share one IP (school NAT). Make limits env-configurable with a high
   default for reads; keep strict auth limits.
2. **`resolveScope`** runs 3–4 queries/request incl. a redundant year re-fetch (`:76` active, `:93`
   re-fetch). Scope data is near-constant → cache it (TTL).
3. **`resolveUnallocated`** aggregates the *entire* `invoice_payment_allocations` table (derived
   table) every detail call → O(N). Correlated subquery + existing `[paymentId]` index = O(per-student).
4. **List query** aggregates all students then sorts before `LIMIT 100` (no index can help the
   computed ORDER BY). Fine today; wrap in a subquery so `ORDER BY` uses output aliases — cleaner,
   smaller query text, lower planning cost.
5. **Prisma `include`** emits one query per relation (~6 extra per detail). Use
   `relationLoadStrategy: 'join'` (Prisma 6.19, supported) on the detail queries.
6. **PDF** is synchronous pdfkit CPU on the event loop. Offload to a small worker-thread pool.
7. **Pool** — DATABASE_URL has no `connection_limit`; at ~6–13 queries/request × 1000 concurrent
   you need a bigger pool. Add `connection_limit` (and note pgBouncer for prod).
8. **Search** uses `ILIKE '%..%'` → seq scan; add `pg_trgm` GIN indexes (low priority).
9. Minor: `admissionYear` uses `getFullYear()` (local TZ) vs UTC getters in PDF → use
   `getUTCFullYear()`.

## Implementation steps

### 1. `backend/src/fees/fee-statements.service.ts`
- Import `type AcademicSession` from `@prisma/client`.
- Add `private static readonly SCOPE_CACHE_TTL_MS = 60_000;` and a
  `scopeCache: { year: {id,name,isActive}; sessions: AcademicSession[]; at: number } | null`.
- Add helper `getActiveScopeData(explicitYearId?: number)`:
  - explicit year → `findUnique` + `findMany` sessions (no cache).
  - else cache (fresh → reuse); else `findFirst({isActive:true}, orderBy id desc)`
    fallback `findFirst(orderBy id desc)`; throw if none; load sessions; populate cache.
- `resolveScope` calls the helper, drops the redundant `findUnique` re-fetch.
- `resolveUnallocated`: replace the derived-table `LEFT JOIN` with a correlated subquery
  `COALESCE((SELECT SUM(a."amount") FROM invoice_payment_allocations a WHERE a."payment_id" = p.id), 0)`.
- `list`: wrap the aggregate in a derived table; `ORDER BY (t.invoiced - t.paid) DESC, t.name ASC`
  with `LIMIT/OFFSET` outside.
- `statementDetail`: `admissionYear` → `getUTCFullYear()`.
- Add `relationLoadStrategy: 'join'` to the `studentProfile.findFirst` and
  `studentLedgerEntry.findMany` calls.

### 2. PDF worker pool
- New `backend/src/fees/pdf/statement-pdf.worker.ts`: a `parentPort` worker that receives the
  `StatementPdfData` payload, calls the existing `renderStatementPdf`, and posts the Buffer back.
- New `backend/src/fees/pdf/statement-pdf.pool.ts`: module-level pool of N workers (e.g. 2–4),
  round-robin `postMessage`, queueing when all busy; `terminate()` on module exit.
- `generatePdf` uses the pool instead of calling `renderStatementPdf` inline.
- jest: worker is exercised via the existing `generatePdf` test (keep it green; if worker makes
  the unit test awkward, keep a direct path for tests or mock the pool).

### 3. Throttler (`backend/src/app.module.ts`)
- Read `THROTTLE_LIMIT` env (default e.g. `6000`/min) and `THROTTLE_TTL_MS` (default `60000`)
  for the global default so a shared-IP deployment isn't capped.
- Keep the per-route auth overrides (login 10/min etc.) unchanged.

### 4. Prisma pool (`backend/.env`)
- Append `?connection_limit=30` to `DATABASE_URL` (dev); document pgBouncer for prod.

### 5. Migration (low priority)
- New Prisma migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + GIN indexes on
  `users.name`, `student_profiles.admission_number` (`gin_trgm_ops`).

### 6. Rebuild + verify
- `npx tsc -p tsconfig.build.json` clean, `npx nest build` OK, restart backend (log PID).
- `npx jest fee-statements` → 10/10 still green (spec mocks are query-agnostic; verify the
  `$queryRaw` string assertions still match after the subquery wrap).

## Load test (prove 1000 concurrent)

- Script `C:\Users\ADMIN\AppData\Local\Temp\opencode\load_test.js` (same pattern as the seed
  script — write file, `node` from `backend`):
  - Login once → access token.
  - Warm-up: 20 requests.
  - Fire **1000 concurrent** mixed requests: 60% `GET /fees/statements?page=1&limit=100`,
    35% `GET /fees/statements/<id>?scope=session_to_date` (rotating student ids 26–39),
    5% `GET /fees/statements/<id>/pdf`.
  - Measure: total completed, rps, p50/p95/p99 latency, 4xx/5xx/network-error counts, pool queueing.
  - Run again at 2000 and 5000 concurrent to find the ceiling.
- Report numbers; if p95 > 500 ms or errors appear, tune pool/workers and re-test.

## Out of scope / notes
- Caching the list aggregate (materialized balances) is a bigger design change; only if the
  load test shows the aggregate can't keep up at expected data volume.
- Frontend unaffected; run the existing headless `browser_check.js` + `browser_check_fees.js` as a
  regression after the backend restart.
