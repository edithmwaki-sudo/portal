"use client"

import { Plus } from "lucide-react";

import {
  PageToolbar,
  type PageToolbarAction,
} from "@/components/dashboard/page-toolbar";

const menuActions: PageToolbarAction[] = [
  { label: "View Roles", href: "/access/roles" },
  {
    label: "View Permission",
    href: "/access/permissions",
  },
];

const primaryActions: PageToolbarAction[] = [
  {
    label: "Add Role",
    icon: Plus,
    href: "/access/roles/create",
  },
];

export function RolesToolbar() {
  return (
    <PageToolbar
      title="Roles"
      description="Manage user roles and their permissions."
      menuLabel="Manage Roles & Permissions"
      menuActions={menuActions}
      primaryActions={primaryActions}
    />
  );
}