-- Performance indexes for the finance reports and ledger queries.
-- Applied manually with `CREATE INDEX IF NOT EXISTS` (prisma db push is not
-- usable in this environment). Mirrors the @@index entries added to
-- schema.prisma so a fresh environment gets them via db push / migrate.

CREATE INDEX IF NOT EXISTS "invoices_academic_year_id_status_idx"
  ON "invoices" ("academic_year_id", "status");
CREATE INDEX IF NOT EXISTS "invoices_status_due_date_idx"
  ON "invoices" ("status", "due_date");
CREATE INDEX IF NOT EXISTS "payments_status_payment_date_idx"
  ON "payments" ("status", "payment_date");
