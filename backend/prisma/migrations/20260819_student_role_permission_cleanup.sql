-- 20260819_student_role_permission_cleanup.sql
-- Security fix: the `student` role must NOT be able to create, update,
-- delete, or deactivate student records (privilege escalation via the
-- admission API). Students keep `student.view` for self-service, but the
-- StudentsController now scopes reads to the caller's own profile.
--
-- Reverses an over-grant introduced when the roles were first provisioned.

BEGIN;

DELETE FROM "permission_role"
WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'student')
  AND "permission_id" IN (
    SELECT "id" FROM "permissions"
    WHERE "name" IN ('student.create', 'student.update', 'student.delete', 'student.deactivate')
  );

COMMIT;