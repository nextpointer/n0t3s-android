"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Note } from "@/lib/types";
import NoteCard from "./NoteCard";
import { Trash2, X } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { NOTE_ROW_HEIGHT } from "./NoteCard";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { addNote, deleteNote } from "@/lib/storage";
import toast from "react-hot-toast";
import { useVirtualizer } from "@tanstack/react-virtual";

type Props = {
  notes: Note[];
  orderBy: "newest" | "oldest";
  tagFilter: string;
  /** Free-text query matched against title + body. */
  query: string;
  loading: boolean;
  /** Tap an inline #tag chip → filter the list to that tag. */
  onTagClick?: (tag: string) => void;
  /** Called after a multi-delete so the page can refresh its local state. */
  onDeleted?: (ids: string[]) => void;
};

const NotesList = React.memo(function NotesList({
  notes,
  orderBy,
  tagFilter,
  query,
  loading,
  onTagClick,
  onDeleted,
}: Props) {
  const router = useRouter();

  // Multi-select delete: entered by holding a note, exited by cancelling,
  // committed through the confirmation sheet below.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filterActive = tagFilter !== "all" || query.trim().length > 0;

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (tagFilter !== "all" && !note.tags?.includes(tagFilter)) return false;
      if (q) {
        const haystack = `${note.title ?? ""}\n${note.content ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notes, tagFilter, query]);

  const sortedNotes = useMemo(() => {
    const pinnedNotes = filteredNotes.filter((note) =>
      note.tags?.includes("pin"),
    );
    const rest = filteredNotes.filter(
      (note) => !note.tags?.includes("pin"),
    );
    rest.sort((a, b) => {
      if (orderBy === "newest") return b.createdAt - a.createdAt;
      return a.createdAt - b.createdAt;
    });
    return [...pinnedNotes, ...rest];
  }, [filteredNotes, orderBy]);

  const navigateToNote = useCallback((id: string) => {
    router.push(`/note/?id=${id}`);
  }, [router]);

  const handleNewNote = useCallback(async () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    await addNote({
      id,
      title: "Untitled Note",
      content: "",
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/note/?id=${id}`);
  }, [router]);

  // SELECTION HANDLERS
  const enterSelection = useCallback((id: string) => {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmOpen(false);
  }, []);

  const toggleNote = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected =
    sortedNotes.length > 0 && sortedNotes.every((n) => selectedIds.has(n.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(() => {
      if (allSelected) return new Set();
      return new Set(sortedNotes.map((n) => n.id));
    });
  }, [allSelected, sortedNotes]);

  const handleConfirmDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => deleteNote(id)));
      onDeleted?.(ids);
      toast.success(
        ids.length === 1 ? "Note deleted" : `${ids.length} notes deleted`,
        { id: "deleted" },
      );
      exitSelection();
    } catch {
      toast.error("Failed to delete some notes", { id: "error" });
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, onDeleted, exitSelection]);

  // Fixed-height rows (NOTE_ROW_HEIGHT) keep the virtualizer's math and the
  // DOM one-for-one; only long lists pay for the machinery at all.
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirt = sortedNotes.length >= 10;

  const virtualizer = useVirtualizer({
    count: sortedNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => NOTE_ROW_HEIGHT,
    overscan: 5,
    enabled: useVirt,
  });

  const renderRow = (index: number, total: number) => (
    <NoteCard
      note={sortedNotes[index]}
      onClick={() => navigateToNote(sortedNotes[index].id)}
      selectMode={selectMode}
      selected={selectedIds.has(sortedNotes[index].id)}
      onSelectToggle={toggleNote}
      onLongPress={enterSelection}
      onTagClick={onTagClick}
      isLast={index === total - 1}
    />
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card/60">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton
              key={idx}
              style={{ height: NOTE_ROW_HEIGHT }}
              className="w-full rounded-none bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  // Notes exist but the active tag/search filter matched none.
  if (filterActive && sortedNotes.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/50 px-6 py-16 text-center select-none">
        <p className="font-native text-lg font-medium text-foreground/80">
          {tagFilter !== "all"
            ? `No notes with #${tagFilter}`
            : `No notes matching "${query.trim()}"`}
        </p>
        <Button variant="outline" onClick={handleNewNote} className="mt-2">
          Write one
        </Button>
      </div>
    );
  }

  if (sortedNotes.length === 0) {
    return (
      <div className="relative flex w-full flex-col items-center justify-center px-4 mt-24 text-center sm:mt-20 select-none pb-24">
        <h1 className="z-10 mb-4 text-3xl font-thin leading-tight tracking-tight text-foreground md:text-5xl text-balance">
          Your{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
            privacy
          </span>
          -first
          <br className="block sm:hidden" />{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
            markdown
          </span>{" "}
          notes
        </h1>
        <h2 className="absolute -bottom-8 md:-bottom-10 opacity-25 text-9xl md:text-[12rem] bg-gradient-to-b from-foreground to-transparent bg-clip-text text-transparent select-none">
          N0T3S
        </h2>

        <div className="z-10 flex flex-row items-center justify-center w-full gap-3 mt-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => router.push("/help")}
            className="w-auto shadow-none"
          >
            Help : ?
          </Button>

          <Button
            onClick={handleNewNote}
            className="w-auto transition-shadow  sm:w-auto shadow-primary/20 hover:shadow-primary/40"
          >
            Create new Note : )
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4">
      {selectMode && (
        <div className="sticky top-0 z-20 flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-2.5 py-1.5 shadow-xs backdrop-blur-md">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {allSelected ? "None" : "All"}
          </button>
          <span className="flex-1 text-center text-xs font-medium tabular-nums tracking-[-0.01em] text-foreground/80">
            {selectedIds.size} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={exitSelection}
            aria-label="Cancel selection"
            title="Cancel"
            className="size-8"
          >
            <X className="size-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={selectedIds.size === 0 || deleting}
            className="gap-1.5"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      )}

      {/* One flat list — pinned first, then everything else. Rows carry an
          inline clickable #tag preview (see NoteCard). */}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-xs">
        {sortedNotes.length >= 10 ? (
          <div
            ref={parentRef}
            className="max-h-[600px] overflow-y-auto overscroll-contain"
          >
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderRow(virtualRow.index, sortedNotes.length)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {sortedNotes.map((note, index) => (
              <div key={note.id}>{renderRow(index, sortedNotes.length)}</div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-delete confirmation */}
      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedIds.size === 1 ? "Delete note?" : `Delete ${selectedIds.size} notes?`}
            </SheetTitle>
            <SheetDescription>
              {selectedIds.size === 1
                ? "This note will be permanently deleted."
                : `${selectedIds.size} notes will be permanently deleted.`}{" "}
              This can&apos;t be undone.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting
                ? "Deleting…"
                : selectedIds.size === 1
                  ? "Delete note"
                  : `Delete ${selectedIds.size} notes`}
            </Button>
            <Button variant="ghost" size="lg" onClick={exitSelection}>
              Keep {selectedIds.size === 1 ? "it" : "them"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
});

export default NotesList;
