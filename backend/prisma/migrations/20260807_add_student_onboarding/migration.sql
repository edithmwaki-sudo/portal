-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "national_id" VARCHAR(50),
ADD COLUMN     "next_of_kin_alt_phone" VARCHAR(50),
ADD COLUMN     "next_of_kin_email" VARCHAR(255),
ADD COLUMN     "next_of_kin_first_name" VARCHAR(100),
ADD COLUMN     "next_of_kin_last_name" VARCHAR(100),
ADD COLUMN     "next_of_kin_phone" VARCHAR(50),
ADD COLUMN     "next_of_kin_relationship" VARCHAR(100);

-- CreateTable
CREATE TABLE "course_enrolments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_curriculum_id" INTEGER NOT NULL,
    "academic_session_id" INTEGER,
    "enrolment_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'enrolled',
    "remarks" TEXT,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_enrolments_course_curriculum_id_status_idx" ON "course_enrolments"("course_curriculum_id", "status");

-- CreateIndex
CREATE INDEX "course_enrolments_academic_session_id_status_idx" ON "course_enrolments"("academic_session_id", "status");

-- CreateIndex
CREATE INDEX "course_enrolments_status_deleted_at_created_at_idx" ON "course_enrolments"("status", "deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrolments_student_id_course_curriculum_id_key" ON "course_enrolments"("student_id", "course_curriculum_id");

-- CreateIndex
CREATE INDEX "student_profiles_national_id_idx" ON "student_profiles"("national_id");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_course_curriculum_id_fkey" FOREIGN KEY ("course_curriculum_id") REFERENCES "course_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
