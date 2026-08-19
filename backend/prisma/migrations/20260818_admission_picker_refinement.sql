-- 20260818_admission_picker_refinement.sql
-- Admission picker refinements:
--   1. Unique, case-insensitive course NAME (so the course picker is unambiguous
--      and the name encodes the certification level).
--   2. course_enrolments.entry_level — the level a student entered at (history),
--      with student_profiles.level remaining the current-level cache.
--   3. Partial unique index: a course may have AT MOST ONE active curriculum
--      (course_curricula.is_active = true). Backs the "auto active curriculum"
--      admission resolution and keeps the picker duplicate-free.

BEGIN;

-- ------------------------------------------------------------------
-- 0) Guard: fail loudly if existing data breaks the new invariants
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "courses"
    WHERE "deleted_at" IS NULL
    GROUP BY LOWER("name")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate course names exist. Deduplicate before applying the unique index.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "course_curricula"
    WHERE "is_active" = true
    GROUP BY "course_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'A course has multiple active curricula. Fix before applying the partial unique index.';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 1) Unique, case-insensitive course name
-- ------------------------------------------------------------------
CREATE UNIQUE INDEX "courses_name_key" ON "courses" (LOWER("name"));

-- ------------------------------------------------------------------
-- 2) entry level on the enrolment
-- ------------------------------------------------------------------
ALTER TABLE "course_enrolments"
  ADD COLUMN IF NOT EXISTS "entry_level" INTEGER NOT NULL DEFAULT 1;

-- ------------------------------------------------------------------
-- 3) at most one active curriculum per course
-- ------------------------------------------------------------------
CREATE UNIQUE INDEX "course_curricula_active_course_key"
  ON "course_curricula" ("course_id") WHERE "is_active" = true;

COMMIT;
