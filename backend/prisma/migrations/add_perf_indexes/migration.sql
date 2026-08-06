-- DropIndex
DROP INDEX "sessions_session_uuid_idx";

-- CreateIndex
CREATE INDEX "academic_sessions_academic_year_id_is_active_start_date_idx" ON "academic_sessions"("academic_year_id", "is_active", "start_date");

-- CreateIndex
CREATE INDEX "academic_sessions_start_date_idx" ON "academic_sessions"("start_date");

-- CreateIndex
CREATE INDEX "academic_timetables_academic_session_id_day_of_week_start_t_idx" ON "academic_timetables"("academic_session_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "academic_timetables_trainer_staff_id_day_of_week_start_time_idx" ON "academic_timetables"("trainer_staff_id", "day_of_week", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "academic_timetables_lecture_room_id_day_of_week_start_time__idx" ON "academic_timetables"("lecture_room_id", "day_of_week", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "academic_years_is_active_start_date_idx" ON "academic_years"("is_active", "start_date");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "calendar_events_academic_session_id_start_date_source_event_idx" ON "calendar_events"("academic_session_id", "start_date", "source", "event_type_id");

-- CreateIndex
CREATE INDEX "certification_authorities_created_at_idx" ON "certification_authorities"("created_at");

-- CreateIndex
CREATE INDEX "certification_authority_grades_certification_authority_id_g_idx" ON "certification_authority_grades"("certification_authority_id", "grade_start", "grade_end");

-- CreateIndex
CREATE INDEX "certification_authority_grades_created_at_idx" ON "certification_authority_grades"("created_at");

-- CreateIndex
CREATE INDEX "certification_levels_created_at_idx" ON "certification_levels"("created_at");

-- CreateIndex
CREATE INDEX "class_attendances_unit_id_session_date_start_time_idx" ON "class_attendances"("unit_id", "session_date", "start_time");

-- CreateIndex
CREATE INDEX "courses_deleted_at_idx" ON "courses"("deleted_at");

-- CreateIndex
CREATE INDEX "courses_created_at_idx" ON "courses"("created_at");

-- CreateIndex
CREATE INDEX "curriculum_created_at_idx" ON "curriculum"("created_at");

-- CreateIndex
CREATE INDEX "departments_deleted_at_idx" ON "departments"("deleted_at");

-- CreateIndex
CREATE INDEX "lecture_rooms_deleted_at_idx" ON "lecture_rooms"("deleted_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_expires_at_idx" ON "sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_last_used_at_idx" ON "sessions"("last_used_at");

-- CreateIndex
CREATE INDEX "staff_profiles_deleted_at_idx" ON "staff_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "staff_profiles_created_at_idx" ON "staff_profiles"("created_at");

-- CreateIndex
CREATE INDEX "student_profiles_course_id_idx" ON "student_profiles"("course_id");

-- CreateIndex
CREATE INDEX "student_profiles_deleted_at_idx" ON "student_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "units_created_at_idx" ON "units"("created_at");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- Functional indexes for case-insensitive auth lookups (mode: 'insensitive'
-- compiles to LOWER(...) which plain b-tree unique indexes cannot serve).
CREATE INDEX "users_username_lower_idx" ON "users" (LOWER("username"));
CREATE INDEX "users_email_lower_idx" ON "users" (LOWER("email"));
