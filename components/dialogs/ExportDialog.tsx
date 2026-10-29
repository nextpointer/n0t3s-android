"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { exportDialogOpenAtom, currentNoteAtom } from "@/store/noteAtom";
import toast from "react-hot-toast";
import { FileText, FileJson, FileDown } from "lucide-react";

const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", hint: "Coming soon", icon: FileDown, disabled: true },
  { id: "json", label: "JSON export", hint: ".json", icon: FileJson, disabled: false },
  { id: "markdown", label: "Markdown export", hint: ".md", icon: FileText, disabled: false },
] as const;

export const ExportDialog = memo(function ExportDialog() {
  const [open, setOpen] = useAtom(exportDialogOpenAtom);
  const note = useAtomValue(currentNoteAtom);

  const handleExport = useCallback(
    async (format: "pdf" | "json" | "markdown") => {
      if (!note) return;

      try {
        if (format === "pdf") {
          // await generateNotePDF(note);
          toast.error("PDF export coming soon");
          return;
        }

        if (format === "json") {
          const blob = new Blob([JSON.stringify(note, null, 2)], {
            type: "application/json",
          });
          downloadBlob(blob, `${sanitizeFilename(note.title)}.json`);
        } else {
          const markdown = `# ${note.title || "Untitled"}\n\n${note.content || ""}`;
          const blob = new Blob([markdown], { type: "text/markdown" });
          downloadBlob(blob, `${sanitizeFilename(note.title)}.md`);
        }

        toast.success(`Exported as ${format.toUpperCase()}`);
        setOpen(false);
      } catch (error) {
        console.error("Export failed:", error);
        toast.error("Failed to export note");
      }
    },
    [note, setOpen],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Export note</SheetTitle>
          <SheetDescription>
            Save “{note?.title || "Untitled"}” to your device.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1">
          {EXPORT_FORMATS.map(({ id, label, hint, icon: Icon, disabled }) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => handleExport(id as "pdf" | "json" | "markdown")}
              className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{label}</span>
              <span className="font-mono text-[11px] text-muted-foreground/60">
                {hint}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
});

function sanitizeFilename(title?: string): string {
  return (title || "note")
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
