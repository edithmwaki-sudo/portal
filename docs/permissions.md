# Permissions Module

CRUD for permissions. A permission represents an allowed action on a resource,
e.g. `student.create`, `student.deactivate`.

## Data model

Table `permissions`:

| Column        | Type      | Notes                          |
| ------------- | --------- | ------------------------------ |
| `id`          | serial    | internal PK, never exposed     |
| `name`        | varchar(100) | unique, must match `resource.action` |
| `description` | text      | nullable                       |
| `created_at`  | timestamp | default now                    |
| `updated_at`  | timestamp | auto-updated on change         |

Unique constraint: `permissions_name_key` on `name`.

## Endpoints

All routes are keyed by the business-unique `name`, never by `id`.

| Method | Route                 | Success  | Notes                                      |
| ------ | --------------------- | -------- | ------------------------------------------ |
| GET    | `/permissions`        | 200      | paginated list (`?page=`, `?limit=`)       |
| GET    | `/permissions/:name`  | 200      | single; 404 if not found                   |
| POST   | `/permissions`        | 201      | create; 409 on duplicate `name`            |
| PATCH  | `/permissions/:name`  | 200      | partial update                             |
| DELETE | `/permissions/:name`  | 204      | hard delete; 404 if not found              |

## Request / response shapes

### Create

```
POST /permissions
{ "name": "student.create", "description": "Create students" }
```

| Field         | Rule                                        |
| ------------- | ------------------------------------------- |
| `name`        | required, max 100, must match `^[a-z]+\.[a-z]+$` (`resource.action`) |
| `description` | optional, max 255                            |

### Response (all endpoints)

```json
{
  "name": "student.create",
  "description": "Create students",
  "createdAt": "2026-08-02T13:07:58.162Z",
  "updatedAt": "2026-08-02T13:07:58.162Z"
}
```

`id` is intentionally absent — see [Conventions](conventions.md).

### List response

```json
{
  "items": [ /* PermissionResponseDto[] */ ],
  "total": 1,
  "page": 1,
  "limit": 25
}
```

## Validation

- Invalid `name` format (not `resource.action`) → 400 with clear message.
- Unexpected/extra body fields → 400 (forbidden non-whitelisted).
- Duplicate `name` → 409 with readable message (pre-check, not a raw DB error).

## Files

- `src/permissions/permissions.module.ts`
- `src/permissions/permissions.controller.ts`
- `src/permissions/permissions.service.ts`
- `src/permissions/dto/create-permission.dto.ts`
- `src/permissions/dto/update-permission.dto.ts`
- `src/permissions/dto/permission-response.dto.ts`
