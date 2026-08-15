-- Finance hardening: enum types + unique reference + ledger index.
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'M_PESA', 'CHEQUE', 'CARD', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM ('INVOICE', 'INVOICE_REVERSAL', 'PAYMENT', 'PAYMENT_REVERSAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "payments"
  ALTER COLUMN "method" TYPE "PaymentMethod"
  USING ("method"::text::"PaymentMethod");

ALTER TABLE "student_ledger_entries"
  ALTER COLUMN "type" TYPE "LedgerEntryType"
  USING ("type"::text::"LedgerEntryType");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_student_id_reference_key"
  ON "payments" ("student_id", "reference");

CREATE INDEX IF NOT EXISTS "student_ledger_entries_student_id_transaction_date_id_idx"
  ON "student_ledger_entries" ("student_id", "transaction_date", "id");
