"use client";

import { Plus, X } from "lucide-react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useRef,
  useState,
} from "react";

// props type
interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

/**
 * Compact tag input: chips inline with the input, and tapping a suggestion
 * appends it — no dropdown that fights the keyboard for screen space.
 *
 * Tag grammar is unchanged: lowercase, comma or Enter commits, Backspace on
 * an empty field pops the last chip, double-click a chip to edit it.
 */
export function TagInput({ value, onChange, suggestions }: Props) {
  const [input, setInput] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and existing tags
  const filteredSuggestions = suggestions.filter(
    (sug) =>
      input.length > 0 &&
      sug.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(sug),
  );

  const showSuggestions = input.trim() !== "" && filteredSuggestions.length > 0;

  // Add a new tag — duplicates are silently ignored, they carry no information
  function addTag(tag: string) {
    const newTag = tag.trim().toLowerCase();
    if (!newTag || value.includes(newTag)) return;
    onChange([...value, newTag]);
    setInput("");
    setHighlightedIndex(-1);
  }

  // Remove a tag by index
  function removeTag(index: number) {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  }

  // Update an existing tag
  function updateTag(index: number, newTag: string) {
    const newTags = [...value];
    newTags[index] = newTag;
    onChange(newTags);
  }

  // Handle key events inside the input
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const hasSuggestions = filteredSuggestions.length > 0;

    if ((e.key === "Enter" || e.key === ",") && input.trim() !== "") {
      e.preventDefault();
      if (highlightedIndex >= 0 && hasSuggestions) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else {
        addTag(input);
      }
    }

    // Navigate suggestions
    if (e.key === "ArrowDown" && hasSuggestions) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
      );
    }

    if (e.key === "ArrowUp" && hasSuggestions) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
      );
    }

    // Delete last tag on backspace if input is empty
    if (e.key === "Backspace" && input.trim() === "") {
      if (value.length > 0) {
        const newTags = [...value];
        newTags.pop();
        onChange(newTags);
      }
    }
  }

  // Save tag when editing and press Enter
  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditedTag(index);
    }
  }

  // Finalize edited tag
  function saveEditedTag(index: number) {
    const newTag = value[index].trim();
    if (!newTag) {
      removeTag(index);
      return;
    }
    updateTag(index, newTag);
    setEditingIndex(null);
  }

  // Focus input when container is clicked except its own buttons/inputs
  function handleContainerClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target instanceof HTMLInputElement) return;
    inputRef.current?.focus();
  }

  // Handle blur to commit an in-progress edit
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (
      e.relatedTarget &&
      (e.currentTarget as Node).contains(e.relatedTarget as Node)
    ) {
      return;
    }
    if (editingIndex !== null) {
      saveEditedTag(editingIndex);
    }
    setHighlightedIndex(-1);
  }

  return (
    <div
      className="relative flex cursor-text flex-col rounded-2xl border border-border/60 bg-background/50 transition-colors focus-within:border-ring/60 focus-within:bg-background"
      onClick={handleContainerClick}
      onBlur={handleBlur}
      tabIndex={-1}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-1.5 p-1.5">
        {/* Render tags */}
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="flex h-7 items-center gap-0.5 rounded-full bg-muted pl-2.5 pr-1 text-xs font-medium"
          >
            {editingIndex === index ? (
              <input
                ref={editInputRef}
                size={Math.max(2, tag.length)}
                className="w-auto min-w-8 bg-transparent text-xs outline-none"
                value={tag}
                autoFocus
                onChange={(e) => updateTag(index, e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, index)}
                onBlur={() => saveEditedTag(index)}
                aria-label={`Edit tag ${tag}`}
              />
            ) : (
              <span
                className="select-none cursor-text"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingIndex(index);
                }}
                title="Double-tap to edit"
              >
                {tag}
              </span>
            )}
            {/* Remove tag button */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              aria-label={`Remove tag ${tag}`}
              title={`Remove tag ${tag}`}
              className="-ml-0.5 cursor-pointer rounded-full bg-foreground/10 p-0.5 transition-colors hover:bg-foreground/20"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        {/* Input field */}
        <div className="flex min-w-28 flex-1 items-center gap-1.5">
          <Plus className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <input
            enterKeyHint="done"
            autoCapitalize="none"
            ref={inputRef}
            className="h-8 min-w-8 flex-1 bg-transparent py-1 text-sm outline-none"
            placeholder={value.length === 0 ? "Add tags…" : ""}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            name="tags"
            id="tag-input"
            autoComplete="off"
            aria-label="Add tag"
          />
        </div>
      </div>

      {/* Suggestion strip — label above a compact row of chips */}
      {showSuggestions && (
        <div className="border-t border-border/60 px-3 pb-2 pt-2">
          <div className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Suggestions
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {filteredSuggestions.slice(0, 8).map((sug, i) => (
              <button
                key={sug}
                type="button"
                role="option"
                aria-selected={i === highlightedIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  addTag(sug);
                }}
                className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
                  i === highlightedIndex
                    ? "border-ring/60 bg-accent text-accent-foreground"
                    : "border-border/60"
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
