-- AlterTable
ALTER TABLE "staff_profiles" DROP COLUMN "shif_number",
ADD COLUMN     "next_of_kin_alt_phone" VARCHAR(50),
ADD COLUMN     "next_of_kin_first_name" VARCHAR(100),
ADD COLUMN     "next_of_kin_last_name" VARCHAR(100),
ADD COLUMN     "nhif_number" VARCHAR(50);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "first_name" VARCHAR(100),
ADD COLUMN     "last_name" VARCHAR(100),
ADD COLUMN     "middle_name" VARCHAR(100);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "head_of_department_id" INTEGER,
    "description" TEXT,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_authorities" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "certification_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_levels" (
    "id" SERIAL NOT NULL,
    "certification_authority_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "entry_grade" VARCHAR(100),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "certification_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_authority_grades" (
    "id" SERIAL NOT NULL,
    "certification_authority_id" INTEGER NOT NULL,
    "grade" VARCHAR(50) NOT NULL,
    "grade_start" DECIMAL(5,2) NOT NULL,
    "grade_end" DECIMAL(5,2) NOT NULL,
    "remark" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "certification_authority_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum" (
    "id" SERIAL NOT NULL,
    "certification_authority_id" INTEGER NOT NULL,
    "cycle_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "initials" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "duration_months" INTEGER,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "certification_authority_id" INTEGER,
    "certification_level_id" INTEGER,
    "department_id" INTEGER,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_curricula" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "curriculum_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "curriculum_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "modules_taught" INTEGER,
    "taught_hours" INTEGER,
    "credit_factor" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "admission_number" VARCHAR(50),
    "course_id" INTEGER,
    "level" INTEGER DEFAULT 1,
    "adm_date" DATE,
    "status" VARCHAR(20),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_sessions" (
    "id" SERIAL NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_types" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "color_hex" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calendar_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" SERIAL NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "academic_session_id" INTEGER NOT NULL,
    "event_type_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "source" VARCHAR(30) NOT NULL DEFAULT 'manual',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecture_rooms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "capacity" INTEGER,
    "location" VARCHAR(255),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lecture_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_timetables" (
    "id" SERIAL NOT NULL,
    "academic_session_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "trainer_staff_id" INTEGER,
    "lecture_room_id" INTEGER,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'lecture',
    "recurrence" VARCHAR(30) NOT NULL DEFAULT 'weekly',
    "date" DATE,
    "notes" TEXT,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_attendances" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "student_user_id" INTEGER,
    "trainer_user_id" INTEGER,
    "session_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "remarks" TEXT,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "class_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_head_of_department_id_idx" ON "departments"("head_of_department_id");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authorities_code_key" ON "certification_authorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authorities_name_key" ON "certification_authorities"("name");

-- CreateIndex
CREATE INDEX "certification_authorities_is_active_idx" ON "certification_authorities"("is_active");

-- CreateIndex
CREATE INDEX "certification_authorities_name_idx" ON "certification_authorities"("name");

-- CreateIndex
CREATE INDEX "certification_levels_certification_authority_id_is_active_idx" ON "certification_levels"("certification_authority_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "certification_levels_certification_authority_id_code_key" ON "certification_levels"("certification_authority_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "certification_levels_certification_authority_id_name_key" ON "certification_levels"("certification_authority_id", "name");

-- CreateIndex
CREATE INDEX "certification_authority_grades_certification_authority_id_i_idx" ON "certification_authority_grades"("certification_authority_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authority_grades_certification_authority_id_g_key" ON "certification_authority_grades"("certification_authority_id", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_cycle_name_key" ON "curriculum"("cycle_name");

-- CreateIndex
CREATE INDEX "curriculum_certification_authority_id_is_active_idx" ON "curriculum"("certification_authority_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_department_id_is_active_name_idx" ON "courses"("department_id", "is_active", "name");

-- CreateIndex
CREATE INDEX "courses_certification_authority_id_certification_level_id_i_idx" ON "courses"("certification_authority_id", "certification_level_id", "is_active");

-- CreateIndex
CREATE INDEX "courses_is_active_name_idx" ON "courses"("is_active", "name");

-- CreateIndex
CREATE INDEX "course_curricula_course_id_is_active_idx" ON "course_curricula"("course_id", "is_active");

-- CreateIndex
CREATE INDEX "course_curricula_curriculum_id_is_active_idx" ON "course_curricula"("curriculum_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "course_curricula_course_id_curriculum_id_key" ON "course_curricula"("course_id", "curriculum_id");

-- CreateIndex
CREATE INDEX "units_course_id_curriculum_id_is_active_idx" ON "units"("course_id", "curriculum_id", "is_active");

-- CreateIndex
CREATE INDEX "units_is_active_name_idx" ON "units"("is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "units_course_id_curriculum_id_code_key" ON "units"("course_id", "curriculum_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_admission_number_key" ON "student_profiles"("admission_number");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_code_key" ON "academic_years"("code");

-- CreateIndex
CREATE INDEX "academic_years_is_active_idx" ON "academic_years"("is_active");

-- CreateIndex
CREATE INDEX "academic_sessions_academic_year_id_is_active_idx" ON "academic_sessions"("academic_year_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_academic_year_id_code_key" ON "academic_sessions"("academic_year_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_types_code_key" ON "calendar_event_types"("code");

-- CreateIndex
CREATE INDEX "calendar_events_academic_year_id_start_date_idx" ON "calendar_events"("academic_year_id", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_academic_session_id_start_date_idx" ON "calendar_events"("academic_session_id", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_event_type_id_idx" ON "calendar_events"("event_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecture_rooms_name_key" ON "lecture_rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lecture_rooms_code_key" ON "lecture_rooms"("code");

-- CreateIndex
CREATE INDEX "lecture_rooms_is_active_idx" ON "lecture_rooms"("is_active");

-- CreateIndex
CREATE INDEX "academic_timetables_academic_session_id_day_of_week_idx" ON "academic_timetables"("academic_session_id", "day_of_week");

-- CreateIndex
CREATE INDEX "academic_timetables_trainer_staff_id_day_of_week_idx" ON "academic_timetables"("trainer_staff_id", "day_of_week");

-- CreateIndex
CREATE INDEX "academic_timetables_lecture_room_id_day_of_week_idx" ON "academic_timetables"("lecture_room_id", "day_of_week");

-- CreateIndex
CREATE INDEX "academic_timetables_unit_id_academic_session_id_idx" ON "academic_timetables"("unit_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "class_attendances_unit_id_session_date_idx" ON "class_attendances"("unit_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "class_attendances_student_user_id_session_date_start_time_key" ON "class_attendances"("student_user_id", "session_date", "start_time");

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_of_department_id_fkey" FOREIGN KEY ("head_of_department_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_levels" ADD CONSTRAINT "certification_levels_certification_authority_id_fkey" FOREIGN KEY ("certification_authority_id") REFERENCES "certification_authorities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_authority_grades" ADD CONSTRAINT "certification_authority_grades_certification_authority_id_fkey" FOREIGN KEY ("certification_authority_id") REFERENCES "certification_authorities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_certification_authority_id_fkey" FOREIGN KEY ("certification_authority_id") REFERENCES "certification_authorities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_certification_authority_id_fkey" FOREIGN KEY ("certification_authority_id") REFERENCES "certification_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_certification_level_id_fkey" FOREIGN KEY ("certification_level_id") REFERENCES "certification_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_curricula" ADD CONSTRAINT "course_curricula_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_curricula" ADD CONSTRAINT "course_curricula_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "calendar_event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_timetables" ADD CONSTRAINT "academic_timetables_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_timetables" ADD CONSTRAINT "academic_timetables_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_timetables" ADD CONSTRAINT "academic_timetables_trainer_staff_id_fkey" FOREIGN KEY ("trainer_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_timetables" ADD CONSTRAINT "academic_timetables_lecture_room_id_fkey" FOREIGN KEY ("lecture_room_id") REFERENCES "lecture_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_trainer_user_id_fkey" FOREIGN KEY ("trainer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

