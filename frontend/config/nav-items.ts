import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  DoorOpen,
  FileText,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  ListChecks,
  Lock,
  NotebookText,
  ReceiptText,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  /** Omit when the item is a group parent (has `children`). */
  href?: string
  icon: LucideIcon
  /** Present = this renders as a collapsible group, not a link. */
  children?: NavItem[]
  /**
   * Permission names that grant access to this item. When present the item
   * only shows if the signed-in user holds at least one of these permissions.
   * Omit (or leave empty) for items visible to every signed-in user.
   */
  permissions?: string[]
}

/**
 * Single source of truth for the sidebar navigation. Permission-based
 * filtering is applied over this array at render time: each item declares the
 * permissions that reveal it, groups collapse when none of their children are
 * visible. Grouping is a config change here (add/remove `children`), never a
 * structural change to the sidebar component itself.
 */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Users",
    icon: Users,
    children: [
      {
        label: "Staff",
        href: "/staff",
        icon: Briefcase,
        permissions: ["staff.view"],
      },
      {
        label: "Students",
        href: "/student",
        icon: GraduationCap,
        permissions: ["student.view"],
      },
    ],
  },
  {
    label: "Access",
    icon: ShieldCheck,
    children: [
      {
        label: "Roles",
        href: "/access/roles",
        icon: Shield,
        permissions: ["permissions.manage"],
      },
      {
        label: "Permissions",
        href: "/access/permissions",
        icon: KeyRound,
        permissions: ["permissions.manage"],
      },
    ],
  },
  {
    label: "Security",
    icon: Lock,
    children: [
      {
        label: "Audit Logs",
        href: "/security/audit",
        icon: ScrollText,
        permissions: ["audit.view"],
      },
      {
        label: "App Logs",
        href: "/security/logs",
        icon: FileText,
        permissions: ["logs.view"],
      },
    ],
  },
  {
    label: "Academic Setup",
    icon: Landmark,
    children: [
      {
        label: "Departments",
        href: "/departments",
        icon: Building2,
        permissions: ["department.manage"],
      },
      {
        label: "Certification",
        href: "/certification/authorities",
        icon: Award,
        permissions: ["certification.manage"],
      },
      {
        label: "Curriculum",
        href: "/curriculum",
        icon: BookOpen,
        permissions: ["curriculum.manage"],
      },
      {
        label: "Courses",
        href: "/courses",
        icon: NotebookText,
        permissions: ["course.view"],
      },
      {
        label: "Department Courses",
        href: "/courses",
        icon: FolderOpen,
        permissions: ["course.hodview"],
      },
      {
        label: "Units",
        href: "/units",
        icon: Layers,
        permissions: ["unit.view", "unit.hodview"],
      },
    ],
  },
  {
    label: "Calendar & Classes",
    icon: Calendar,
    children: [
      {
        label: "Academic Calendar",
        href: "/calendar",
        icon: CalendarCheck,
        permissions: ["academic_year.view"],
      },
      {
        label: "Timetables",
        href: "/timetables",
        icon: Calendar,
        permissions: ["timetable.view", "timetable.my"],
      },
      {
        label: "Lecture Rooms",
        href: "/lecture-rooms",
        icon: DoorOpen,
        permissions: ["room.view"],
      },
      {
        label: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
        permissions: ["attendance.view", "attendance.mark"],
      },
    ],
  },
  {
    label: "Fees",
    icon: Wallet,
    children: [
      {
        label: "Invoices",
        href: "/invoices",
        icon: ReceiptText,
        permissions: ["invoice.view"],
      },
      {
        label: "Payments",
        href: "/payments",
        icon: Wallet,
        permissions: ["payment.view"],
      },
      {
        label: "Fee Structures",
        href: "/fees/structures",
        icon: ReceiptText,
        permissions: ["fee_structure.view"],
      },
      {
        label: "Course Fee Assignments",
        href: "/fees/assignments",
        icon: ListChecks,
        permissions: ["fee_assignment.view"],
      },
      {
        label: "Finance Reports",
        href: "/reports/finance",
        icon: BarChart3,
        permissions: ["finance.reports.view"],
      },
    ],
  },
  { label: "Settings", href: "/settings", icon: Settings },
]
