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
import {
  savePromptDialogOpenAtom,
  navigationTargetAtom,
} from "@/store/noteAtom";

interface SavePromptDialogProps {
  save: (isAutoSave?: boolean) => void;
}

export const SavePromptDialog = memo(function SavePromptDialog({ save }: SavePromptDialogProps) {
  const [open, setOpen] = useAtom(savePromptDialogOpenAtom);
  const target = useAtomValue(navigationTargetAtom);
  const router = useRouter();

  // handler for save the unsaved changes
  const handleSave = useCallback(() => {
    save(false);
    if (target) {
      router.push(target);
    }
    setOpen(false);
  }, [save, target, router, setOpen]);

  // handler for discard
  const handleDiscard = useCallback(() => {
    if (target) {
      router.push(target);
    }
    setOpen(false);
  }, [target, router, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Unsaved changes</SheetTitle>
          <SheetDescription>
            This note has changes that aren&apos;t saved yet. Save before
            leaving?
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button size="lg" onClick={handleSave}>
            Save and leave
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-destructive"
            onClick={handleDiscard}
          >
            Discard changes
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)}>
            Keep editing
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
