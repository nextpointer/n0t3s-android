import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { zenMode, persistZenMode } from "@/store/noteAtom";

/**
 * Zen mode toggle: Ctrl/Cmd+Shift+Z.
 *
 * The AI keybindings that used to live here were removed with the AI feature
 * (the app is offline-only for now). The AI hook is parked in `_future/ai/`
 * together with the shortcuts it drove — restore them there.
 */
export function UseAIShortcuts() {
  const setZenMode = useSetAtom(zenMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        setZenMode((prev) => {
          const next = !prev;
          persistZenMode(next);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setZenMode]);
}
