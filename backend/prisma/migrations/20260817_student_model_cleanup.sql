-- 20260817_student_model_cleanup.sql
-- Data-model cleanup for the Users / Staff / Student / Enrolment design:
--   1. course_enrolments.status becomes a typed enum
--   2. course_enrolments unique(student, course_curriculum) is relaxed to an
--      index so a student can be re-admitted into the same course later
--   3. class_attendances references student/staff *profiles* instead of users
--   4. user -> profile FKs become RESTRICT so deleting a user never wipes the
--      person record that invoices/ledger/audit reference

BEGIN;

-- ------------------------------------------------------------------
-- 1) Enrolment status enum (existing rows are lowercase 'enrolled')
-- NOTE: the type name MUST match the Prisma enum name ("EnrolmentStatus") —
-- Prisma references the Postgres type verbatim and casing is significant.
CREATE TYPE "EnrolmentStatus" AS ENUM ('ENROLLED', 'WITHDRAWN', 'COMPLETED', 'TRANSFERRED');

UPDATE "course_enrolments" SET "status" = 'ENROLLED'
WHERE "status" NOT IN ('ENROLLED', 'WITHDRAWN', 'COMPLETED', 'TRANSFERRED');

ALTER TABLE "course_enrolments" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "course_enrolments"
  ALTER COLUMN "status" TYPE "EnrolmentStatus"
  USING ("status"::text::"EnrolmentStatus"),
  ALTER COLUMN "status" SET DEFAULT 'ENROLLED'::"EnrolmentStatus";

-- ------------------------------------------------------------------
-- 2) Relax the course_enrolments unique -> composite index
-- ------------------------------------------------------------------
DROP INDEX IF EXISTS "course_enrolments_student_id_course_curriculum_id_key";
CREATE INDEX IF NOT EXISTS "course_enrolments_student_course_status_idx"
  ON "course_enrolments" ("student_id", "course_curriculum_id", "status");

-- ------------------------------------------------------------------
-- 3) class_attendances: profile-based FKs
-- ------------------------------------------------------------------
ALTER TABLE "class_attendances"
  ADD COLUMN IF NOT EXISTS "student_profile_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "trainer_profile_id" INTEGER;

UPDATE "class_attendances" AS ca
SET "student_profile_id" = sp."id"
FROM "student_profiles" AS sp
WHERE ca."student_profile_id" IS NULL
  AND ca."student_user_id" IS NOT NULL
  AND sp."user_id" = ca."student_user_id";

UPDATE "class_attendances" AS ca
SET "trainer_profile_id" = sp."id"
FROM "staff_profiles" AS sp
WHERE ca."trainer_profile_id" IS NULL
  AND ca."trainer_user_id" IS NOT NULL
  AND sp."user_id" = ca."trainer_user_id";

DROP INDEX IF EXISTS "class_attendances_student_user_id_session_date_start_time_key";
ALTER TABLE "class_attendances" DROP CONSTRAINT IF EXISTS "class_attendances_student_user_id_fkey";
ALTER TABLE "class_attendances" DROP CONSTRAINT IF EXISTS "class_attendances_trainer_user_id_fkey";
ALTER TABLE "class_attendances"
  DROP COLUMN IF EXISTS "student_user_id",
  DROP COLUMN IF EXISTS "trainer_user_id";

ALTER TABLE "class_attendances"
  ADD CONSTRAINT "class_attendances_student_profile_id_fkey"
  FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "class_attendances"
  ADD CONSTRAINT "class_attendances_trainer_profile_id_fkey"
  FOREIGN KEY ("trainer_profile_id") REFERENCES "staff_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "class_attendances_student_profile_id_session_date_start_time_key"
  ON "class_attendances" ("student_profile_id", "session_date", "start_time");
CREATE INDEX IF NOT EXISTS "class_attendances_trainer_profile_session_idx"
  ON "class_attendances" ("trainer_profile_id", "session_date");

-- ------------------------------------------------------------------
-- 4) user -> profile FKs: CASCADE -> RESTRICT (history survives)
-- ------------------------------------------------------------------
ALTER TABLE "student_profiles" DROP CONSTRAINT IF EXISTS "student_profiles_user_id_fkey";
ALTER TABLE "student_profiles"
  ADD CONSTRAINT "student_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_profiles" DROP CONSTRAINT IF EXISTS "staff_profiles_user_id_fkey";
ALTER TABLE "staff_profiles"
  ADD CONSTRAINT "staff_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
