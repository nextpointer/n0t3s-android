"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { useAtomValue, useSetAtom } from "jotai";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  autoSaveAtom,
  navigationTargetAtom,
  savePromptDialogOpenAtom,
  unsavedAtom,
} from "@/store/noteAtom";
import { EXIT_REQUEST_EVENT } from "@/components/ExitConfirmSheet";

/**
 * Hardware back button handling for the Android (Capacitor) build.
 *
 * - With an unsaved note and no autosave, back behaves like the in-app back
 *   arrow: it routes through the save prompt instead of silently discarding.
 * - Otherwise navigate within the app history when there is history.
 * - At the end of history a confirmation sheet asks before exiting — the
 *   app must never vanish from under the user's thumb. Web builds never get
 *   these events.
 */
export function AndroidBackButton() {
  const router = useRouter();
  const unsaved = useAtomValue(unsavedAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const setShowPrompt = useSetAtom(savePromptDialogOpenAtom);
  const setTarget = useSetAtom(navigationTargetAtom);

  useEffect(() => {
    let handle: PluginListenerHandle | undefined;
    let disposed = false;

    void App.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        window.dispatchEvent(new CustomEvent(EXIT_REQUEST_EVENT));
        return;
      }

      if (unsaved && !autoSave) {
        setTarget("/");
        setShowPrompt(true);
        return;
      }

      router.back();
    }).then((h) => {
      if (disposed) {
        void h.remove();
      } else {
        handle = h;
      }
    });

    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [router, unsaved, autoSave, setTarget, setShowPrompt]);

  return null;
}
