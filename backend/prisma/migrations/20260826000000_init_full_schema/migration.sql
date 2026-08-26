-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrolmentStatus" AS ENUM ('ENROLLED', 'WITHDRAWN', 'COMPLETED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('FEES', 'ADHOC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AdhocChargeType" AS ENUM ('FINE', 'PENALTY', 'HOSTEL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'M_PESA', 'CHEQUE', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INVOICE', 'INVOICE_REVERSAL', 'PAYMENT', 'PAYMENT_REVERSAL');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_role" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "permission_role_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "gender" "Gender" DEFAULT 'OTHER',
    "date_of_birth" DATE,
    "nationality" VARCHAR(100),
    "county" VARCHAR(100),
    "place_of_birth" VARCHAR(100),
    "religion" VARCHAR(100),
    "address" TEXT,
    "city" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "profile_picture" TEXT,
    "alternative_phone_number" VARCHAR(50),
    "is_pwd" BOOLEAN NOT NULL DEFAULT false,
    "disability_type" VARCHAR(100),
    "disability_description" TEXT,
    "must_reset_password" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token_hash" TEXT,
    "password_changed_at" TIMESTAMPTZ(6),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_login_at" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" VARCHAR(50),
    "last_login_user_agent" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_number" VARCHAR(50),
    "national_id" VARCHAR(50),
    "kra_pin" VARCHAR(50),
    "nhif_number" VARCHAR(50),
    "nssf_number" VARCHAR(50),
    "department_id" INTEGER,
    "supervisor_id" INTEGER,
    "job_title" VARCHAR(100),
    "employment_type" VARCHAR(50),
    "employment_status" VARCHAR(50),
    "date_joined" DATE,
    "confirmation_date" DATE,
    "contract_end_date" DATE,
    "termination_date" DATE,
    "termination_reason" TEXT,
    "basic_salary" DECIMAL(12,2),
    "work_email" VARCHAR(255),
    "work_phone" VARCHAR(50),
    "office_location" VARCHAR(100),
    "is_teaching_staff" BOOLEAN NOT NULL DEFAULT false,
    "trainer_number" VARCHAR(50),
    "highest_qualification" VARCHAR(100),
    "specialization" VARCHAR(255),
    "next_of_kin_first_name" VARCHAR(100),
    "next_of_kin_last_name" VARCHAR(100),
    "next_of_kin_phone" VARCHAR(50),
    "next_of_kin_alt_phone" VARCHAR(50),
    "next_of_kin_email" VARCHAR(255),
    "next_of_kin_relationship" VARCHAR(100),
    "next_of_kin_name" VARCHAR(255),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

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
    "national_id" VARCHAR(50),
    "course_id" INTEGER,
    "level" INTEGER DEFAULT 1,
    "adm_date" DATE,
    "status" VARCHAR(20),
    "next_of_kin_first_name" VARCHAR(100),
    "next_of_kin_last_name" VARCHAR(100),
    "next_of_kin_phone" VARCHAR(50),
    "next_of_kin_alt_phone" VARCHAR(50),
    "next_of_kin_email" VARCHAR(255),
    "next_of_kin_relationship" VARCHAR(100),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrolments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_curriculum_id" INTEGER NOT NULL,
    "academic_session_id" INTEGER,
    "academic_year_id" INTEGER,
    "enrolment_date" DATE NOT NULL,
    "entry_level" INTEGER NOT NULL DEFAULT 1,
    "status" "EnrolmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "remarks" TEXT,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_enrolments_pkey" PRIMARY KEY ("id")
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
    "student_profile_id" INTEGER,
    "trainer_profile_id" INTEGER,
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

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "session_uuid" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token_hash" TEXT,
    "device_name" VARCHAR(255),
    "browser" VARCHAR(100),
    "operating_system" VARCHAR(100),
    "ip_address" VARCHAR(50),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "username" VARCHAR(100) NOT NULL,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "failure_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" VARCHAR(100),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "request_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "purpose" VARCHAR(50) NOT NULL,
    "delivery_method" VARCHAR(50),
    "destination" VARCHAR(255),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "fee_items_pkey" PRIMARY KEY ("id")
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
    "charge_type" "AdhocChargeType",
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

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
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
    "snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "academic_session_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by" INTEGER,
    "reversal_reason" VARCHAR(255),
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payment_allocations" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "academic_session_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_ledger_entries" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "invoice_id" INTEGER,
    "payment_id" INTEGER,
    "academic_session_id" INTEGER,
    "type" "LedgerEntryType" NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference" VARCHAR(100),
    "description" TEXT,
    "transaction_date" DATE NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permission_role_permission_id_idx" ON "permission_role"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_employee_number_key" ON "staff_profiles"("employee_number");

-- CreateIndex
CREATE INDEX "staff_profiles_department_id_idx" ON "staff_profiles"("department_id");

-- CreateIndex
CREATE INDEX "staff_profiles_deleted_at_idx" ON "staff_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "staff_profiles_created_at_idx" ON "staff_profiles"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_head_of_department_id_idx" ON "departments"("head_of_department_id");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_deleted_at_idx" ON "departments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authorities_code_key" ON "certification_authorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authorities_name_key" ON "certification_authorities"("name");

-- CreateIndex
CREATE INDEX "certification_authorities_is_active_idx" ON "certification_authorities"("is_active");

-- CreateIndex
CREATE INDEX "certification_authorities_name_idx" ON "certification_authorities"("name");

-- CreateIndex
CREATE INDEX "certification_authorities_created_at_idx" ON "certification_authorities"("created_at");

-- CreateIndex
CREATE INDEX "certification_levels_certification_authority_id_is_active_idx" ON "certification_levels"("certification_authority_id", "is_active");

-- CreateIndex
CREATE INDEX "certification_levels_created_at_idx" ON "certification_levels"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certification_levels_certification_authority_id_code_key" ON "certification_levels"("certification_authority_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "certification_levels_certification_authority_id_name_key" ON "certification_levels"("certification_authority_id", "name");

-- CreateIndex
CREATE INDEX "certification_authority_grades_certification_authority_id_i_idx" ON "certification_authority_grades"("certification_authority_id", "is_active");

-- CreateIndex
CREATE INDEX "certification_authority_grades_certification_authority_id_g_idx" ON "certification_authority_grades"("certification_authority_id", "grade_start", "grade_end");

-- CreateIndex
CREATE INDEX "certification_authority_grades_created_at_idx" ON "certification_authority_grades"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authority_grades_certification_authority_id_g_key" ON "certification_authority_grades"("certification_authority_id", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_cycle_name_key" ON "curriculum"("cycle_name");

-- CreateIndex
CREATE INDEX "curriculum_certification_authority_id_is_active_idx" ON "curriculum"("certification_authority_id", "is_active");

-- CreateIndex
CREATE INDEX "curriculum_created_at_idx" ON "curriculum"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_name_key" ON "courses"("name");

-- CreateIndex
CREATE INDEX "courses_department_id_is_active_name_idx" ON "courses"("department_id", "is_active", "name");

-- CreateIndex
CREATE INDEX "courses_certification_authority_id_certification_level_id_i_idx" ON "courses"("certification_authority_id", "certification_level_id", "is_active");

-- CreateIndex
CREATE INDEX "courses_is_active_name_idx" ON "courses"("is_active", "name");

-- CreateIndex
CREATE INDEX "courses_deleted_at_idx" ON "courses"("deleted_at");

-- CreateIndex
CREATE INDEX "courses_created_at_idx" ON "courses"("created_at");

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
CREATE INDEX "units_created_at_idx" ON "units"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "units_course_id_curriculum_id_code_key" ON "units"("course_id", "curriculum_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_admission_number_key" ON "student_profiles"("admission_number");

-- CreateIndex
CREATE INDEX "student_profiles_course_id_idx" ON "student_profiles"("course_id");

-- CreateIndex
CREATE INDEX "student_profiles_deleted_at_idx" ON "student_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "student_profiles_national_id_idx" ON "student_profiles"("national_id");

-- CreateIndex
CREATE INDEX "course_enrolments_student_id_course_curriculum_id_status_idx" ON "course_enrolments"("student_id", "course_curriculum_id", "status");

-- CreateIndex
CREATE INDEX "course_enrolments_course_curriculum_id_status_idx" ON "course_enrolments"("course_curriculum_id", "status");

-- CreateIndex
CREATE INDEX "course_enrolments_academic_session_id_status_idx" ON "course_enrolments"("academic_session_id", "status");

-- CreateIndex
CREATE INDEX "course_enrolments_academic_year_id_status_idx" ON "course_enrolments"("academic_year_id", "status");

-- CreateIndex
CREATE INDEX "course_enrolments_status_deleted_at_created_at_idx" ON "course_enrolments"("status", "deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_code_key" ON "academic_years"("code");

-- CreateIndex
CREATE INDEX "academic_years_is_active_idx" ON "academic_years"("is_active");

-- CreateIndex
CREATE INDEX "academic_years_is_active_start_date_idx" ON "academic_years"("is_active", "start_date");

-- CreateIndex
CREATE INDEX "academic_sessions_academic_year_id_is_active_idx" ON "academic_sessions"("academic_year_id", "is_active");

-- CreateIndex
CREATE INDEX "academic_sessions_academic_year_id_is_active_start_date_idx" ON "academic_sessions"("academic_year_id", "is_active", "start_date");

-- CreateIndex
CREATE INDEX "academic_sessions_start_date_idx" ON "academic_sessions"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_academic_year_id_code_key" ON "academic_sessions"("academic_year_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_types_code_key" ON "calendar_event_types"("code");

-- CreateIndex
CREATE INDEX "calendar_events_academic_year_id_start_date_idx" ON "calendar_events"("academic_year_id", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_academic_session_id_start_date_idx" ON "calendar_events"("academic_session_id", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_academic_session_id_start_date_source_event_idx" ON "calendar_events"("academic_session_id", "start_date", "source", "event_type_id");

-- CreateIndex
CREATE INDEX "calendar_events_event_type_id_idx" ON "calendar_events"("event_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecture_rooms_name_key" ON "lecture_rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lecture_rooms_code_key" ON "lecture_rooms"("code");

-- CreateIndex
CREATE INDEX "lecture_rooms_is_active_idx" ON "lecture_rooms"("is_active");

-- CreateIndex
CREATE INDEX "lecture_rooms_deleted_at_idx" ON "lecture_rooms"("deleted_at");

-- CreateIndex
CREATE INDEX "academic_timetables_academic_session_id_day_of_week_idx" ON "academic_timetables"("academic_session_id", "day_of_week");

-- CreateIndex
CREATE INDEX "academic_timetables_academic_session_id_day_of_week_start_t_idx" ON "academic_timetables"("academic_session_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "academic_timetables_trainer_staff_id_day_of_week_idx" ON "academic_timetables"("trainer_staff_id", "day_of_week");

-- CreateIndex
CREATE INDEX "academic_timetables_trainer_staff_id_day_of_week_start_time_idx" ON "academic_timetables"("trainer_staff_id", "day_of_week", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "academic_timetables_lecture_room_id_day_of_week_idx" ON "academic_timetables"("lecture_room_id", "day_of_week");

-- CreateIndex
CREATE INDEX "academic_timetables_lecture_room_id_day_of_week_start_time__idx" ON "academic_timetables"("lecture_room_id", "day_of_week", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "academic_timetables_unit_id_academic_session_id_idx" ON "academic_timetables"("unit_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "class_attendances_unit_id_session_date_idx" ON "class_attendances"("unit_id", "session_date");

-- CreateIndex
CREATE INDEX "class_attendances_unit_id_session_date_start_time_idx" ON "class_attendances"("unit_id", "session_date", "start_time");

-- CreateIndex
CREATE INDEX "class_attendances_trainer_profile_id_session_date_idx" ON "class_attendances"("trainer_profile_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "class_attendances_student_profile_id_session_date_start_tim_key" ON "class_attendances"("student_profile_id", "session_date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_uuid_key" ON "sessions"("session_uuid");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_expires_at_idx" ON "sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_last_used_at_idx" ON "sessions"("last_used_at");

-- CreateIndex
CREATE INDEX "login_attempts_user_id_idx" ON "login_attempts"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_username_idx" ON "login_attempts"("username");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "otp_codes_user_id_purpose_idx" ON "otp_codes"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

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
CREATE UNIQUE INDEX "course_fee_assignments_course_id_curriculum_id_academic_yea_key" ON "course_fee_assignments"("course_id", "curriculum_id", "academic_year_id", "academic_session_id", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_student_id_status_issue_date_idx" ON "invoices"("student_id", "status", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_academic_session_id_status_idx" ON "invoices"("academic_session_id", "status");

-- CreateIndex
CREATE INDEX "invoices_academic_year_id_status_idx" ON "invoices"("academic_year_id", "status");

-- CreateIndex
CREATE INDEX "invoices_fee_structure_id_academic_session_id_status_idx" ON "invoices"("fee_structure_id", "academic_session_id", "status");

-- CreateIndex
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");

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
CREATE INDEX "payments_status_payment_date_idx" ON "payments"("status", "payment_date");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_student_id_reference_key" ON "payments"("student_id", "reference");

-- CreateIndex
CREATE INDEX "invoice_payment_allocations_invoice_id_idx" ON "invoice_payment_allocations"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_payment_allocations_payment_id_idx" ON "invoice_payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "student_ledger_entries_student_id_transaction_date_id_idx" ON "student_ledger_entries"("student_id", "transaction_date", "id");

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
ALTER TABLE "permission_role" ADD CONSTRAINT "permission_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_role" ADD CONSTRAINT "permission_role_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_course_curriculum_id_fkey" FOREIGN KEY ("course_curriculum_id") REFERENCES "course_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_trainer_profile_id_fkey" FOREIGN KEY ("trainer_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

