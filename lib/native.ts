import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Note } from "@/lib/types";
import { getNotes } from "@/lib/storage";
import { relativeTime } from "@/lib/text";

/**
 * Bridge to the in-app Capacitor plugin on Android (`N0t3sNativePlugin`).
 * Everything here no-ops in the browser so page code can stay simple.
 */

export interface WidgetNote {
  id: string;
  title: string;
  time: string;
}

interface N0t3sNativePlugin {
  /** Push the latest notes snapshot to the home-screen widget. */
  updateWidget(options: { notes: WidgetNote[]; total: number }): Promise<void>;
  /** Post a local notification. Returns whether it was actually shown. */
  showNotification(options: {
    id?: number;
    title: string;
    body?: string;
  }): Promise<{ shown: boolean; reason?: string | null }>;
  cancelNotification(options?: { id?: number }): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
}

export const IS_NATIVE_ANDROID =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const N0t3sNative = registerPlugin<N0t3sNativePlugin>("N0t3sNative");

/** Rows the widget can render in its expanded 4×2 shape. */
const WIDGET_ROWS = 3;

/* ------------------------------------------------------------------ *
 * Widget sync
 * ------------------------------------------------------------------ */

/** Newest-first snapshot for the widget; pinned status isn't needed there. */
export function syncWidget(notes: Note[]): void {
  if (!IS_NATIVE_ANDROID) return;
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const payload = sorted
    .slice(0, WIDGET_ROWS)
    .map((n) => ({
      id: n.id,
      title: n.title || "Untitled",
      time: relativeTime(n.updatedAt),
    }));
  void N0t3sNative.updateWidget({ notes: payload, total: sorted.length }).catch(() => {});
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Debounced widget refresh used after storage mutations — autosave fires
 * once per second while typing, so the widget only refreshes 1.2s after the
 * last write.
 */
export function refreshWidgetSoon(): void {
  if (!IS_NATIVE_ANDROID) return;
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    getNotes().then((notes) => syncWidget(notes));
  }, 1200);
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

/** Features can reuse one notification slot and replace it in place. */
export const UNSAVED_REMINDER_ID = 42;

export function showNotification(options: {
  id?: number;
  title: string;
  body?: string;
}): void {
  if (!IS_NATIVE_ANDROID) return;
  void N0t3sNative.showNotification(options).catch(() => {});
}

export function cancelNotification(id = UNSAVED_REMINDER_ID): void {
  if (!IS_NATIVE_ANDROID) return;
  void N0t3sNative.cancelNotification({ id }).catch(() => {});
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!IS_NATIVE_ANDROID) return false;
  try {
    const { granted } = await N0t3sNative.requestNotificationPermission();
    return granted;
  } catch {
    return false;
  }
}

const NOTIF_ASKED_KEY = "n0t3s:notif-asked";

/** Ask for POST_NOTIFICATIONS once, on first native launch, quietly. */
export function askForNotificationPermissionOnce(): void {
  if (!IS_NATIVE_ANDROID) return;
  try {
    if (localStorage.getItem(NOTIF_ASKED_KEY)) return;
    localStorage.setItem(NOTIF_ASKED_KEY, "1");
  } catch {
    return;
  }
  void requestNotificationPermission();
}
