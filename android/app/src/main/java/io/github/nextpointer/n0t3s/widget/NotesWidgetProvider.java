package io.github.nextpointer.n0t3s.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import io.github.nextpointer.n0t3s.MainActivity;
import io.github.nextpointer.n0t3s.R;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Notes widget: brand header + the most recent note titles, tap a note to
 * open it, or "New note" to start writing. Taps send `n0t3s://` deep links
 * to MainActivity, which Capacitor turns into appUrlOpen events for the
 * web router.
 */
public class NotesWidgetProvider extends AppWidgetProvider {

    private static final int[] ROW_IDS = {
        R.id.widget_note_0,
        R.id.widget_note_1,
        R.id.widget_note_2,
    };

    private static final int[] ROW_TITLE_IDS = {
        R.id.widget_note_0_title,
        R.id.widget_note_1_title,
        R.id.widget_note_2_title,
    };

    private static final int[] ROW_TIME_IDS = {
        R.id.widget_note_0_time,
        R.id.widget_note_1_time,
        R.id.widget_note_2_time,
    };

    private static final int REQUEST_PLAIN = 20;
    private static final int REQUEST_NEW_NOTE = 21;
    private static final int REQUEST_ROW_BASE = 30;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            render(context, manager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(
        Context context,
        AppWidgetManager manager,
        int appWidgetId,
        Bundle newOptions
    ) {
        // Resize switches between the one-line and the 4×2 layout.
        render(context, manager, appWidgetId);
    }

    @Override
    public void onDisabled(Context context) {
        WidgetStore.clear(context);
    }

    /** Called by {@link WidgetStore} whenever the JS side pushes new data. */
    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(
            new ComponentName(context, NotesWidgetProvider.class)
        );
        for (int id : ids) {
            render(context, manager, id);
        }
    }

    private static void render(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views =
            new RemoteViews(context.getPackageName(), R.layout.widget_notes);

        JSONArray notes;
        try {
            notes = new JSONArray(WidgetStore.loadNotes(context));
        } catch (Exception e) {
            notes = new JSONArray();
        }
        int total = WidgetStore.loadTotal(context);

        boolean compact = isCompact(context, manager, appWidgetId);

        // Header count.
        String countLabel;
        if (total == 1) {
            countLabel = "1 note";
        } else {
            countLabel = total + " notes";
        }
        views.setTextViewText(R.id.widget_count, countLabel);

        // Up to three note rows; each opens its note as a deep link.
        int rowsToShow = compact ? 1 : ROW_IDS.length;
        int renderedRows = 0;
        for (int i = 0; i < ROW_IDS.length; i++) {
            JSONObject note = notes.optJSONObject(i);
            if (i < rowsToShow && note != null) {
                String title = note.optString("title", "");
                if (title.isEmpty()) title = "Untitled";
                views.setTextViewText(ROW_TITLE_IDS[i], title);
                views.setTextViewText(ROW_TIME_IDS[i], note.optString("time", ""));
                views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                views.setOnClickPendingIntent(
                    ROW_IDS[i],
                    deepLink(
                        context,
                        "n0t3s://note?id=" + Uri.encode(note.optString("id", "")),
                        REQUEST_ROW_BASE + i
                    )
                );
                renderedRows++;
            } else {
                views.setViewVisibility(ROW_IDS[i], View.GONE);
            }
        }

        // Empty state replaces the rows when there is nothing to show.
        if (renderedRows == 0) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            views.setOnClickPendingIntent(R.id.widget_empty, deepLink(context, "n0t3s://new", REQUEST_NEW_NOTE + 1));
        } else {
            views.setViewVisibility(R.id.widget_empty, View.GONE);
        }

        // "+N more" hint when the snapshot doesn't fit the widget.
        int remaining = total - renderedRows;
        if (!compact && remaining > 0) {
            views.setTextViewText(R.id.widget_more, "+" + remaining + " more");
            views.setViewVisibility(R.id.widget_more, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_more, View.GONE);
        }

        // The "New note" pill is always available.
        views.setViewVisibility(R.id.widget_new, View.VISIBLE);
        views.setOnClickPendingIntent(R.id.widget_new, deepLink(context, "n0t3s://new", REQUEST_NEW_NOTE));

        // Header / body tap → just open the app.
        views.setOnClickPendingIntent(R.id.widget_root, plainAppIntent(context));

        manager.updateAppWidget(appWidgetId, views);
    }

    /**
     * Small widgets (one cell tall) get a single line; taller placements show
     * all three rows plus the footer.
     */
    private static boolean isCompact(Context context, AppWidgetManager manager, int appWidgetId) {
        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        int minHeightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        return minHeightDp > 0 && minHeightDp < 100;
    }

    private static PendingIntent deepLink(Context context, String url, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent plainAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(
            context,
            REQUEST_PLAIN,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
