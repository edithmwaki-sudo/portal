# Modernization Roadmap (module order)

Governed by `frontend/prompt.txt`. Each row follows the IMPLEMENTATION LOOP
(inspect → plan → backend → frontend → review → test → mark complete). No module
starts until the previous is production-ready.

Legend: ✅ done · 🔄 in progress · ⏳ not started

| # | Module        | Backend          | Frontend         | Notes |
|---|---------------|------------------|------------------|-------|
| 1 | Authentication | ✅ auth/otp/sessions/users | ✅ login | JWT + refresh rotation + OTP 2FA |
| 2 | Dashboard     | ⏳                | ✅ permission-gated module cards | stats/activity cards pending |
| 3 | User Management | ✅ | ✅ | staff onboarding (`/staff`) + student admission (`/students`) + account admin (`/users`); permission-based sidebar |
| 4 | Staff         | ✅                | ✅ | staff table + `/staff` controller + onboarding form |
| 5 | Students      | ✅                | ✅ | `StudentProfile` table + `/students` controller + admission form |
| 6 | Parents       | ⏳                | ⏳ | |
| 7 | Admissions    | ⏳                | ⏳ | |
| 8 | Departments   | ⏳                | ⏳ | |
| 9 | Courses       | ⏳                | ⏳ | |
| 10 | Classes       | ⏳                | ⏳ | |
| 11 | Units         | ⏳                | ⏳ | |
| 12 | Enrollment    | ⏳                | ⏳ | |
| 13 | Teaching Allocation | ⏳        | ⏳ | |
| 14 | Attendance    | ⏳                | ⏳ | |
| 15 | Assessments   | ⏳                | ⏳ | |
| 16 | Examinations  | ⏳                | ⏳ | |
| 17 | Marks         | ⏳                | ⏳ | |
| 18 | Finance       | ⏳                | ⏳ | |
| 19 | Payments      | ⏳                | ⏳ | |
| 20 | Payroll       | ⏳                | ⏳ | |
| 21 | Assets        | ⏳                | ⏳ | |
| 22 | Library       | ⏳                | ⏳ | |
| 23 | Hostel        | ⏳                | ⏳ | |
| 24 | Transport     | ⏳                | ⏳ | |
| 25 | Notifications | ⏳                | ⏳ | |
| 26 | Reports       | ⏳                | ⏳ | |
| 27 | Settings      | ⏳                | 🔄 page shell | |
| 28 | System Administration | ⏳       | ⏳ | |
| 29 | Audit Logs    | 🔄 audit module exists | ⏳ | |

## Current priority

**Courses** (module 9) — unblocks replacing the free-text course/department
selects in the staff/student forms with real dropdowns. Per constitution MODULE
ORDER, Courses precedes Departments/Classes/Units. Dashboard is a permission-gated
shell today; real stats/activity cards can follow.

### Notes on module 3 (User Management)

The first registry-style build (single generic `UsersList` + `/users/create`
selector) did **not** match the legacy operational flow and was replaced. Users
are now created through their domain workflows — `StaffController` (`/staff`,
onboarding, `staff.*` permissions) and `StudentsController` (`/students`,
admission, `student.*` permissions) — each writing its own 1:1 profile table.
The general `UsersController` (`/users`) remains for account-level admin
(role, password reset). The sidebar and dashboard are filtered by the signed-in
user's permissions (`GET /auth/me` → `permissions: string[]`).