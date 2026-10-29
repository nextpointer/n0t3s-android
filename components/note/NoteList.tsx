"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Note } from "@/lib/types";
import NoteCard from "./NoteCard";
import { ChevronDown, Trash2, X } from "lucide-react";
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

function CollapsibleSection({
  title,
  notes,
  isExpanded,
  onToggle,
  onNoteClick,
  selectMode,
  selectedIds,
  onNoteToggle,
  onNoteLongPress,
}: {
  title: string;
  notes: Note[];
  isExpanded: boolean;
  onToggle: () => void;
  onNoteClick: (id: string) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onNoteToggle: (id: string) => void;
  onNoteLongPress: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirt = notes.length >= 10;

  // Rows are fixed-height (NOTE_ROW_HEIGHT incl. their bottom hairline), so
  // the virtualizer's translate math matches the DOM one-for-one.
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => NOTE_ROW_HEIGHT,
    overscan: 5,
    enabled: useVirt,
  });

  return (
    <div className="w-full rounded-2xl border border-dashed overflow-hidden bg-card/40">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 hover:bg-accent/30 transition-colors duration-150 motion-reduce:transition-none group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {title}
          </h2>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center tabular-nums">
            {notes.length}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground/70 transition-transform duration-300 ease-out ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {isExpanded && (
        <>
          {useVirt ? (
            <div ref={parentRef} className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 max-h-[600px] overflow-auto">
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
                    <NoteCard
                      note={notes[virtualRow.index]}
                      onClick={() => onNoteClick(notes[virtualRow.index].id)}
                      selectMode={selectMode}
                      selected={selectedIds.has(notes[virtualRow.index].id)}
                      onSelectToggle={onNoteToggle}
                      onLongPress={onNoteLongPress}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-1.5 sm:px-2 pb-1.5 sm:pb-2">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => onNoteClick(note.id)}
                  selectMode={selectMode}
                  selected={selectedIds.has(note.id)}
                  onSelectToggle={onNoteToggle}
                  onLongPress={onNoteLongPress}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Props = {
  notes: Note[];
  orderBy: "newest" | "oldest";
  tagFilter: string;
  loading: boolean;
  /** Called after a multi-delete so the page can refresh its local state. */
  onDeleted?: (ids: string[]) => void;
};

const NotesList = React.memo(function NotesList({
  notes,
  orderBy,
  tagFilter,
  loading,
  onDeleted,
}: Props) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    tagged: true,
    untagged: true,
  });

  // Multi-select delete: entered by holding a note, exited by cancelling,
  // committed through the confirmation sheet below.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (tagFilter === "all") return true;
        if (tagFilter === "untagged") return !note.tags || note.tags.length === 0;
        return note.tags?.includes(tagFilter);
      }),
    [notes, tagFilter],
  );

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

  if (loading) {
    return (
      <div className="flex flex-col gap-2.5 sm:gap-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton
            key={idx}
            className="w-full h-20 rounded-2xl bg-muted/30 border border-dashed border-border/40"
          />
        ))}
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

  const taggedNotes = sortedNotes.filter((note) => note.tags?.length);
  const untaggedNotes = sortedNotes.filter((note) => !note.tags?.length);

  return (
    <div className="w-full max-w-full overflow-hidden space-y-2.5 sm:space-y-3">
      {selectMode && (
        <div className="sticky top-0 z-20 flex items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/95 px-2 py-1.5 shadow-sm">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {allSelected ? "None" : "All"}
          </button>
          <span className="flex-1 text-center text-xs tabular-nums text-muted-foreground">
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

      {tagFilter === "all" ? (
        <>
          {taggedNotes.length > 0 && (
            <CollapsibleSection
              title="Tagged Notes"
              notes={taggedNotes}
              isExpanded={expandedSections.tagged ?? true}
              onToggle={() => toggleSection("tagged")}
              onNoteClick={navigateToNote}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onNoteToggle={toggleNote}
              onNoteLongPress={enterSelection}
            />
          )}
          {untaggedNotes.length > 0 && (
            <CollapsibleSection
              title="Untagged Notes"
              notes={untaggedNotes}
              isExpanded={expandedSections.untagged ?? true}
              onToggle={() => toggleSection("untagged")}
              onNoteClick={navigateToNote}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onNoteToggle={toggleNote}
              onNoteLongPress={enterSelection}
            />
          )}
        </>
      ) : (
        <CollapsibleSection
          title={tagFilter === "untagged" ? "Untagged" : `#${tagFilter}`}
          notes={sortedNotes}
          isExpanded={expandedSections[tagFilter] ?? true}
          onToggle={() => toggleSection(tagFilter)}
          onNoteClick={navigateToNote}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onNoteToggle={toggleNote}
          onNoteLongPress={enterSelection}
        />
      )}

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
