"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Settings, Download, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  autoSaveAtom,
  previewColorsAtom,
  editorFontSizeAtom,
  toolbarEnabledAtom,
  persistAutoSave,
  persistPreviewColors,
  persistEditorFontSize,
  persistToolbarEnabled,
  tagsAtom,
  checkUnsavedAtom,
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  viewModeAtom,
  type ViewMode,
} from "@/store/noteAtom";
import { cn } from "@/lib/utils";

/**
 * One shared class for every setting row: consistent height, spacing and
 * hover behaviour, so switches, sliders and action rows read as one list.
 */
const SETTING_ROW = "flex min-h-11 items-center justify-between gap-4";

type ThemeChoice = "light" | "dark" | "system";

const ThemePicker = memo(function ThemePicker() {
  const { theme, setTheme } = useTheme();

  const options: { value: ThemeChoice; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex w-full rounded-full bg-muted p-0.5"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex-1 cursor-pointer rounded-full py-1 text-xs font-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
            theme === value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
});

export const SettingsMenu = memo(function SettingsMenu() {
  const [open, setOpen] = useState(false);

  // The command palette opens this sheet from a window event — the palette
  // has no reference to this component.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("app:open-settings", handler);
    return () => window.removeEventListener("app:open-settings", handler);
  }, []);

  // GLOBAL — editor behaviour
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const [toolbarEnabled, setToolbarEnabled] = useAtom(toolbarEnabledAtom);
  const [previewColors, setPreviewColors] = useAtom(previewColorsAtom);
  const [fontSize, setFontSize] = useAtom(editorFontSizeAtom);

  const handleAutoSaveChange = useCallback((value: boolean) => {
    setAutoSave(value);
    persistAutoSave(value);
  }, [setAutoSave]);

  const handleToolbarChange = useCallback((value: boolean) => {
    setToolbarEnabled(value);
    persistToolbarEnabled(value);
  }, [setToolbarEnabled]);

  const handlePreviewColors = useCallback((value: boolean) => {
    setPreviewColors(value);
    persistPreviewColors(value);
  }, [setPreviewColors]);

  const handleFontSize = useCallback(
    (value: number) => {
      setFontSize(value);
      persistEditorFontSize(value);
    },
    [setFontSize],
  );

  // THIS NOTE
  const tags = useAtomValue(tagsAtom);
  const setTags = useSetAtom(tagsAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  const pinned = tags.includes("pin");
  const handlePin = useCallback(
    (checked: boolean) => {
      const next = checked
        ? [...tags, "pin"]
        : tags.filter((t) => t !== "pin");
      setTags(next);
      checkUnsaved();
    },
    [tags, setTags, checkUnsaved],
  );

  const handleReadMode = useCallback(
    (checked: boolean) => {
      setViewMode((checked ? "preview" : "edit") as ViewMode);
    },
    [setViewMode],
  );

  const setDeleteDialogOpen = useSetAtom(deleteDialogOpenAtom);
  const setExportDialogOpen = useSetAtom(exportDialogOpenAtom);

  // Chain the other sheets in: close this one, then the target opens from
  // its own atom.
  const openExport = useCallback(() => {
    setOpen(false);
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

  const openDelete = useCallback(() => {
    setOpen(false);
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>This note, and the whole app.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-1.5">
            <p className="pb-0.5 pl-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
              This note
            </p>

            <div className={SETTING_ROW}>
              <Label htmlFor="pin-note" className="text-sm">
                Pin to top
              </Label>
              <Switch
                id="pin-note"
                checked={pinned}
                onCheckedChange={handlePin}
              />
            </div>

            <div className={SETTING_ROW}>
              <div className="flex flex-col">
                <Label htmlFor="read-only" className="text-sm">
                  Read mode
                </Label>
                <span className="text-xs text-muted-foreground/70">
                  Rendered preview, no typing
                </span>
              </div>
              <Switch
                id="read-only"
                checked={viewMode === "preview"}
                onCheckedChange={handleReadMode}
              />
            </div>

            <button
              type="button"
              onClick={openExport}
              className={cn(SETTING_ROW, "w-full cursor-pointer rounded-lg px-1 text-left transition-colors hover:bg-accent/50")}
            >
              <Label className="text-sm">Export…</Label>
              <Download className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={openDelete}
              className={cn(SETTING_ROW, "w-full cursor-pointer rounded-lg px-1 text-left transition-colors hover:bg-destructive/10")}
            >
              <Label className="text-sm text-destructive">Delete note…</Label>
              <Trash2 className="size-4 text-destructive" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="pb-0.5 pl-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
              Global
            </p>

            <div className={SETTING_ROW}>
              <div className="flex flex-col">
                <Label htmlFor="auto-save" className="text-sm">
                  Auto save
                </Label>
                <span className="text-xs text-muted-foreground/70">
                  Save while you type, no button
                </span>
              </div>
              <Switch
                id="auto-save"
                checked={autoSave}
                onCheckedChange={handleAutoSaveChange}
              />
            </div>

            <div className={SETTING_ROW}>
              <div className="flex flex-col">
                <Label htmlFor="toolbar-enabled" className="text-sm">
                  Formatting bar
                </Label>
                <span className="text-xs text-muted-foreground/70">
                  Markdown buttons above the keyboard
                </span>
              </div>
              <Switch
                id="toolbar-enabled"
                checked={toolbarEnabled}
                onCheckedChange={handleToolbarChange}
              />
            </div>

            <div className={SETTING_ROW}>
              <div className="flex flex-col">
                <Label htmlFor="preview-colors" className="text-sm">
                  Colourful preview
                </Label>
                <span className="text-xs text-muted-foreground/70">
                  Headings and emphasis keep their colours when reading
                </span>
              </div>
              <Switch
                id="preview-colors"
                checked={previewColors}
                onCheckedChange={handlePreviewColors}
              />
            </div>

            <div className="py-2">
              <div className="flex items-center justify-between px-1">
                <Label htmlFor="font-size" className="text-sm">
                  Editor size
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {fontSize}px
                </span>
              </div>
              <input
                id="font-size"
                type="range"
                min={12}
                max={22}
                step={1}
                value={fontSize}
                onChange={(e) => handleFontSize(Number(e.target.value))}
                aria-label="Editor font size in pixels"
                title="Editor font size"
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary
                           [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform
                           hover:[&::-webkit-slider-thumb]:scale-110
                           [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
              />
            </div>

            <div className="pb-1">
              <p className="mb-1.5 px-1 text-xs text-muted-foreground">
                Appearance
              </p>
              <ThemePicker />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
