"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { getDefaultStore } from "jotai";
import { useRouter } from "next/navigation";
import { unsavedAtom } from "@/store/noteAtom";
import { createNote } from "@/lib/storage";
import { askForNotificationPermissionOnce, IS_NATIVE_ANDROID } from "@/lib/native";

/**
 * Handles `n0t3s://` deep links launched by the home-screen widget and by
 * notification actions:
 *
 *   n0t3s://              → open the notes list
 *   n0t3s://new           → create + open a new note
 *   n0t3s://note?id=<id>  → open that note
 *
 * Works both cold (getLaunchUrl) and warm (appUrlOpen on singleTask).
 */
export function NativeLinks() {
  const router = useRouter();

  useEffect(() => {
    if (!IS_NATIVE_ANDROID) return;

    // Ask for POST_NOTIFICATIONS quietly once; flip the app on and off again
    // if this prompt was ever dismissed, Android only re-asks from settings.
    askForNotificationPermissionOnce();

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const open = (url: string | null | undefined) => {
      void (async () => {
        if (!url || !url.startsWith("n0t3s://")) return;
        const queryIndex = url.indexOf("?");
        const route = url
          .slice("n0t3s://".length, queryIndex === -1 ? undefined : queryIndex)
          .replace(/\/+$/, "");
        const params = new URLSearchParams(queryIndex === -1 ? "" : url.slice(queryIndex + 1));

        // Leaving an unsaved note? Kick off the save first — save() reads the
        // jotai atoms, so it completes even after the page unmounts.
        if (getDefaultStore().get(unsavedAtom)) {
          window.dispatchEvent(new Event("note:save"));
        }

        if (route === "new") {
          const note = await createNote();
          if (!cancelled) router.push(`/note/?id=${note.id}`);
        } else if (route === "note") {
          const id = params.get("id");
          if (id && !cancelled) router.push(`/note/?id=${encodeURIComponent(id)}`);
        } else if (!cancelled) {
          router.push("/");
        }
      })();
    };

    App.getLaunchUrl().then((launch) => open(launch?.url));
    void App.addListener("appUrlOpen", ({ url }) => open(url)).then((handle) => {
      if (cancelled) {
        void handle.remove();
      } else {
        removeListener = () => void handle.remove();
      }
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}
