"use client"

import Link from "next/link"
import {
  BookOpen,
  Briefcase,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react"

import { PageToolbar } from "@/components/dashboard/page-toolbar"
import {
  usePermissions,
  hasAnyPermission,
} from "@/hooks/use-current-user"

interface ModuleCard {
  label: string
  description: string
  href: string
  icon: LucideIcon
  permissions?: string[]
}

const modules: ModuleCard[] = [
  {
    label: "Staff",
    description: "Onboard staff members and manage their records.",
    href: "/staff",
    icon: Briefcase,
    permissions: ["staff.view"],
  },
  {
    label: "Students",
    description: "Admit students and manage their records.",
    href: "/student",
    icon: GraduationCap,
    permissions: ["student.view"],
  },
  {
    label: "Courses",
    description: "Manage courses and course offerings.",
    href: "/courses",
    icon: BookOpen,
    permissions: ["course.view"],
  },
  {
    label: "Department Courses",
    description: "Manage courses in your department.",
    href: "/courses",
    icon: FolderOpen,
    permissions: ["course.hodview"],
  },
  {
    label: "Roles",
    description: "Create roles and control what each role can do.",
    href: "/access/roles",
    icon: Shield,
    permissions: ["permissions.manage"],
  },
  {
    label: "Permissions",
    description: "View and resync the permission catalog.",
    href: "/access/permissions",
    icon: KeyRound,
    permissions: ["permissions.manage"],
  },
  {
    label: "Settings",
    description: "Configure the portal and your account.",
    href: "/settings",
    icon: Settings,
  },
]

export default function DashboardPage() {
  const { permissions, loading } = usePermissions()

  const visibleModules = modules.filter((mod) =>
    hasAnyPermission(permissions, mod.permissions),
  )

  return (
    <>
      <PageToolbar
        title="Dashboard"
        description="Overview of the Apex ERP"
      />
      <div className="mx-[50px] mb-[30px]">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-lg bg-white shadow-lg shadow-black/5"
              />
            ))}
          </div>
        ) : visibleModules.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-lg shadow-black/5">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No modules are available for your account yet. Ask an administrator
              to grant you access permissions.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visibleModules.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                className="group flex flex-col gap-3 rounded-lg bg-white p-6 shadow-lg shadow-black/5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <mod.icon className="size-5" />
                </span>
                <div className="grid gap-1">
                  <h3 className="text-base font-semibold">{mod.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
