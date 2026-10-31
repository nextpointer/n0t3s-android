"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

type Props = {
  loading: boolean;
  allTags: string[];
  orderBy: "newest" | "oldest";
  setOrderBy: (v: "newest" | "oldest") => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  /** Kept for @/ (⌘K) command-palette parity with the keyboard. */
  setSearchOpen: (v: boolean) => void;
};

/**
 * The bottom bar: search, tag filter and sort live together under the list.
 * The search field is the primary query surface; the palette (⌘K) remains
 * for keyboard-only navigation.
 */
const NotesToolbar = React.memo(function NotesToolbar({
  loading,
  allTags,
  orderBy,
  setOrderBy,
  tagFilter,
  setTagFilter,
  query,
  setQuery,
  setSearchOpen,
}: Props) {
  if (loading)
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-9 rounded-xl bg-muted animate-pulse"
          />
        ))}
      </>
    );

  return (
    <>
      <div className="relative min-w-0 flex-1">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="h-9 rounded-xl pr-8 text-sm"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            title="Clear"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      <Select value={tagFilter} onValueChange={setTagFilter}>
        <SelectTrigger
          aria-label="Filter by tag"
          className="h-9 w-[7.5rem] shrink-0 rounded-xl text-xs sm:w-36 sm:text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectGroup>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                #{tag}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={orderBy} onValueChange={setOrderBy}>
        <SelectTrigger
          aria-label="Sort order"
          className="h-9 w-[6rem] shrink-0 rounded-xl text-xs sm:w-28 sm:text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectGroup>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Palette stays keyboard-accessible for power users. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setSearchOpen(true)}
        aria-label="Open command menu"
        title="Command menu (⌘K)"
        className="hidden size-9 shrink-0 rounded-xl md:flex"
      >
        ⌘
      </Button>
    </>
  );
});

export default NotesToolbar;
