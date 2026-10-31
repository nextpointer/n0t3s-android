"use client";

import { useCallback, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { Check, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { notePreview, relativeTime } from "@/lib/text";

type Props = {
  note: Note;
  onClick: () => void;
  /** Selection mode comes from a long-press anywhere in the list. */
  selectMode?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
  onLongPress?: (id: string) => void;
  /** Every row draws an inset hairline up to (but not including) the last. */
  isLast?: boolean;
};

/** How long a press must be held before it becomes a selection. */
const LONG_PRESS_MS = 450;

/** Row height is FIXED so the virtualizer's math and the DOM agree. */
export const NOTE_ROW_HEIGHT = 76;

const NoteCard = ({
  note,
  onClick,
  selectMode = false,
  selected = false,
  onSelectToggle,
  onLongPress,
  isLast = false,
}: Props) => {
  const isPinned = note.tags?.includes("pin");
  const otherTags = note.tags?.filter((t) => t !== "pin") ?? [];
  const preview = notePreview(note.content);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set when the hold fires; the click that follows the lift is swallowed so
  // a long-press never also opens (or toggles) the row.
  const longFired = useRef(false);

  const clearPress = useCallback(() => {
    if (pressTimer.current !== undefined) {
      clearTimeout(pressTimer.current);
      pressTimer.current = undefined;
    }
  }, []);

  useEffect(() => clearPress, [clearPress]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!selectMode && !onLongPress) return;
    longFired.current = false;
    clearPress();
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      navigator.vibrate?.(8);
      onLongPress?.(note.id);
    }, LONG_PRESS_MS);
  };

  const handleActivate = () => {
    if (longFired.current) {
      longFired.current = false;
      return;
    }
    if (selectMode) {
      onSelectToggle?.(note.id);
      return;
    }
    onClick();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      onClick={handleActivate}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      role="button"
      aria-pressed={selectMode ? selected : undefined}
      tabIndex={0}
      style={{ height: NOTE_ROW_HEIGHT }}
      className={cn(
        // System typography (SF/Roboto/Segoe) with careful tracking; the
        // rest of the app keeps the Space Grotesk brand voice.
        "font-native group relative flex w-full cursor-pointer select-none items-center",
        "px-3.5 sm:px-4",
        "transition-colors duration-150 ease-out motion-reduce:transition-none",
        "hover:bg-muted/70 active:bg-muted",
        "focus-visible:outline-none focus-visible:bg-muted/70",
        selected && "bg-primary/10 hover:bg-primary/15",
      )}
    >
      {/* Selection indicator — only while picking notes to delete */}
      {selectMode && (
        <span
          aria-hidden
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-foreground/25",
          )}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      )}

      {/* Title + first line of the note body, iOS-two-line style */}
      <div className="min-w-0 flex-1 overflow-hidden pr-2">
        <h3
          className={cn(
            "truncate text-[15px] font-semibold leading-[1.25] tracking-[-0.012em] text-foreground",
            note.title || "text-muted-foreground",
          )}
        >
          {note.title || "Untitled"}
        </h3>
        <p className="mt-[3px] flex items-center gap-1.5 truncate text-[12.5px] leading-[1.35] text-muted-foreground/75">
          {preview && <span className="truncate">{preview}</span>}
          {preview && otherTags.length > 0 && <span aria-hidden>·</span>}
          {otherTags.length > 0 && (
            <span className="shrink-0 truncate text-primary/60">
              {otherTags.map((t) => `#${t}`).join("  ")}
            </span>
          )}
        </p>
      </div>

      {/* Trailing date + pin column, like the iOS list rows */}
      <div className="flex shrink-0 flex-col items-end justify-center gap-[5px] self-stretch py-2">
        <time
          dateTime={new Date(note.updatedAt).toISOString()}
          className="whitespace-nowrap text-[11px] font-medium tabular-nums leading-none text-muted-foreground/55"
        >
          {relativeTime(note.updatedAt)}
        </time>
        {isPinned && (
          <Pin
            aria-label="Pinned"
            className="size-3.5 rotate-45 text-primary/90"
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </div>

      {/* Inset hairline, aligned with the row's text column */}
      {!isLast && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3.5 bottom-0 h-px bg-border sm:inset-x-4"
        />
      )}
    </div>
  );
};

export default NoteCard;
