package io.github.nextpointer.n0t3s.widget;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Single source of truth for what the home-screen widget shows.
 *
 * The WebView owns the note data (IndexedDB), so the JS side pushes a
 * newest-first snapshot here through the N0t3sNative plugin; the widget
 * provider renders straight from these preferences — even with no app
 * process alive.
 */
public final class WidgetStore {

    private static final String PREFS = "n0t3s_widget";
    private static final String KEY_NOTES = "notes";
    private static final String KEY_TOTAL = "total";

    private WidgetStore() {}

    public static void save(Context context, String notesJson, int total) {
        SharedPreferences.Editor editor =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        editor.putString(KEY_NOTES, notesJson);
        editor.putInt(KEY_TOTAL, total);
        editor.apply();
        NotesWidgetProvider.updateAll(context);
    }

    public static String loadNotes(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_NOTES, "[]");
    }

    public static int loadTotal(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getInt(KEY_TOTAL, 0);
    }

    public static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_NOTES)
            .remove(KEY_TOTAL)
            .apply();
    }
}
