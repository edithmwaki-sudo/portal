-- Support fast prefix/infix/substring search on fee-statement student search.
-- Uses pg_trgm GIN indexes (accepted). Enable the extension if not present.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "users_name_trgm_idx"
  ON "users" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "student_profiles_admission_number_trgm_idx"
  ON "student_profiles" USING gin ("admission_number" gin_trgm_ops);
