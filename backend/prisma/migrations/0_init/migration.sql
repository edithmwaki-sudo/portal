-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

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
    "shif_number" VARCHAR(50),
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
    "next_of_kin_name" VARCHAR(255),
    "next_of_kin_phone" VARCHAR(50),
    "next_of_kin_email" VARCHAR(255),
    "next_of_kin_relationship" VARCHAR(100),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_employee_number_key" ON "staff_profiles"("employee_number");

-- CreateIndex
CREATE INDEX "staff_profiles_department_id_idx" ON "staff_profiles"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_uuid_key" ON "sessions"("session_uuid");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_session_uuid_idx" ON "sessions"("session_uuid");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

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
CREATE INDEX "otp_codes_user_id_purpose_idx" ON "otp_codes"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "permission_role" ADD CONSTRAINT "permission_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_role" ADD CONSTRAINT "permission_role_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

