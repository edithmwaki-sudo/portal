/**
 * App-wide permission constants — the single source of truth for what the
 * application can do.
 *
 * - Keys are semantic identifiers used in the application layer, e.g.
 *   `@RequirePermission(Permissions.canViewStudent)`.
 * - Values are the canonical `resource.action` names stored in the database.
 *   `sync-permissions.ts` seeds/validates the `permissions` table from these
 *   values on every boot, so the DB can never drift from the app layer.
 *
 * Add a new permission by adding a key/value here AND an entry in
 * `PERMISSION_DESCRIPTIONS`.
 */
export const Permissions = {
  canCreateStudent: 'student.create',
  canViewStudent: 'student.view',
  canUpdateStudent: 'student.update',
  canDeleteStudent: 'student.delete',
  canDeactivateStudent: 'student.deactivate',

  canAddCourse: 'course.add',
  canViewCourse: 'course.view',
  canEditCourse: 'course.edit',
  canHodViewCourse: 'course.hodview',

  canAddUnit: 'unit.add',
  canViewUnit: 'unit.view',
  canEditUnit: 'unit.edit',
  canDeleteUnit: 'unit.delete',
  canHodViewUnit: 'unit.hodview',

  canCreateStaff: 'staff.create',
  canViewStaff: 'staff.view',
  canUpdateStaff: 'staff.update',
  canDeleteStaff: 'staff.delete',

  canManageDepartment: 'department.manage',

  canManageCertification: 'certification.manage',

  canManageCurriculum: 'curriculum.manage',

  canManagePermissions: 'permissions.manage',

  canViewAcademicYear: 'academic_year.view',
  canAddAcademicYear: 'academic_year.add',
  canEditAcademicYear: 'academic_year.edit',
  canDeleteAcademicYear: 'academic_year.delete',

  canViewAcademicSession: 'academic_session.view',
  canAddAcademicSession: 'academic_session.add',
  canEditAcademicSession: 'academic_session.edit',
  canDeleteAcademicSession: 'academic_session.delete',

  canViewCalendar: 'calendar.view',
  canAddCalendarEvent: 'calendar.add',
  canEditCalendarEvent: 'calendar.edit',
  canDeleteCalendarEvent: 'calendar.delete',
  canGenerateCalendar: 'calendar.generate',
  canSyncCalendarHolidays: 'calendar.sync_holidays',

  canViewLectureRoom: 'room.view',
  canAddLectureRoom: 'room.add',
  canEditLectureRoom: 'room.edit',
  canDeleteLectureRoom: 'room.delete',

  canViewTimetable: 'timetable.view',
  canAddTimetable: 'timetable.add',
  canEditTimetable: 'timetable.edit',
  canDeleteTimetable: 'timetable.delete',
  canViewMyTimetable: 'timetable.my',

  canViewAttendance: 'attendance.view',
  canMarkAttendance: 'attendance.mark',

  canViewAppLogs: 'logs.view',
  canViewAuditLogs: 'audit.view',

  canViewFeeStructure: 'fee_structure.view',
  canManageFeeStructure: 'fee_structure.manage',
  canViewFeeAssignment: 'fee_assignment.view',
  canManageFeeAssignment: 'fee_assignment.manage',

  canViewInvoice: 'invoice.view',
  canManageInvoice: 'invoice.manage',
  canViewPayment: 'payment.view',
  canManagePayment: 'payment.manage',

  canViewFinanceReport: 'finance.reports.view',
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

export const PERMISSION_DESCRIPTIONS: Record<PermissionName, string> = {
  'student.create': 'Create students',
  'student.view': 'View students',
  'student.update': 'Update students',
  'student.delete': 'Delete students',
  'student.deactivate': 'Deactivate students',

  'course.add': 'Add courses',
  'course.view': 'View all courses',
  'course.edit': 'Edit and delete courses',
  'course.hodview': 'View courses in own department (HOD)',

  'unit.add': 'Add units',
  'unit.view': 'View all units',
  'unit.edit': 'Edit units',
  'unit.delete': 'Delete units',
  'unit.hodview': 'View units in own department (HOD)',

  'staff.create': 'Create staff',
  'staff.view': 'View staff',
  'staff.update': 'Update staff',
  'staff.delete': 'Delete staff',

  'department.manage': 'Manage departments',

  'certification.manage': 'Manage certification authorities, levels and grades',

  'curriculum.manage': 'Manage curricula',

  'permissions.manage': 'Manage roles and permissions',

  'academic_year.view': 'View academic years',
  'academic_year.add': 'Create academic years',
  'academic_year.edit': 'Edit academic years',
  'academic_year.delete': 'Delete academic years',

  'academic_session.view': 'View academic sessions',
  'academic_session.add': 'Create academic sessions',
  'academic_session.edit': 'Edit academic sessions',
  'academic_session.delete': 'Delete academic sessions',

  'calendar.view': 'View academic calendar',
  'calendar.add': 'Add calendar events',
  'calendar.edit': 'Edit calendar events',
  'calendar.delete': 'Delete calendar events',
  'calendar.generate': 'Generate calendar events',
  'calendar.sync_holidays': 'Sync public holidays',

  'room.view': 'View lecture rooms',
  'room.add': 'Add lecture rooms',
  'room.edit': 'Edit lecture rooms',
  'room.delete': 'Delete lecture rooms',

  'timetable.view': 'View timetables',
  'timetable.add': 'Add timetable entries',
  'timetable.edit': 'Edit timetable entries',
  'timetable.delete': 'Delete timetable entries',
  'timetable.my': 'View personal timetable',

  'attendance.view': 'View attendance',
  'attendance.mark': 'Mark attendance',

  'logs.view': 'View application logs',
  'audit.view': 'View audit logs',

  'fee_structure.view': 'View fee structures',
  'fee_structure.manage': 'Create, edit and deactivate fee structures',
  'fee_assignment.view': 'View course fee assignments',
  'fee_assignment.manage': 'Assign fee structures to courses',

  'invoice.view': 'View invoices',
  'invoice.manage': 'Create and reverse invoices',
  'payment.view': 'View payments',
  'payment.manage': 'Record and reverse payments',
  'finance.reports.view': 'View finance reports and analytics',
};
