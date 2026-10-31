"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSetAtom, useAtomValue, useAtom } from "jotai";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/TagInput";
import { NoteHeader } from "@/components/note/NoteHeader";
import { NoteTitle } from "@/components/note/NoteTitle";
import { NoteContent } from "@/components/note/NoteContent";
import { NoteActions } from "@/components/note/NoteActions";
import { DeleteDialog } from "@/components/dialogs/DeleteDialog";
import { SavePromptDialog } from "@/components/dialogs/SavePromptDialog";
import {
  pageLoadingAtom,
  allTagsAtom,
  tagsAtom,
  unsavedAtom,
  autoSaveAtom,
  titleAtom,
  initializeNoteAtom,
  checkUnsavedAtom,
  zenMode,
  search,
} from "@/store/noteAtom";
import { getNotes } from "@/lib/storage";
import { useNoteOperations } from "@/hooks/useNoteOperations";
import { Note } from "@/lib/types";
import { IS_NATIVE_ANDROID, cancelNotification, showNotification, UNSAVED_REMINDER_ID } from "@/lib/native";
import { App as CapacitorApp } from "@capacitor/app";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { UseAIShortcuts } from "@/hooks/useAIshortcuts";
import { CommandMenu } from "@/components/CommandMenu";

/**
 * The note id travels in the query string (`/note/?id=…`) instead of a
 * dynamic segment so the app can build as a fully static export — the id is
 * client-side-only data and cannot be prerendered. `useSearchParams` must
 * live behind a Suspense boundary to keep the static prerender happy.
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[100dvh] flex items-center justify-center">
          <Loader />
        </div>
      }
    >
      <NotePage />
    </Suspense>
  );
}

function NotePage() {
  // Get note ID from URL
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();

  /**
   * Local state to hold loaded note
   * CRITICAL: This prevents race conditions by ensuring
   * component doesn't render until note is fully loaded
   */
  const [loadedNote, setLoadedNote] = useState<Note | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searchOpen, setSearchOpen] = useAtom(search);
  const [notes, setNotes] = useState<Note[]>([]);
  const zen = useAtomValue(zenMode);

  // Read-only atoms
  const pageLoading = useAtomValue(pageLoadingAtom);
  const allTags = useAtomValue(allTagsAtom);
  const tags = useAtomValue(tagsAtom);

  // setters
  // setters
  const setPageLoading = useSetAtom(pageLoadingAtom);
  const setAllTags = useSetAtom(allTagsAtom);
  const setTags = useSetAtom(tagsAtom);
  const initializeNote = useSetAtom(initializeNoteAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);

  // Initialize auto-save functionality
  const { save } = useNoteOperations();
  UseAIShortcuts();

  // On native, leaving the app with unsaved work posts a reminder so the
  // edits can't be lost to process death; saving (or reopening) clears it.
  const unsaved = useAtomValue(unsavedAtom);
  const [autoSave] = useAtom(autoSaveAtom);
  const noteTitle = useAtomValue(titleAtom);
  useEffect(() => {
    if (!IS_NATIVE_ANDROID || !unsaved || autoSave) return;
    let cancelled = false;
    let removeListener: (() => void) | undefined;
    CapacitorApp.addListener("appStateChange", (state) => {
      if (state.isActive) {
        cancelNotification(UNSAVED_REMINDER_ID);
      } else {
        showNotification({
          id: UNSAVED_REMINDER_ID,
          title: `Unsaved changes: "${noteTitle || "Untitled"}"`,
          body: "Reopen N0T3S to keep your note.",
        });
      }
    }).then((handle) => {
      if (cancelled) void handle.remove();
      else removeListener = () => void handle.remove();
    });
    return () => {
      cancelled = true;
      removeListener?.();
      cancelNotification(UNSAVED_REMINDER_ID);
    };
  }, [unsaved, autoSave, noteTitle]);

  // The command palette and the keyboard-toolbar Save button both trigger
  // saves through this event — those components don't receive `save` as a
  // prop because they render one level above the page that owns it.
  useEffect(() => {
    const handler = () => save(false);
    window.addEventListener("note:save", handler);
    return () => window.removeEventListener("note:save", handler);
  }, [save]);

  // for fetching the notes
  useEffect(() => {
    let cancelled = false;
    getNotes().then((allNotes) => {
      if (!cancelled) setNotes(allNotes);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen]);

  useEffect(() => {
    // No id at all (e.g. opened `/note/` directly) — back to the list.
    if (!id) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setPageLoading(true);

    // This ensures conditional render shows loader
    setLoadedNote(null);
    setNotFound(false);

    // Load note from storage
    getNotes().then((data) => {
      if (cancelled) return;
      const foundNote = data.find((n) => n.id === id);

      if (foundNote) {
        initializeNote(foundNote);
        setLoadedNote(foundNote);
      } else {
        // Unknown/deleted id — stop spinning and say so.
        setNotFound(true);
      }

      // Load all tags for suggestions
      setAllTags(Array.from(new Set(data.flatMap((n) => n.tags || []))));

      setPageLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, router, setPageLoading, initializeNote, setAllTags]);

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      setTags(newTags);
      checkUnsaved();
    },
    [setTags, checkUnsaved],
  );

  if (pageLoading || (!loadedNote && !notFound)) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          This note no longer exists.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => router.push("/")}
        >
          Back to notes
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-dvh flex flex-col p-4 gap-4 ${!zen ? "xl:w-5xl md:border-l-1 md:border-r-1 md:border-dashed" : "xl:w-[72rem]"}`}
    >
      {/* Note header with actions */}
      {!zen && <NoteHeader />}

      {/* Note title editor */}
      <NoteTitle />

      {/* Tag input with suggestions */}
      {!zen && (
        <TagInput
          onChange={handleTagsChange}
          value={tags}
          suggestions={allTags}
        />
      )}

      {/* Node Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-28 sm:pb-0">
        <NoteContent key={id} initialContent={loadedNote?.content ?? ""} />
      </div>

      {/* Footer actions (save, delete, etc.) */}
      <NoteActions save={save} />

      {/* Modal dialogs */}
      <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} noteId={id} />
      <DeleteDialog />
      <ExportDialog />
      <SavePromptDialog save={save} />
    </div>
  );
}
