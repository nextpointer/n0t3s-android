"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";

/**
 * Hardware back button handling for the Android (Capacitor) build.
 *
 * With history to go back to (note -> list, any client-side navigation)
 * we let the router go back; otherwise the app exits were the OS would
 * otherwise leave users stranded. Web builds never get these events.
 */
export function AndroidBackButton() {
  const router = useRouter();

  useEffect(() => {
    let handle: PluginListenerHandle | undefined;
    let disposed = false;

    void App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        router.back();
      } else {
        void App.exitApp();
      }
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
  }, [router]);

  return null;
}
