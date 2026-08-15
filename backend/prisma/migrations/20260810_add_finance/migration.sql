-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('FEES', 'ADHOC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AdhocChargeType" AS ENUM ('FINE', 'PENALTY', 'HOSTEL', 'OTHER');

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER,
    "course_curriculum_id" INTEGER,
    "curriculum_id" INTEGER,
    "academic_year_id" INTEGER,
    "academic_session_id" INTEGER,
    "fee_structure_id" INTEGER,
    "type" "InvoiceType" NOT NULL DEFAULT 'FEES',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "amount_due" DECIMAL(12,2) NOT NULL,
    "computed_amount" DECIMAL(12,2) NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "notes" TEXT,
    "reason" TEXT,
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by" INTEGER,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_amounts_nonnegative" CHECK ("amount_due" >= 0 AND "computed_amount" >= 0)
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "fee_item_id" INTEGER,
    "item_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "charge_type" VARCHAR(50),
    "snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_items_amount_positive" CHECK ("amount" > 0),
    CONSTRAINT "invoice_items_quantity_positive" CHECK ("quantity" > 0)
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "academic_session_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(100),
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by" INTEGER,
    "reversal_reason" VARCHAR(255),
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "invoice_payment_allocations" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "academic_session_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payment_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_payment_allocations_amount_positive" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "student_ledger_entries" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "invoice_id" INTEGER,
    "payment_id" INTEGER,
    "academic_session_id" INTEGER,
    "type" VARCHAR(50) NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference" VARCHAR(100),
    "description" TEXT,
    "transaction_date" DATE NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_ledger_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_ledger_entries_single_sided" CHECK ((("debit" > 0) AND ("credit" = 0)) OR (("credit" > 0) AND ("debit" = 0)))
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_student_id_status_issue_date_idx" ON "invoices"("student_id", "status", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_academic_session_id_status_idx" ON "invoices"("academic_session_id", "status");

-- CreateIndex
CREATE INDEX "invoices_fee_structure_id_academic_session_id_status_idx" ON "invoices"("fee_structure_id", "academic_session_id", "status");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_deleted_at_idx" ON "invoices"("deleted_at");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_student_id_status_payment_date_idx" ON "payments"("student_id", "status", "payment_date");

-- CreateIndex
CREATE INDEX "payments_academic_session_id_status_idx" ON "payments"("academic_session_id", "status");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "invoice_payment_allocations_invoice_id_idx" ON "invoice_payment_allocations"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_payment_allocations_payment_id_idx" ON "invoice_payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "student_ledger_entries_student_id_transaction_date_idx" ON "student_ledger_entries"("student_id", "transaction_date");

-- CreateIndex
CREATE INDEX "student_ledger_entries_student_id_academic_session_id_idx" ON "student_ledger_entries"("student_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "student_ledger_entries_invoice_id_idx" ON "student_ledger_entries"("invoice_id");

-- CreateIndex
CREATE INDEX "student_ledger_entries_payment_id_idx" ON "student_ledger_entries"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_year_key" ON "invoice_sequences"("year");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_course_curriculum_id_fkey" FOREIGN KEY ("course_curriculum_id") REFERENCES "course_curricula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curriculum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "fee_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment_allocations" ADD CONSTRAINT "invoice_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment_allocations" ADD CONSTRAINT "invoice_payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_ledger_entries" ADD CONSTRAINT "student_ledger_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_ledger_entries" ADD CONSTRAINT "student_ledger_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_ledger_entries" ADD CONSTRAINT "student_ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_ledger_entries" ADD CONSTRAINT "student_ledger_entries_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
