# Portal API Documentation

Living documentation for the Portal backend. Per-module docs are kept in sync with
the implementation on every task.

## Modules

- [Roles](roles.md) — role CRUD + permission attach/detach
- [Permissions](permissions.md) — permission CRUD
- [Users](users.md) — staff/student accounts: onboarding (`/staff`), admission (`/students`), plus account admin (`/users`)

## Cross-cutting

- [Conventions](conventions.md) — global rules that apply to every module (ID exposure, validation, pagination, DB/migrations)

## How docs stay current

Every implementation task includes a documentation update in the same pass:

- New module → create `docs/<module>.md` and link it here.
- Changes to an existing module/endpoint/DTO → update that module's doc.
- Cross-cutting changes (new global pipe, new rule, new table) → update `docs/conventions.md`.
