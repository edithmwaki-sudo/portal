"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleForm } from "@/components/dashboard/roles/role-form";
import type { RoleResponse } from "@/lib/api/roles";

interface EditRoleDialogProps {
  role: RoleResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
  onUpdated,
}: EditRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>Update the role&apos;s name.</DialogDescription>
        </DialogHeader>
        {role && (
          <RoleForm
            key={role.id}
            roleId={role.id}
            initialValues={{ name: role.name }}
            onSuccess={() => {
              onOpenChange(false);
              onUpdated?.();
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}