"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { allTagsAtom } from "@/store/noteAtom";
import { getNotes, createNote } from "@/lib/storage";
import { Note } from "@/lib/types";
import { ModeToggle } from "@/components/Theme-Mode";
import { Heart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import NotesToolbar from "@/components/note/NotesToolbar";
import NotesList from "@/components/note/NoteList";
import { CommandMenu } from "@/components/CommandMenu";
import { Button } from "@/components/ui/button";
import { NewNote } from "@/components/icons/NewNote";
import { syncWidget } from "@/lib/native";

export default function Home() {
  const router = useRouter();
  const setAllTags = useSetAtom(allTagsAtom);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // A `#tag` click inside the editor lands on `/?tag=…`; picking it up from
  // location.search directly keeps this page Suspense-free and, because
  // every navigation remounts this route, fresh on each entry.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tag");
    if (requested) setTagFilter(requested);
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

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

  // Keep the home-screen widget in sync — fires on load and after every
  // delete; saves while inside the editor are covered by storage.ts.
  useEffect(() => {
    syncWidget(notes);
  }, [notes]);

  // Multi-delete in the list removes notes from the page state directly,
  // without a full reload.
  const handleNotesDeleted = useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setNotes((prev) => prev.filter((n) => !removed.has(n.id)));
  }, []);

  // Tapping a #tag chip inside a list row filters the list in place.
  const handleTagClick = useCallback((tag: string) => {
    setTagFilter(tag);
    window.history.replaceState(window.history.state, "", `/?tag=${encodeURIComponent(tag)}`);
  }, []);

  const clearFilters = useCallback(() => {
    setTagFilter("all");
    setQuery("");
    window.history.replaceState(window.history.state, "", "/");
  }, []);

  const filterActive = tagFilter !== "all" || query.trim().length > 0;

  return (
    <>
      <title>n0t3s</title>
      <div className="md:w-3xl w-full h-screen flex flex-col justify-start items-start p-4 pt-8 md:border-l-1 md:border-r-1 md:border-dashed">
        {/* Top bar */}
        <div className="flex flex-col w-full gap-4 md:fixed md:top-0 left-0 md:w-3xl md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed sm:p-4">
          <div className="flex flex-row justify-end items-center gap-2">
            <h1 className="mr-auto text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
              N0T3S
            </h1>
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
        </div>

        {/* Search command */}
        <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} noteId={null} />

        {/* Content — on md+ the top bar is fixed, so clear it with an inset */}
        <div className="w-full mt-2 md:mt-14 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 flex flex-col">
          {/* Active filter chip — clears the tag/query from the row itself */}
          {filterActive && (
            <div className="mb-3 flex shrink-0 items-center justify-center">
              <button
                type="button"
                onClick={clearFilters}
                className="font-native inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-card/80 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium text-foreground/85 shadow-xs backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">
                  {tagFilter !== "all" ? `#${tagFilter}` : `“${query.trim()}”`}
                </span>
                <span className="text-[11px] text-muted-foreground/70">·</span>
                <X className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">Clear filter</span>
              </button>
            </div>
          )}

          {!filterActive && <div className="mt-4" />}
          <NotesList
            notes={notes}
            orderBy={orderBy}
            tagFilter={tagFilter}
            query={query}
            loading={loading}
            onTagClick={handleTagClick}
            onDeleted={handleNotesDeleted}
          />
        </div>

        {/* Bottom bar — search lives here, beside filter and sort */}
        <div
          role="toolbar"
          aria-label="Search, filter and sort"
          className="flex w-full shrink-0 items-center gap-2 pt-2"
        >
          <NotesToolbar
            loading={loading}
            allTags={allTags}
            orderBy={orderBy}
            setOrderBy={setOrderBy}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
            query={query}
            setQuery={setQuery}
            setSearchOpen={setSearchOpen}
          />
        </div>

        {/* Footer */}
        <footer className="flex w-full flex-col items-center justify-center gap-1.5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
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
          </span>
        </footer>
      </div>
    </>
  );
}
