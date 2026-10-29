"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deleteDialogOpenAtom, currentNoteAtom } from "@/store/noteAtom";
import { deleteNote } from "@/lib/storage";
import toast from "react-hot-toast";

export const DeleteDialog = memo(function DeleteDialog() {
  const [open, setOpen] = useAtom(deleteDialogOpenAtom);
  const note = useAtomValue(currentNoteAtom);
  const router = useRouter();

  // handler for confirm delete
  const handleConfirm = useCallback(async () => {
    if (!note) return;
    try {
      await deleteNote(note.id);
      setOpen(false);
      router.push("/");
      toast.success("Note deleted successfully", { id: "deleted" });
    } catch {
      toast.error("Failed to delete note", { id: "error" });
    }
  }, [note, setOpen, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Delete note?</SheetTitle>
          <SheetDescription>
            “{note?.title || "Untitled"}” will be permanently deleted. This
            can&apos;t be undone.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="destructive" size="lg" onClick={handleConfirm}>
            Delete note
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)}>
            Keep note
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
