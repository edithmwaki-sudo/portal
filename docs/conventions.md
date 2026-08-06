# Conventions

Cross-cutting rules that apply to every module. New features must follow these
unless explicitly overridden in their module doc.

> **Stack note:** the backend is **NestJS + Prisma + PostgreSQL**, not Drizzle.
> Schema lives in `prisma/schema.prisma` (`prisma db push` / `prisma migrate dev`),
> and the generated client is provided via `PrismaService`.

## ID exposure rule

Every table has an auto-increment internal `id` used for FK joins and
service-layer queries only.

- Routes are keyed by `:id` (via `ParseIntPipe`) — the current convention for
  numeric-PK tables (`/users/:id`, `/students/:id`, `/staff/:id`, `/roles/:id`).
- Enforcement is structural: every controller maps rows through a response DTO
  via `plainToInstance(ResponseDto, row, { excludeExtraneousValues: true })`,
  backed by the global `ClassSerializerInterceptor`. Sensitive fields (e.g.
  `password`) are never exposed via response DTOs.

## Global setup (`src/main.ts`)

- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`:
  strips unknown fields, rejects non-whitelisted fields with 400, transforms payloads.
- `ClassSerializerInterceptor(app.get(Reflector))`: second guard against leaking
  internal fields.
- No global URL prefix — routes are rooted (`/users`, `/students`, `/staff`,
  `/roles`, `/permissions`, `/auth`).
- Swagger set up with a bearer JWT security scheme (tagged controllers expose docs).

## Auth & permissions

- `JwtAuthGuard` is global (validates the bearer access token).
- `@RequirePermission(Permissions.some)` on handlers enforces RBAC; the
  permission catalog lives in `src/permissions/permissions.ts` and is synced to
  the DB on boot (`sync-permissions.ts`). No drift between code and DB.
- Route handlers read the acting user via `@CurrentUser()` (an
  `AuthenticatedUser` carrying `userId` + `permissions: string[]`).
- The JWT payload embeds the user's permission names; `GET /auth/me` also returns
  them so the frontend can build permission-aware navigation.

## Pagination

List endpoints accept `?page=` and `?limit=` (defaults: `page=1`, `limit=25`,
max `limit=100`). Response shape:

```json
{ "items": [ /* response DTOs */ ], "total": 0, "page": 1, "limit": 25 }
```

## DTO / validation rules

- Dedicated DTOs with `class-validator` decorators — never reuse a DB row type
  as the request/response shape, never validate ad hoc in services.
- Update DTOs use `PartialType(CreateDto)` — all fields optional but validated
  by the same rules when present.
- Unique collisions return 409 with a readable message (pre-check in the service,
  never a raw Postgres error).
- Create flows that build multiple records (e.g. user + profile) run inside
  `prisma.$transaction` so a partial insert can't persist.

## Error status codes

| Code | Meaning |
| ---- | ----------------------------------------- |
| 200  | OK (GET list/single, PATCH)               |
| 201  | Created (POST)                            |
| 204  | No content (DELETE)                       |
| 400  | Validation failure (bad format / extra fields) |
| 401  | Unauthenticated                           |
| 403  | Forbidden (missing permission / inactive account) |
| 404  | Resource not found                       |
| 409  | Conflict (duplicate username/email/unique field) |

## IDs on the wire

Frontend DTOs accept IDs as strings in **create forms** (id fields are
optional plain text/number inputs) and the form converts them to `number` in
`onSubmit` before calling the API. This keeps react-hook-form + zod resolvers
(on string inputs) from fighting the API's numeric types. See
`schemas/student-schema.ts` and `schemas/staff-schema.ts`.

## Database & migrations

- PostgreSQL. Connection via `DATABASE_URL` in `.env` (see `backend/.env`).
- Schema lives in `prisma/schema.prisma`.
- Commands (run in `backend/`):
  - `npx prisma db push` — sync the DB to the schema (no migration files)
  - `npx prisma migrate dev` — create and apply migrations (note: currently fails
    (P3006) on a BOM in the `0_init` migration shadow DB — prefer `db push` for now)
  - `npx prisma generate` — regenerate the client after schema changes
  - `npx prisma studio` — browse the DB
- Soft delete: tables carry `deletedAt`; list/single queries filter `deletedAt: null`.
- Audit: mutations write via `AuditService.log(...)`.

## Testing & quality

- Service tests use mocked `PrismaService` / `AuditService` (see
  `students.service.spec.ts`, `staff.service.spec.ts`). Jest, `npm test`.
- Lint: `npm run lint` (eslint + prettier). Keep specs lint-clean (avoid
  `no-unsafe-*` where possible).

## Out of scope (future phases)

- Courses module (Course entity + `course.view/create/update/delete`), includes
  replacing free-text course/department selects in the student/staff forms.
- Departments module; supervisor/department FK selectors.
- Dashboard metrics/statistics (placeholder shell and permission-gated cards today).