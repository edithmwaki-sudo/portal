"use client"

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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
import { deleteFeeStructure, type FeeStructure } from "@/lib/api/fees";

interface DeleteFeeStructureDialogProps {
  structure: FeeStructure | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteFeeStructureDialog({
  structure,
  open,
  onOpenChange,
  onDeleted,
}: DeleteFeeStructureDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!structure) return;
    setIsDeleting(true);
    try {
      await deleteFeeStructure(structure.id);
      toast.success("Fee structure deleted successfully");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          (err.response.data as { message?: string })?.message ??
            "Cannot delete this fee structure",
          { duration: 6000 }
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Fee Structure</AlertDialogTitle>
          <AlertDialogDescription>
            Delete fee structure{" "}
            <span className="font-medium text-foreground">
              {structure?.feeName}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
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
