"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { markdownActions } from "overtype";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  EyeIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  PencilIcon,
  PlainTextIcon,
  QuoteIcon,
  TaskListIcon,
} from "@/components/icons/EditorIcons";
import { Cross } from "@/components/icons/Cross";
import { Zen } from "@/components/icons/Zen";import { cn } from "@/lib/utils";
import {
  autoSaveAtom,
  saveLoadingAtom,
  unsavedAtom,
  zenMode,
  persistZenMode,
} from "@/store/noteAtom";

/** Minimal shape of the OverType instance this toolbar drives. */
export interface ToolbarEditor {
  textarea: HTMLTextAreaElement;
  performAction(actionId: string): Promise<boolean>;
}

export type ViewMode = "edit" | "plain" | "preview";

const VIEW_MODES: Record<
  ViewMode,
  { label: string; Icon: (props: { className?: string }) => React.ReactElement }
> = {
  edit: { label: "Edit", Icon: PencilIcon },
  plain: { label: "Raw", Icon: PlainTextIcon },
  preview: { label: "Preview", Icon: EyeIcon },
};

interface ToolbarButtonSpec {
  name: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** OverType action id from `defaultToolbarButtons` (drives shortcuts too) */
  actionId: string;
  /** Key in the `markdownActions.getActiveFormats()` result */
  format?: string;
}

const GROUPS: ToolbarButtonSpec[][] = [
  [
    { name: "bold", label: "Bold (Ctrl+B)", Icon: BoldIcon, actionId: "toggleBold", format: "bold" },
    { name: "italic", label: "Italic (Ctrl+I)", Icon: ItalicIcon, actionId: "toggleItalic", format: "italic" },
    { name: "code", label: "Inline code", Icon: CodeIcon, actionId: "toggleCode" },
  ],
  [
    { name: "h1", label: "Heading 1", Icon: () => <span className="text-[13px] leading-none font-semibold">H1</span>, actionId: "toggleH1", format: "header" },
    { name: "h2", label: "Heading 2", Icon: () => <span className="text-[13px] leading-none font-semibold">H2</span>, actionId: "toggleH2", format: "header-2" },
    { name: "h3", label: "Heading 3", Icon: () => <span className="text-[13px] leading-none font-semibold">H3</span>, actionId: "toggleH3", format: "header-3" },
  ],
  [
    { name: "bulletList", label: "Bullet list", Icon: BulletListIcon, actionId: "toggleBulletList", format: "bullet-list" },
    { name: "orderedList", label: "Numbered list", Icon: OrderedListIcon, actionId: "toggleNumberedList", format: "numbered-list" },
    { name: "taskList", label: "Task list", Icon: TaskListIcon, actionId: "toggleTaskList", format: "task-list" },
    { name: "quote", label: "Quote", Icon: QuoteIcon, actionId: "toggleQuote", format: "quote" },
  ],
  [{ name: "link", label: "Insert link (Ctrl+K)", Icon: LinkIcon, actionId: "insertLink" }],
];

interface EditorToolbarProps {
  editor: ToolbarEditor | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /**
   * Phones only: the keyboard is covering the screen. The bottom action bar
   * hides behind the keyboard, so its remaining actions (read, zen, save)
   * are hosted here instead — see NoteActions, which hides on this state.
   */
  mobileVisible?: boolean;
}

export const EditorToolbar = memo(function EditorToolbar({
  editor,
  viewMode,
  onViewModeChange,
  mobileVisible = false,
}: EditorToolbarProps) {
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  // Cheap guard so we don't setState on every selection tick.
  const activeRef = useRef<string[]>([]);

  const zen = useAtomValue(zenMode);
  const autoSave = useAtomValue(autoSaveAtom);
  const unsaved = useAtomValue(unsavedAtom);
  const loading = useAtomValue(saveLoadingAtom);
  const setZenMode = useSetAtom(zenMode);

  const refreshActiveFormats = useCallback(() => {
    if (!editor?.textarea) return;
    const next = markdownActions.getActiveFormats(editor.textarea);
    const prev = activeRef.current;
    if (
      next.length === prev.length &&
      next.every((f, i) => f === prev[i])
    ) {
      return;
    }
    activeRef.current = next;
    setActiveFormats(next);
  }, [editor]);

  useEffect(() => {
    if (!editor?.textarea) return;
    const el = editor.textarea;
    refreshActiveFormats();
    el.addEventListener("input", refreshActiveFormats);
    el.addEventListener("keyup", refreshActiveFormats);
    el.addEventListener("click", refreshActiveFormats);
    el.addEventListener("focus", refreshActiveFormats);
    document.addEventListener("selectionchange", refreshActiveFormats);
    return () => {
      el.removeEventListener("input", refreshActiveFormats);
      el.removeEventListener("keyup", refreshActiveFormats);
      el.removeEventListener("click", refreshActiveFormats);
      el.removeEventListener("focus", refreshActiveFormats);
      document.removeEventListener("selectionchange", refreshActiveFormats);
    };
  }, [editor, refreshActiveFormats]);

  // Only meaningful in edit/raw mode, where the caret exists.
  useEffect(() => {
    if (viewMode !== "preview") refreshActiveFormats();
  }, [viewMode, refreshActiveFormats]);

  const run = useCallback(
    (actionId: string) => {
      if (!editor) return;
      // performAction() focuses the textarea for us, which keeps the caret.
      void editor.performAction(actionId).then(refreshActiveFormats);
    },
    [editor, refreshActiveFormats],
  );

  const switchView = useCallback(
    (mode: ViewMode) => {
      // NoteContent owns the editor switch so the keyboard shortcut and the
      // command palette go through exactly the same path.
      onViewModeChange(mode);
    },
    [onViewModeChange],
  );

  const handleToggleZen = useCallback(() => {
    setZenMode((prev) => {
      const next = !prev;
      persistZenMode(next);
      return next;
    });
  }, [setZenMode]);

  const handleSave = useCallback(() => {
    // The note page owns the actual save routine and mirrors it on this
    // window event (the command palette uses the same channel).
    window.dispatchEvent(new CustomEvent("note:save"));
  }, []);

  const CurrentIcon = VIEW_MODES[viewMode].Icon;
  const previewing = viewMode === "preview";

  return (
    <div
      role="toolbar"
      aria-label="Formatting toolbar"
      data-mobile-visible={mobileVisible || undefined}
      className="note-toolbar flex w-full items-center gap-0.5 px-1.5 py-1"
    >
      {/* Formatting strip — the only scrollable part, so the pinned controls
          on the right never slide out of reach on narrow phones. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex shrink-0 items-center gap-1">
            {gi > 0 && (
              <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />
            )}
            {group.map((spec) => {
              const isActive = spec.format ? activeFormats.includes(spec.format) : false;
              return (
                <Button
                  key={spec.name}
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={spec.label}
                  aria-label={spec.label}
                  aria-pressed={spec.format ? isActive : undefined}
                  data-active={isActive || undefined}
                  disabled={!editor}
                  // Keep the caret: without this the textarea blurs and the
                  // selection that markdown-actions reads is lost.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run(spec.actionId)}
                  className={cn(
                    "size-8 rounded-md text-muted-foreground transition-colors duration-150 ease-out motion-reduce:transition-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    "data-[active]:bg-accent data-[active]:text-accent-foreground",
                    "disabled:opacity-50",
                  )}
                >
                  <spec.Icon className="size-4" />
                </Button>
              );
            })}
          </div>
        ))}
      </div>

      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`View: ${VIEW_MODES[viewMode].label}`}
            aria-label={`View mode: ${VIEW_MODES[viewMode].label}`}
            onMouseDown={(e) => e.preventDefault()}
            className="size-8 shrink-0 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-accent-foreground"
          >
            <CurrentIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 rounded-xl">
          <DropdownMenuRadioGroup
            value={viewMode}
            onValueChange={(v) => switchView(v as ViewMode)}
          >
            {(Object.keys(VIEW_MODES) as ViewMode[]).map((mode) => {
              const { label, Icon } = VIEW_MODES[mode];
              return (
                <DropdownMenuRadioItem
                  key={mode}
                  value={mode}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Keyboard-open actions — the bottom bar is hidden, these replace it. */}
      {mobileVisible && (
        <>
          <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={previewing ? "Back to editing" : "Read mode (Ctrl+/)"}
            aria-label={previewing ? "Back to editing" : "Toggle read mode"}
            aria-pressed={previewing}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => switchView(previewing ? "edit" : "preview")}
            className={cn(
              "size-8 shrink-0 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-accent-foreground",
              previewing && "text-foreground",
            )}
          >
            <EyeIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={zen ? "Exit zen mode (Ctrl+Shift+Z)" : "Zen mode (Ctrl+Shift+Z)"}
            aria-label={zen ? "Exit zen mode" : "Enter zen mode"}
            aria-pressed={zen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleZen}
            className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {zen ? <Cross className="size-4" /> : <Zen className="size-4" />}
          </Button>

          {/* Only shows while there is something to save — a permanently
              disabled Save in a small strip is noise. */}
          {!autoSave && unsaved && (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSave}
              className="h-7 shrink-0 rounded-full px-3 text-xs"
            >
              {loading ? (
                <>
                  <Loader size="xs" variant="secondary" className="mr-1.5" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
});
