"use client";

import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Note } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSetAtom } from "jotai";
import {
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  zenMode,
  persistZenMode,
} from "@/store/noteAtom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  EyeIcon,
  HelpCircleIcon,
  PlusIcon,
  SaveIcon,
  SettingsIcon,
  TrashIcon,
  DownloadIcon,
  ContrastIcon,
  Columns2Icon,
} from "lucide-react";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  notes: Note[];
  /**
   * Id of the note currently open, or null on pages without one. Commands
   * scoped to a note (save, delete, export, zen) are hidden when null,
   * because they act on an open note and would silently do nothing here.
   */
  noteId?: string | null;
}

interface Item {
  id: string;
  label: string;
  /** Searchable hidden text (e.g. the export format name). */
  keywords?: string;
  shortcut: string;
  kind: "action" | "tag" | "note";
  tag?: string;
  noteId?: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** "note" = only offered while a note is open. */
  scope?: "global" | "note";
}

/**
 * Every action the app can do, reachable from one place. The palette opens
 * with Ctrl+P, the list-page search button or the note-page search button.
 */
const COMMANDS: Item[] = [
  { id: "new", label: "New note", shortcut: "", kind: "action", scope: "global", icon: PlusIcon },
  { id: "save", label: "Save note", shortcut: "⌘S", kind: "action", scope: "note", icon: SaveIcon },
  { id: "export", label: "Export this note", shortcut: "", kind: "action", scope: "note", keywords: "download", icon: DownloadIcon },
  { id: "delete", label: "Delete this note", shortcut: "", kind: "action", scope: "note", icon: TrashIcon },
  { id: "readmode", label: "Read this note", shortcut: "⌘/", kind: "action", scope: "note", keywords: "preview", icon: EyeIcon },
  { id: "zen", label: "Zen mode", shortcut: "⌘⇧Z", kind: "action", scope: "note", icon: Columns2Icon },
  { id: "help", label: "Help and shortcuts", shortcut: "?", kind: "action", scope: "global", icon: HelpCircleIcon },
  { id: "settings", label: "Open settings", shortcut: "", kind: "action", scope: "note", icon: SettingsIcon },
  { id: "theme", label: "Switch theme", shortcut: "", kind: "action", scope: "global", keywords: "dark light", icon: ContrastIcon },
];

function match(q: string, t: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return t.toLowerCase().includes(needle);
}

export const CommandMenu = React.memo(function CommandMenu({
  open,
  setOpen,
  notes,
  noteId = null,
}: Props) {
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const { setTheme } = useTheme();
  const setDeleteOpen = useSetAtom(deleteDialogOpenAtom);
  const setExportOpen = useSetAtom(exportDialogOpenAtom);
  const setZenMode = useSetAtom(zenMode);

  // Global keybind
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [setOpen]);

  // Build items once
  const allItems = useMemo<Item[]>(() => {
    const commands = COMMANDS.filter(
      (c) => c.scope !== "note" || Boolean(noteId),
    );
    const tagSet = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t) => tagSet.add(t)));
    const tags = Array.from(tagSet).sort();
    const tagItems: Item[] = tags.map((t) => ({
      id: `tag:${t}`,
      label: t,
      shortcut: "",
      kind: "tag",
      tag: t,
    }));
    const noteItems: Item[] = [...notes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((n) => ({
        id: `note:${n.id}`,
        label: n.title || "Untitled",
        shortcut: "",
        kind: "note",
        noteId: n.id,
        sub: n.content?.slice(0, 60).replace(/[#*`\n]/g, " ").trim(),
      }));
    return [...commands, ...tagItems, ...noteItems];
  }, [notes, noteId]);

  // Filter (shouldFilter is off — cmdk only handles selection here, so items
  // with content-based matches such as note previews stay searchable).
  const q = query.toLowerCase();
  const filtered = useMemo(
    () =>
      allItems.filter(
        (i) =>
          !q ||
          match(q, i.label) ||
          (i.keywords && match(q, i.keywords)) ||
          Boolean(i.tag && match(q, i.tag)) ||
          Boolean(i.sub && match(q, i.sub)),
      ),
    [allItems, q],
  );

  const actions = filtered.filter((i) => i.kind === "action");
  const tags = filtered.filter((i) => i.kind === "tag");
  const noteEntries = filtered.filter((i) => i.kind === "note");

  // Run action
  const run = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "note" && item.noteId) {
        router.push(`/note/?id=${item.noteId}`);
        return;
      }
      if (item.kind === "tag" && item.tag) {
        router.push(`/?tag=${item.tag}`);
        return;
      }
      switch (item.id) {
        case "new": {
          import("@/lib/storage").then(async ({ createNote }) => {
            const note = await createNote();
            router.push(`/note/?id=${note.id}`);
          });
          break;
        }
        case "save":
          window.dispatchEvent(new CustomEvent("note:save"));
          break;
        case "delete":
          setDeleteOpen(true);
          break;
        case "export":
          setExportOpen(true);
          break;
        case "help":
          router.push("/help");
          break;
        case "settings":
          window.dispatchEvent(new CustomEvent("app:open-settings"));
          break;
        case "theme": {
          // Flip between light and dark, ignoring "system" so the command
          // always does something visible.
          const dark = document.documentElement.classList.contains("dark");
          setTheme(dark ? "light" : "dark");
          break;
        }
        case "zen":
          setZenMode((p) => {
            const n = !p;
            persistZenMode(n);
            return n;
          });
          break;
        case "readmode":
          window.dispatchEvent(new CustomEvent("note:readmode"));
          break;
      }
    },
    [router, setOpen, setDeleteOpen, setExportOpen, setZenMode, setTheme],
  );

  const renderItem = (item: Item) => (
    <CommandItem key={item.id} value={item.id} onSelect={() => run(item)}>
      {item.icon && (
        <item.icon className="shrink-0 size-4 text-muted-foreground/60" />
      )}
      <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
        <span className="truncate">{item.label}</span>
        {item.kind === "tag" && (
          <span className="text-xs text-muted-foreground/40">#{item.tag}</span>
        )}
      </span>
      {item.shortcut && (
        <CommandShortcut className="hidden sm:inline">
          {item.shortcut}
        </CommandShortcut>
      )}
    </CommandItem>
  );

  const renderNoteItem = (item: Item) => (
    <CommandItem
      key={item.id}
      value={item.id}
      onSelect={() => run(item)}
      className="py-2"
    >
      <span className="flex min-w-0 flex-col overflow-hidden">
        <span className="truncate text-sm">{item.label}</span>
        {item.sub && (
          <span className="truncate text-xs text-muted-foreground/40">
            {item.sub}
          </span>
        )}
      </span>
    </CommandItem>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" showCloseButton={false} className="p-0 gap-0">
        {/* Radix demands a title/description for the announcement layer. */}
        <SheetTitle className="sr-only">Command menu</SheetTitle>
        <SheetDescription className="sr-only">
          Search notes, tags and app commands
        </SheetDescription>
        <Command shouldFilter={false} loop className="pt-1.5 pb-2">
          <div className="border-b px-4">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search notes, tags and commands…"
              enterKeyHint="done"
            />
          </div>
          <CommandList>
            <CommandEmpty>
              {`No matches for “${query}”`}
            </CommandEmpty>
            {actions.length > 0 && (
              <CommandGroup heading="Actions">{actions.map(renderItem)}</CommandGroup>
            )}
            {tags.length > 0 && (
              <CommandGroup heading="Tags">{tags.map(renderItem)}</CommandGroup>
            )}
            {noteEntries.length > 0 && (
              <CommandGroup heading="Notes">
                {noteEntries.map(renderNoteItem)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <div className="border-t px-4 pt-2 text-[10px] tracking-widest text-muted-foreground/30 hidden sm:flex items-center gap-3 uppercase">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </SheetContent>
    </Sheet>
  );
});
