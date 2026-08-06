# User Management Module

User management follows the legacy operational flow: users are created **through
their domain workflows**, not a generic registry. Staff are created via the
**Staff onboarding** form; students via the **Student admission** form. Each
workflow has its own table, controller, and permission set, plus a general
`/users` controller for account-level administration (role, password reset).

## Data model

Prisma `User` (maps to `users`). The two user types are distinguished by
**profile presence**, not an enum:

- **Staff** users have a linked `StaffProfile` (1:1, `userId` unique).
- **Student** users have a linked `StudentProfile` (1:1, `userId` unique,
  `admissionNumber` unique).

This matches the 1:1 user↔person rule and the legacy `staffs`/`students` tables.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Int autoincrement | internal PK |
| `username` | String @unique | login id (legacy `login_id` equivalent) |
| `email` | String @unique | required |
| `phone` | String? | |
| `password` | String | bcrypt hash |
| `name` | String | full name |
| `gender` | Gender? enum MALE/FEMALE/OTHER | |
| `status` | UserStatus enum ACTIVE/INACTIVE/SUSPENDED/LOCKED | |
| `mustResetPassword` | Boolean | |
| `twoFactorEnabled` | Boolean | |
| `roleId` | Int? FK → Role.id | single role per user (no pivot) |
| `staffProfile` | StaffProfile? | presence = staff type |
| `studentProfile` | StudentProfile? | presence = student type |
| `deletedAt` | DateTime? | soft delete |
| `createdBy`/`updatedBy` | Int? | audit actors |

### `StudentProfile` (admission record)

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | Int @unique FK → User | 1:1 |
| `admissionNumber` | String? @unique | auto-generated `STU/xxx/YY` if omitted |
| `courseId` | Int? | course module not built yet |
| `level` | Int? | year of study |
| `admDate` | DateTime? | admission date |
| `status` | enum ACTIVE/INACTIVE/GRADUATED | |

### `StaffProfile` (employment record)

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | Int @unique FK → User | 1:1 |
| `employeeNumber` | String? @unique | auto-generated `EMP/xxx/YY` if omitted |
| `nationalId`, `kraPin`, `shifNumber`, `nssfNumber` | String? | statutory IDs |
| `departmentId` | Int? | departments module not built yet |
| `supervisorId` | Int? | reports-to staff id |
| `jobTitle` | String? | |
| `employmentType` | enum PERMANENT/CONTRACT/PART_TIME/CASUAL | |
| `dateJoined` / `contractEndDate` | DateTime? | |
| `highestQualification`, `specialization` | String? | |

## Endpoints

### Student admission — `StudentsController` (`/students`)

Guarded by `student.*` permissions.

| Method | Route | Success | Guard | Notes |
| --- | --- | --- | --- | --- |
| GET | `/students` | 200 | `student.view` | paginated; `?page&limit&search` |
| GET | `/students/:id` | 200 | `student.view` | single admission record |
| POST | `/students` | 201 | `student.create` | creates User + StudentProfile in a transaction; auto admission number; 409 on dup |
| PATCH | `/students/:id` | 200 | `student.update` | update student + profile |
| DELETE | `/students/:id` | 204 | `student.delete` | soft-deletes profile + deactivates user |

### Staff onboarding — `StaffController` (`/staff`)

Guarded by `staff.*` permissions.

| Method | Route | Success | Guard | Notes |
| --- | --- | --- | --- | --- |
| GET | `/staff` | 200 | `staff.view` | paginated; `?page&limit&search` |
| GET | `/staff/:id` | 200 | `staff.view` | single employment record |
| POST | `/staff` | 201 | `staff.create` | creates User + StaffProfile in a transaction; auto employee number; 409 on dup |
| PATCH | `/staff/:id` | 200 | `staff.update` | update staff + profile |
| DELETE | `/staff/:id` | 204 | `staff.delete` | soft-deletes profile + deactivates user |

### General account admin — `UsersController` (`/users`)

For account-level operations (role assignment, password reset) across both types.

| Method | Route | Success | Guard | Notes |
| --- | --- | --- | --- | --- |
| GET | `/users` | 200 | `staff.view` | paginated; `?page&limit&search&type=staff\|student` |
| GET | `/users/:id` | 200 | `staff.view` | single user incl. role |
| POST | `/users` | 201 | `staff.create` | `type` optional; creates profile stub |
| PATCH | `/users/:id` | 200 | `staff.update` | account fields only |
| DELETE | `/users/:id` | 204 | `staff.delete` | soft delete |
| POST | `/users/:id/reset-password` | 200 | `staff.update` | new hash + `mustResetPassword=true` + revoke sessions |

### `type` filtering

`GET /users?type=staff` → `where.staffProfile = { isNot: null }`.
`GET /users?type=student` → `where.studentProfile = { isNot: null }`.

## Request / response shapes

### Admit student `POST /students`
```json
{ "username": "STU/042/26", "email": "s@b.com", "password": "secret123",
  "name": "Jane Doe", "gender": "FEMALE", "phone": "07..",
  "admissionNumber": "STU/042/26", "courseId": 1, "level": 1, "admDate": "2026-01-10",
  "status": "ACTIVE" }
```

### Onboard staff `POST /staff`
```json
{ "username": "EMP/042/25", "email": "a@b.com", "password": "secret123",
  "name": "John Doe", "jobTitle": "Lecturer", "employmentType": "PERMANENT",
  "nationalId": "12345678", "departmentId": 1, "dateJoined": "2025-01-10" }
```

### Response (`StudentResponseDto` / `StaffResponseDto`)
```json
{ "id": 1, "admissionNumber": "STU/042/26", "courseId": 1, "level": 1,
  "admDate": "...", "status": "ACTIVE", "createdAt": "...",
  "user": { "id": 10, "username": "STU/042/26", "email": "s@b.com",
            "name": "Jane Doe", "gender": "FEMALE", "status": "ACTIVE" } }
```

### Reset password `POST /users/:id/reset-password`
```
{ "newPassword": "tempPass123" }
```
Sets bcrypt hash, `mustResetPassword=true`, revokes all non-revoked sessions, writes audit.

## Validation

- `username` 3–100, `email` valid 3–255, create `password` 8–255, reset-password 8–255.
- Optional profile fields enum-validated (`gender`, `employmentType`, student `status`).
- Duplicate username/email/admissionNumber/employeeNumber → 409 (pre-check in service).
- Unknown `:id` → 404 (soft-deleted records count as not found).
- `forbidNonWhitelisted` → 400 on unknown fields.

## Frontend

Each Users page shows the record **list and the create form on the same screen**
(legacy multi-section forms), matching the legacy flow.

- `lib/api/students.ts` — `StudentResponse`, `getStudents`, `createStudent`.
- `lib/api/staff.ts` — `StaffResponse`, `getStaff`, `createStaff`.
- `schemas/student-schema.ts` — `createStudentSchema` (multi-section admission form).
- `schemas/staff-schema.ts` — `createStaffSchema` (multi-section onboarding form).
- `components/dashboard/users/`:
  - `student-admission-client.tsx` — Students list + admission form.
  - `staff-onboarding-client.tsx` — Staff list + onboarding form.
  - `student-form.tsx` / `staff-form.tsx` — multi-section legacy-style forms.
  - `form-section.tsx` — titled form grouping.
- Pages:
  - `app/(dashboard)/users/staff/page.tsx` → `StaffOnboardingClient`
  - `app/(dashboard)/users/students/page.tsx` → `StudentAdmissionClient`

### Permission-based navigation

- `hooks/use-current-user.ts` — `useCurrentUser()` / `usePermissions()` load the
  signed-in user via `/auth/me` (which returns a `permissions: string[]`).
  `hasAnyPermission(perms, required)` gates items.
- `config/nav-items.ts` — each `NavItem` may declare `permissions: string[]`;
  the sidebar shows the item only when the user holds at least one. Groups
  collapse when no child is visible.
- `components/dashboard/app-sidebar.tsx` — filters `navItems` by permissions.
- `app/(dashboard)/page.tsx` — dashboard shows permission-gated module cards.

## Files (backend)

- `src/students/` — `students.service.ts`, `students.controller.ts`,
  `students.module.ts`, `dto/{create,update,response}-student.dto.ts`,
  `students.service.spec.ts`.
- `src/staff/` — `staff.service.ts`, `staff.controller.ts`, `staff.module.ts`,
  `dto/{create,update,response}-staff.dto.ts`, `staff.service.spec.ts`.
- `prisma/schema.prisma` — `StudentProfile` model (admission record).
- `src/users/users.service.ts` — `type` filter (`staffProfile`/`studentProfile`),
  profile-stub creation.
- `src/auth/auth.service.ts` — `me()` now returns `permissions: string[]`.
