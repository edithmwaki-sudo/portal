"use client"

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteCertificationAuthority,
  type CertificationAuthority,
} from "@/lib/api/certifications";

interface DeleteAuthorityDialogProps {
  authority: CertificationAuthority | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteAuthorityDialog({
  authority,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAuthorityDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!authority) return;
    setIsDeleting(true);
    try {
      await deleteCertificationAuthority(authority.id);
      toast.success("Certification authority deleted successfully");
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 className="text-red-600" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Certification Authority</AlertDialogTitle>
          <AlertDialogDescription>
            Delete authority{" "}
            {authority?.levelsCount ? (
              <>
                after removing its {authority.levelsCount} certification
                level(s).
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {authority?.name}
                </span>
                ?
              </>
            )}{" "}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting || (authority?.levelsCount ?? 0) > 0}
            onClick={handleDelete}
          >
            {isDeleting && <Loader2 className="animate-spin" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}