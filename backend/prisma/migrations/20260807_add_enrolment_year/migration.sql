-- AlterTable
ALTER TABLE "course_enrolments" ADD COLUMN     "academic_year_id" INTEGER;

-- CreateIndex
CREATE INDEX "course_enrolments_academic_year_id_status_idx" ON "course_enrolments"("academic_year_id", "status");

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
