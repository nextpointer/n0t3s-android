"use client";

import { useCallback, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { Check, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  note: Note;
  onClick: () => void;
  /** Selection mode comes from a long-press anywhere in the list. */
  selectMode?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
  onLongPress?: (id: string) => void;
};

/** How long a press must be held before it becomes a selection. */
const LONG_PRESS_MS = 450;

/** Row height is FIXED so the virtualizer's math and the DOM agree. */
export const NOTE_ROW_HEIGHT = 64;

function relativeTime(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const NoteCard = ({
  note,
  onClick,
  selectMode = false,
  selected = false,
  onSelectToggle,
  onLongPress,
}: Props) => {
  const isPinned = note.tags?.includes("pin");
  const otherTags = note.tags?.filter((t) => t !== "pin") ?? [];

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
        "group relative flex w-full cursor-pointer select-none items-center gap-3 px-3 sm:px-4",
        "border-b border-border/40",
        "transition-colors duration-150 ease-out motion-reduce:transition-none",
        "hover:bg-accent/50 active:bg-accent",
        "focus-visible:outline-none focus-visible:bg-accent/60",
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
              : "border-foreground/30",
          )}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      )}

      <div className="min-w-0 flex-1 overflow-hidden">
        <h3 className="truncate text-[15px] font-medium leading-tight text-foreground">
          {note.title || "Untitled"}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] leading-tight text-muted-foreground/60">
          <time dateTime={new Date(note.updatedAt).toISOString()}>
            {relativeTime(note.updatedAt)}
          </time>
          {otherTags.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">
                {otherTags.map((t) => `#${t}`).join(" ")}
              </span>
            </>
          )}
        </p>
      </div>

      {isPinned && (
        <Pin
          aria-label="Pinned"
          className="size-3.5 shrink-0 rotate-45 text-primary"
          fill="currentColor"
        />
      )}
    </div>
  );
};

export default NoteCard;
