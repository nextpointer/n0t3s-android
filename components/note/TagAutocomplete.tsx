"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { tagTokenBeforeCaret } from "@/lib/tags";
import { cn } from "@/lib/utils";

export interface TagAutocompleteProps {
  /**
   * The OverType textarea. Suggestions track its caret on every
   * input/selection change; commits are written straight into `.value`
   * followed by a bubbling `input` event (OverType's global listener picks
   * that up — see `toggleTaskByIndex` for the same trick).
   */
  textarea: HTMLTextAreaElement | null;
  allTags: string[];
  /** Hidden outside edit/plain modes — there is no caret to track. */
  visible: boolean;
}

const MAX_SUGGESTIONS = 6;

/**
 * Obsidian-style `#tag` completion for the editor textarea.
 *
 * Opens just above the keyboard inset whenever the token before the caret is
 * a `#word`, filters the note database's tag index, and commits with
 * Enter / Tab / click. Key handling runs on a window capture listener so it
 * preempts OverType's own textarea keydown (Enter-inserts-newline etc.).
 */
export const TagAutocomplete = memo(function TagAutocomplete({
  textarea,
  allTags,
  visible,
}: TagAutocompleteProps) {
  const [token, setToken] = useState<{ tokenStart: number; query: string } | null>(
    null,
  );
  const [highlight, setHighlight] = useState(0);
  const highlightRef = useRef(0);
  highlightRef.current = highlight;

  // Which suggestions match the current query. Case-insensitive, prefix
  // hits first so typing `#wo` jumps to `work` over `down`.
  const suggestions = useMemo(() => {
    if (!token) return [];
    const q = token.query.toLowerCase();
    const starts: string[] = [];
    const contains: string[] = [];
    for (const tag of allTags) {
      if (tag.length > 32) continue;
      const lower = tag.toLowerCase();
      if (lower === q) continue; // already typed exactly
      (lower.startsWith(q) ? starts : lower.includes(q) ? contains : []).push(tag);
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [token, allTags]);

  const open = visible && !!token && suggestions.length > 0;
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  // Track caret → token. Runs on both input and selectionchange (arrow-key
  // navigation between two tags updates without any input).
  useEffect(() => {
    if (visible) return;
    setToken(null);
    return;
  }, [visible]);

  useEffect(() => {
    if (!textarea || !visible) return;
    const update = () => {
      const found = tagTokenBeforeCaret(textarea.value, textarea.selectionStart);
      setToken((prev) => {
        const same =
          prev?.tokenStart === found?.tokenStart &&
          prev?.query === found?.query;
        return same ? prev : found;
      });
    };
    update();
    textarea.addEventListener("input", update);
    document.addEventListener("selectionchange", update);
    return () => {
      textarea.removeEventListener("input", update);
      document.removeEventListener("selectionchange", update);
    };
  }, [textarea, visible]);

  // Reset the highlight whenever the suggestion list members change shape.
  useEffect(() => {
    setHighlight(0);
  }, [token]);

  const commit = (tag: string) => {
    if (!textarea || !token) return;
    // Re-derive the token at commit time: the caret may have drifted since
    // the suggestion list was computed.
    const current = tagTokenBeforeCaret(textarea.value, textarea.selectionStart);
    if (!current) return;
    const replacement = `#${tag} `;
    textarea.focus();
    textarea.setRangeText(replacement, current.tokenStart, textarea.selectionStart, "end");
    // Route through OverType's global input listener (updates preview + onChange).
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    setToken(null);
  };

  // Keyboard preemption. Capture phase on window fires before OverType's
  // textarea-level handlers, so Enter/Tab/Arrows/Esc never reach them.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target !== textarea) return;
      const list = suggestionsRef.current;
      if (!list.length) return;
      let index = highlightRef.current;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp": {
          e.preventDefault();
          e.stopPropagation();
          const dir = e.key === "ArrowDown" ? 1 : -1;
          index = (index + dir + list.length) % list.length;
          setHighlight(index);
          return;
        }
        case "Enter":
        case "Tab":
          e.preventDefault();
          e.stopPropagation();
          commit(list[index]);
          return;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          setToken(null);
          return;
        default:
          // Any printable key just falls through; the input listener above
          // recomputes the token and the filter updates live.
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // commit is recreated per render; the listener is only attached while
    // open, so re-attaching with the fresh closure is correct.
  });

  if (!open || !textarea) return null;

  return (
    <div
      role="listbox"
      aria-label="Tag suggestions"
      className={cn(
        "absolute left-2 right-2 bottom-[var(--ot-bottom-inset,72px)] z-30",
        "mx-auto max-w-md rounded-xl border border-border/60 bg-popover/95 backdrop-blur",
        "p-1 shadow-lg shadow-black/10 animate-in fade-in slide-in-from-bottom-1 duration-150",
      )}
    >
      {suggestions.map((tag, i) => (
        <button
          key={tag}
          type="button"
          role="option"
          aria-selected={i === highlight}
          onMouseDown={(e) => {
            // Prevent the textarea blur — otherwise the caret and the
            // token just cleared are gone before the click commits.
            e.preventDefault();
          }}
          onClick={() => commit(tag)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[13px]",
            "text-foreground/90",
            i === highlight && "bg-accent text-accent-foreground",
          )}
        >
          <span className="text-accent font-semibold">#</span>
          <span className="truncate">{tag}</span>
        </button>
      ))}
    </div>
  );
});
