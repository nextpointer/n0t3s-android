"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { allTagsAtom } from "@/store/noteAtom";
import { getNotes, createNote } from "@/lib/storage";
import { Note } from "@/lib/types";
import { ModeToggle } from "@/components/Theme-Mode";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import NotesFilters from "@/components/note/NoteFilters";
import NotesList from "@/components/note/NoteList";
import { CommandMenu } from "@/components/CommandMenu";
import { Button } from "@/components/ui/button";
import { NewNote } from "@/components/icons/NewNote";

export default function Home() {
  const router = useRouter();
  const setAllTags = useSetAtom(allTagsAtom);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNotes().then((allNotes) => {
      if (cancelled) return;
      setNotes(allNotes);
      setLoading(false);

      // Collect all tags for filter dropdown
      const tags = Array.from(
        new Set(allNotes.flatMap((note) => note.tags || [])),
      );
      setAllTags(tags);
    });
    return () => {
      cancelled = true;
    };
  }, [setAllTags]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => note.tags || [])));
  }, [notes]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    router.push(`/note/?id=${note.id}`);
  }, [router]);

  // Multi-delete in the list removes notes from the page state directly,
  // without a full reload.
  const handleNotesDeleted = useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setNotes((prev) => prev.filter((n) => !removed.has(n.id)));
  }, []);

  return (
    <>
      <title>n0t3s</title>
      <div className="md:w-3xl w-full h-screen flex flex-col justify-start items-start p-4 pt-8 md:border-l-1 md:border-r-1 md:border-dashed">
        {/* Top bar */}
        <div className="flex flex-row justify-end items-center gap-2 md:fixed md:top-0 left-0 w-full  md:w-3xl md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed sm:p-4">
          <h1 className="mr-auto text-2xl font-semibold">N0T3S</h1>
          <ModeToggle />
          <Button
            onClick={handleNewNote}
            aria-label="New note"
            title="New note"
          >
            <NewNote className="sm:mr-1 " />{" "}
            <span className="hidden sm:block">New Note</span>
          </Button>
        </div>

        {/* Filters — the top bar is fixed from md up, so desktop keeps the
            taller offset */}
        <div className="flex flex-row w-full gap-2 mt-6 md:mt-12 justify-start items-center">
          <NotesFilters
            loading={loading}
            allTags={allTags}
            orderBy={orderBy}
            setOrderBy={setOrderBy}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
            setSearchOpen={setSearchOpen}
          />
        </div>

        {/* Search command */}
        <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} noteId={null} />

        {/* Content */}
        <div className="w-full mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4 flex flex-col">
          <NotesList
            notes={notes}
            orderBy={orderBy}
            tagFilter={tagFilter}
            loading={loading}
            onDeleted={handleNotesDeleted}
          />
        </div>

        {/* Footer */}
        <footer className="flex w-full items-center justify-center gap-1.5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-[11px] text-muted-foreground">
          <span>built with</span>
          <Heart className="size-3 fill-current text-primary" aria-hidden />
          <span aria-hidden>·</span>
          <Link
            href="https://github.com/nextpointer/n0t3s-android"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            GitHub
          </Link>
        </footer>
      </div>
    </>
  );
}
