-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" SERIAL NOT NULL,
    "fee_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "FeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_items" (
    "id" SERIAL NOT NULL,
    "fee_structure_id" INTEGER NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_items_amount_nonnegative" CHECK ("amount" >= 0)
);

-- CreateTable
CREATE TABLE "course_fee_assignments" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "curriculum_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "academic_session_id" INTEGER NOT NULL,
    "fee_structure_id" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "remarks" TEXT,
    "status" "FeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "course_fee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_fee_name_key" ON "fee_structures"("fee_name");

-- CreateIndex
CREATE INDEX "fee_structures_status_idx" ON "fee_structures"("status");

-- CreateIndex
CREATE INDEX "fee_structures_start_date_end_date_idx" ON "fee_structures"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "fee_structures_deleted_at_idx" ON "fee_structures"("deleted_at");

-- CreateIndex
CREATE INDEX "fee_items_fee_structure_id_display_order_idx" ON "fee_items"("fee_structure_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "fee_items_fee_structure_id_item_name_key" ON "fee_items"("fee_structure_id", "item_name");

-- CreateIndex
CREATE INDEX "course_fee_assignments_fee_structure_id_status_idx" ON "course_fee_assignments"("fee_structure_id", "status");

-- CreateIndex
CREATE INDEX "course_fee_assignments_academic_session_id_status_idx" ON "course_fee_assignments"("academic_session_id", "status");

-- CreateIndex
CREATE INDEX "course_fee_assignments_deleted_at_idx" ON "course_fee_assignments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_fee_assignments_course_id_curriculum_id_academic_yea_key" ON "course_fee_assignments"("course_id", "curriculum_id", "academic_year_id", "academic_session_id", "status");

-- AddForeignKey
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_fee_assignments" ADD CONSTRAINT "course_fee_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_fee_assignments" ADD CONSTRAINT "course_fee_assignments_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curriculum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_fee_assignments" ADD CONSTRAINT "course_fee_assignments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_fee_assignments" ADD CONSTRAINT "course_fee_assignments_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_fee_assignments" ADD CONSTRAINT "course_fee_assignments_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
