"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
  viewModeAtom,
  toolbarEnabledAtom,
  zenMode,
  search,
  persistZenMode,
} from "@/store/noteAtom";
import { Cross } from "../icons/Cross";
import { Zen } from "../icons/Zen";
import { Search } from "../icons/Search";
import { EyeIcon } from "../icons/EditorIcons";

interface NoteActionsProps {
  save: (isAutoSave?: boolean) => void;
}

/**
 * One shared class for every square hit-tap in the bar so all icons behave
 * and breathe identically.
 */
const ACTION_BTN =
  "rounded-lg p-2 text-foreground/60 transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-accent hover:text-foreground active:scale-[0.96] disabled:pointer-events-none";

export const NoteActions = memo(function NoteActions({ save }: NoteActionsProps) {  // zen mode state
  const [zen, setZenMode] = useAtom(zenMode);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  const handleToggleZen = useCallback(() => {
    const next = !zen;
    setZenMode(next);
    persistZenMode(next);
  }, [zen, setZenMode]);

  const previewing = viewMode === "preview";
  const handleTogglePreview = useCallback(() => {
    setViewMode(previewing ? "edit" : "preview");
  }, [previewing, setViewMode]);

  // getter
  const unsaved = useAtomValue(unsavedAtom);
  const loading = useAtomValue(saveLoadingAtom);
  const autoSave = useAtomValue(autoSaveAtom);

  // setter
  const setSearchOpen = useSetAtom(search);
  const handleSave = useCallback(() => {
    save(false);
  }, [save]);

  /**
   * While the software keyboard is up, the bottom bar sits underneath it —
   * the toolbar pinned above the keyboard hosts the same actions, so this
   * bar steps aside (NoteContent broadcasts "note:keyboard"). Only step
   * aside when that toolbar is actually visible to host them.
   */
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const toolbarEnabled = useAtomValue(toolbarEnabledAtom);
  useEffect(() => {
    const handler = (e: Event) =>
      setKeyboardOpen(Boolean((e as CustomEvent).detail));
    window.addEventListener("note:keyboard", handler);
    return () => window.removeEventListener("note:keyboard", handler);
  }, []);

  if (keyboardOpen && toolbarEnabled && viewMode !== "preview") return null;

  return (
    <div className="md:relative fixed right-3 bottom-2 md:bottom-0 left-0 flex flex-row h-16 pb-1 gap-1 items-center justify-end z-30 px-1">
      {!zen && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search notes"
          title="Search notes (Ctrl+P)"
          className={cn("size-9 cursor-pointer", ACTION_BTN)}
        >
          <Search className="size-4 pointer-events-none" />
        </button>
      )}

      <button
        type="button"
        onClick={handleTogglePreview}
        aria-pressed={previewing}
        aria-label="Toggle read mode"
        title="Read mode (Ctrl+/)"
        className={cn("size-9 cursor-pointer", ACTION_BTN)}
      >
        <EyeIcon
          className={cn(
            "size-4 pointer-events-none",
            previewing ? "text-foreground" : "",
          )}
        />
      </button>

      <button
        type="button"
        onClick={handleToggleZen}
        aria-pressed={zen}
        aria-label={zen ? "Exit zen mode" : "Enter zen mode"}
        title="Zen mode (Ctrl+Shift+Z)"
        className={cn("size-9 cursor-pointer", ACTION_BTN)}
      >
        {zen ? (
          <Cross className="size-4 pointer-events-none text-foreground" />
        ) : (
          <Zen className="size-4 pointer-events-none" />
        )}
      </button>

      {!zen && !autoSave && (
        <Button
          variant={unsaved ? "default" : "ghost"}
          className="text-xs rounded-full py-0.1 shrink-0"
          onClick={handleSave}
          disabled={!unsaved || loading}
        >
          {loading ? (
            <>
              <Loader className="text-background mr-2" /> ...
            </>
          ) : (
            "Save"
          )}
        </Button>
      )}
    </div>
  );
});
