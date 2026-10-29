"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { autoSaveAtom, unsavedAtom } from "@/store/noteAtom";

/** Fired by the hardware back button when there is nothing left to go back to. */
export const EXIT_REQUEST_EVENT = "app:exit-request";

/** Give the debounced save a comfortable margin before the WebView dies. */
const SAVE_THEN_EXIT_DELAY_MS = 800;

/**
 * Confirmation the user asked for instead of the app vanishing on hardware
 * back. Listens for `app:exit-request` — only the Android back listener
 * dispatches it, so web builds never see this sheet.
 */
export const ExitConfirmSheet = memo(function ExitConfirmSheet() {
  const [open, setOpen] = useState(false);
  const unsaved = useAtomValue(unsavedAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const hasUnsavedNote = unsaved && !autoSave;

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(EXIT_REQUEST_EVENT, handler);
    return () => window.removeEventListener(EXIT_REQUEST_EVENT, handler);
  }, []);

  // Plain exit: the note data lives in IndexedDB and is untouched by exiting.
  const handleExit = useCallback(() => {
    setOpen(false);
    void App.exitApp();
  }, []);

  const handleSaveThenExit = useCallback(() => {
    window.dispatchEvent(new CustomEvent("note:save"));
    window.setTimeout(() => void App.exitApp(), SAVE_THEN_EXIT_DELAY_MS);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Exit N0T3S?</SheetTitle>
          <SheetDescription>
            Your notes stay saved on this device. You can pick up right where
            you left off.
          </SheetDescription>
          {hasUnsavedNote && (
            <SheetDescription>
              The open note still has unsaved changes.
            </SheetDescription>
          )}
        </SheetHeader>
        <SheetFooter>
          {hasUnsavedNote && (
            <Button size="lg" onClick={handleSaveThenExit}>
              Save and exit
            </Button>
          )}
          <Button size="lg" variant={hasUnsavedNote ? "outline" : "default"} onClick={handleExit}>
            Exit app
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setOpen(false)}>
            Stay
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
