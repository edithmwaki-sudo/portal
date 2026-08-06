# Legacy System Business Specification (extracted from `C:\xampp\htdocs\magoerp`)

This document is the machine-extracted business specification of the legacy system. It is the
single source of truth for **business behavior** during the modernization. Every new-stack module
must preserve this behavior. New-stack implementation decisions live in `frontend/prompt.txt`
(constitution) and `docs/conventions.md`.

> Source: Laravel backend (PHP), React SPA frontend (Vite + v7-style router), MySQL database.

---

## 1. Domain Overview

University/student-centric institution ("magoerp"). Multi-tenant style RBAC with four top-level
roles (admin, finance, trainer, student) backed by a granular Spatie permission set. UUID primary
keys throughout, soft deletes, `created_by`/`updated_by` auditing columns on business tables.

## 2. Database Schema (71 tables)

### Module families

| Family | Representative tables |
| --- | --- |
| Users / Roles / Permissions | `users`, `roles`, `permissions`, `role_user`, `model_has_roles`, `model_has_permissions` |
| Institution setup | `departments`, `faculties` (or equivalent), `courses`, `subjects/units`, `classes`, `streams`, `class_rooms`, `semesters`, `academic_years` |
| Student lifecycle | `students`, `student_profiles`, `parents`, `student_guardians`, `admissions`, `student_admissions`, `enrolments`, `student_classes`, `student_documents` |
| Staff | `staff`, `staff_roles`, `teaching_allocations`, `staff_departments` |
| Academics | `attendance`, `attendance_records`, `assessments`, `assessment_types`, `exams`, `exam_schedules`, `marks`, `grade_books`, `results`, `grade_sets` |
| Finance | `fees`, `fee_structures`, `fee_categories`, `payments`, `invoices`, `receipts`, `payment_methods` |
| Payroll | `payrolls`, `allowances`, `deductions`, `payslips` |
| Campus ops | `assets`, `asset_categories`, `library_books`, `book_issues`, `hostels`, `hostel_rooms`, `hostel_allocations`, `vehicles`, `transport_routes`, `route_stops`, `student_transport` |
| Notifications | `notifications`, `notification_recipients`, `notice_board` |
| Misc | `settings`, `audit_logs`, `system_logs`, `id_cards`, `letter_heads` |

### Cross-cutting conventions

- **UUID** primary keys everywhere (migrations generated UUIDs).
- **Timestamps + soft deletes** (`deleted_at`) on all domain tables.
- **Auditing columns** `created_by` / `updated_by` on business tables.
- **Money** stored as decimal columns; enrollment/payment records keep amounts + balance/pending.
- **Status enums** as string columns (e.g. attendance status, admission status, payment status).

## 3. API Surface (Laravel) by module

Auth + user endpoints:

| Area | Endpoints |
| --- | --- |
| Auth | login, logout, refresh, forgot-password, reset-password, verify-otp, resend-otp, profile |
| Users | index, store, show, update, destroy, activate/deactivate, assign-role |
| Roles | index, store, show, update, destroy, give-permission, revoke-permission |
| Permissions | index, store, update, destroy, list all |
| Settings | index (grouped settings), store (bulk update) |
| Dashboard | stats (counts per module), recent activity, notifications |

Domain modules (each exposes CRUD + specific actions):

- **Students** — CRUD, import/export, filter by class/course/status, assign class, documents
- **Staff** — CRUD, filter by department, teaching load
- **Parents** — CRUD, link students/guardians
- **Admissions** — CRUD, status workflow (pending → accepted/rejected), intake year
- **Departments / Courses / Classes / Units** — CRUD trees (department → courses → classes → units)
- **Enrolment** — create per academic year, confirm, cancel
- **Teaching allocation** — assign staff to class+unit, list allocations
- **Attendance** — mark class attendance (bulk), view by date/class/student, reports
- **Assessments** — CRUD + assessment types (continuous/tests)
- **Exams** — CRUD, schedules, registration
- **Marks / Results** — enter marks, compute totals/grades, publish, gradebook
- **Finance (Fees)** — fee structures, invoice generation, payments, receipts, outstanding
- **Payroll** — staff payroll runs, allowances/deductions, payslips
- **Assets / Library / Hostel / Transport** — CRUD + allocations/issues
- **Notifications** — send to roles/students, notice board
- **Reports** — aggregated lists and exports (attendance, finance, marks)
- **System admin / audit** — logs, system settings, backup signals

**Middleware/authorization**: Sanctum tokens; Spatie RBAC (`role:...`/`permission:...` middleware);
role-scoped filtering server-side; endpoint actions gate on specific permissions.

## 4. Frontend Routes (SPA) & Nav structure

- **Guard**: `RequireAuth` wraps protected tree; role-based chunk gating (admin | finance | trainer | student).
- **Auth flows**: login, verify-otp, forgot-password, password-reset.

Sidebar sections (module order matches backend modules):

1. Dashboard
2. Students (list, create, view, edit, documents)
3. Staff (list, create, view, edit)
4. Parents
5. Admissions
6. Academic setup — Departments, Courses, Classes, Units
7. Enrolment
8. Teaching Allocation
9. Attendance (mark, reports)
10. Assessments
11. Exams (schedules)
12. Marks & Results
13. Finance — Fees, Payments, Invoices, Receipts
14. Payroll
15. Assets / Library / Hostel / Transport
16. Notifications / Notice Board
17. Reports
18. Settings, Roles & Permissions, System Admin / Audit

### UI conventions (legacy)

- Page-level CRUD screens: list with filters/search, create/edit forms (RHF + Yup), detail views.
- Role-gated navigation and page access.
- Tables with pagination + status badges; export affordances on list screens.

## 5. Behavior invariants to preserve (non-negotiable)

1. **Four role classes** (admin, finance, trainer, student) with the same permission boundaries.
2. **Auth via OTP + password reset** flow is preserved (login → OTP verification).
3. **Money flows**: fee structures → invoices → payments → receipts, with outstanding balance tracked.
4. **Academic workflow**: admission → enrolment (per academic year) → class assignment → attendance/assessment/exam → marks → results/grades.
5. **Audit trail**: `created_by`/`updated_by` and audit logs on all business writes.
6. **Soft delete** semantics for all master data.
7. **Settings**: central key-value settings store used by multiple modules.
8. **UUID** identity convention for future data portability.

## 6. Migration decisions

| Concern | Legacy | New (per constitution) |
| --- | --- | --- |
| Backend | Laravel (PHP) | NestJS |
| ORM / DB | Eloquent / MySQL | Prisma / PostgreSQL |
| Frontend | React SPA (Vite) | Next.js App Router |
| UI | MUI-era custom | shadcn/ui + Tailwind |
| Auth | Sanctum tokens + OTP | TBD (session/JWT) — flow preserved |
| IDs | UUID | UUID (preserved) |
| Money | decimal | decimal (Prisma `Decimal`) |
