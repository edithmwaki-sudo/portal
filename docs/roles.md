# Roles Module

CRUD for roles plus attach/detach of permissions to a role.

## Data model

Table `roles`:

| Column        | Type      | Notes                          |
| ------------- | --------- | ------------------------------ |
| `id`          | serial    | internal PK, never exposed     |
| `name`        | varchar(50) | unique, must be lowercase snake_case |
| `display_name`| varchar(100) | human-readable label        |
| `created_at`  | timestamp | default now                    |
| `updated_at`  | timestamp | auto-updated on change         |

Unique constraint: `roles_name_key` on `name`.

Many-to-many pivot table `permission_role`:

| Column          | Type    | Notes                          |
| --------------- | ------- | ------------------------------ |
| `role_id`       | integer | FK → `roles.id`, cascade delete |
| `permission_id` | integer | FK → `permissions.id`, cascade delete |

Composite primary key `(role_id, permission_id)` prevents duplicate rows at the
DB level.

## Endpoints

All routes are keyed by the business-unique `name` / `permissionName`, never by `id`.

| Method | Route                                        | Success | Notes                                             |
| ------ | -------------------------------------------- | ------- | ------------------------------------------------- |
| GET    | `/roles`                                     | 200     | paginated list, each role includes `permissions`  |
| GET    | `/roles/:name`                               | 200     | single incl. `permissions`; 404 if not found      |
| POST   | `/roles`                                     | 201     | create; 409 on duplicate `name`                   |
| PATCH  | `/roles/:name`                               | 200     | partial update                                   |
| DELETE | `/roles/:name`                               | 204     | hard delete; 404 if not found                     |
| POST   | `/roles/:name/permissions/:permissionName`   | 201     | attach; 409 if already attached; 404 if either missing |
| DELETE | `/roles/:name/permissions/:permissionName`   | 204     | detach (idempotent); 404 if role/permission missing |
| GET    | `/roles/:name/permissions`                   | 200     | list permissions on a role; 404 if role missing   |

## Request / response shapes

### Create

```
POST /roles
{ "name": "trainer", "displayName": "Trainer" }
```

| Field         | Rule                                        |
| ------------- | ------------------------------------------- |
| `name`        | required, max 50, must match `^[a-z_]+$` (lowercase snake_case) |
| `displayName` | required, max 100                           |

### Response (all endpoints)

```json
{
  "name": "trainer",
  "displayName": "Trainer",
  "permissions": [
    { "name": "student.create", "description": "Create students", "createdAt": "...", "updatedAt": "..." }
  ],
  "createdAt": "2026-08-02T13:07:58.886Z",
  "updatedAt": "2026-08-02T13:07:58.886Z"
}
```

`id` is intentionally absent (including inside nested permissions) — see
[Conventions](conventions.md).

### List response

```json
{
  "items": [ /* RoleResponseDto[] */ ],
  "total": 1,
  "page": 1,
  "limit": 25
}
```

### Attach / detach

```
POST   /roles/trainer/permissions/student.create
DELETE /roles/trainer/permissions/student.create
```

Attach returns the updated role. Detach returns 204 with no body.

## Validation / error behavior

- Invalid `name` format (not lowercase snake_case) → 400 with clear message.
- Unexpected/extra body fields → 400.
- Duplicate `name` → 409.
- Attach when already attached → 409 (not silent duplicate).
- Attach/detach/read/update/delete against a non-existent role or permission `name` → 404.

## Files

- `src/roles/roles.module.ts`
- `src/roles/roles.controller.ts`
- `src/roles/roles.service.ts`
- `src/roles/dto/create-role.dto.ts`
- `src/roles/dto/update-role.dto.ts`
- `src/roles/dto/role-response.dto.ts`
