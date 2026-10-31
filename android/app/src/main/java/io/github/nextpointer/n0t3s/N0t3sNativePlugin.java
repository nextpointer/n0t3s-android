package io.github.nextpointer.n0t3s;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import io.github.nextpointer.n0t3s.widget.WidgetStore;

/**
 * The app's own native surface: widget data plumbing and local notifications.
 *
 * Notes live in IndexedDB inside the WebView, and only JS can edit them — so
 * the widget is fed by JSON snapshots (see WidgetStore) rather than queried
 * by Android. Deep links ({@code n0t3s://}) round-trip intents from the
 * widget and notification actions back into the web code through
 * Capacitor's appUrlOpen event.
 */
@CapacitorPlugin(
    name = "N0t3sNative",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = N0t3sNativePlugin.PERMISSION_NOTIFICATIONS
        )
    }
)
public class N0t3sNativePlugin extends Plugin {

    static final String PERMISSION_NOTIFICATIONS = "notifications";

    private static final String CHANNEL_ID = "notes";
    /** Notification slot shared by every reminder-style notice. */
    private static final int OPEN_APP_REQUEST_CODE = 11;
    private static final int ACTION_NEW_NOTE_REQUEST_CODE = 12;

    @Override
    public void load() {
        ensureChannel(getContext());
    }

    /* ------------------------------------------------------------------ *
     * Widget
     * ------------------------------------------------------------------ */

    /**
     * JS owns the note data and pushes newest-first snapshots here whenever
     * notes change; the widget provider renders straight from prefs, so it
     * also works after process death with no app running.
     */
    @PluginMethod
    public void updateWidget(PluginCall call) {
        JSArray notes = call.getArray("notes");
        String notesJson = notes == null ? "[]" : notes.toString();
        Integer total = call.getInt("total");
        int count = total == null
            ? (notes == null ? 0 : notes.length())
            : total;
        WidgetStore.save(getContext(), notesJson, count);
        call.resolve();
    }

    /* ------------------------------------------------------------------ *
     * Notifications
     * ------------------------------------------------------------------ */

    @PluginMethod
    public void showNotification(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33
            && getPermissionState(PERMISSION_NOTIFICATIONS) != PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("shown", false);
            result.put("reason", "no-permission");
            call.resolve(result);
            return;
        }

        String title = call.getString("title");
        String body = call.getString("body");
        Integer id = call.getInt("id");
        ensureChannel(getContext());

        try {
            Context context = getContext();
            NotificationCompat.BigTextStyle style =
                new NotificationCompat.BigTextStyle().bigText(body != null ? body : "");

            NotificationCompat.Builder builder =
                new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_n0t3s)
                    .setColor(0xFFA855F7)
                    .setContentTitle(title != null ? title : "N0T3S")
                    .setContentText(body != null ? body : "")
                    .setStyle(style)
                    .setAutoCancel(true)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setContentIntent(openAppIntent(context));

            // A quick "New note" shortcut right in the shade.
            builder.addAction(
                new NotificationCompat.Action.Builder(
                    0,
                    context.getString(R.string.widget_new_note),
                    deepLinkIntent(context, "n0t3s://new", ACTION_NEW_NOTE_REQUEST_CODE)
                ).build()
            );

            NotificationManagerCompat.from(context)
                .notify(id == null ? 1 : id, builder.build());

            JSObject result = new JSObject();
            result.put("shown", true);
            result.put("reason", null);
            call.resolve(result);
        } catch (SecurityException e) {
            JSObject result = new JSObject();
            result.put("shown", false);
            result.put("reason", "permission");
            call.resolve(result);
        }
    }

    @PluginMethod
    public void cancelNotification(PluginCall call) {
        Integer id = call.getInt("id");
        NotificationManagerCompat.from(getContext()).cancel(id == null ? 1 : id);
        call.resolve();
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33) {
            call.resolve(makePermissionResult(true));
            return;
        }
        if (getPermissionState(PERMISSION_NOTIFICATIONS) == PermissionState.GRANTED) {
            call.resolve(makePermissionResult(true));
            return;
        }
        requestPermissionForAlias(PERMISSION_NOTIFICATIONS, call, "onPermissionResult");
    }

    @PermissionCallback
    private void onPermissionResult(PluginCall call) {
        boolean granted =
            getPermissionState(PERMISSION_NOTIFICATIONS) == PermissionState.GRANTED;
        call.resolve(makePermissionResult(granted));
    }

    private JSObject makePermissionResult(boolean granted) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        return result;
    }

    /* ------------------------------------------------------------------ *
     * Intents / channel helpers
     * ------------------------------------------------------------------ */

    /** Plain launch — opens the app where it left off, no navigation event. */
    private PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(
            context,
            OPEN_APP_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private PendingIntent deepLinkIntent(Context context, String url, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.channel_notes_name),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(context.getString(R.string.channel_notes_description));
        manager.createNotificationChannel(channel);
    }
}
