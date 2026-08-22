package com.dzenjecdsstem.floodalert;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    public static final String FLOOD_CHANNEL_ID = "dzenje_flood_alarm_channel_v1";

    @CapacitorPlugin(name = "NativePowerHelper")
    public static class NativePowerHelperPlugin extends Plugin {

        @PluginMethod
        public void isBatteryOptimized(PluginCall call) {
            try {
                Context context = getContext();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    boolean isIgnoring = pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
                    call.resolve(new com.getcapacitor.JSObject().put("isIgnoringBatteryOptimizations", isIgnoring));
                } else {
                    call.resolve(new com.getcapacitor.JSObject().put("isIgnoringBatteryOptimizations", true));
                }
            } catch (Exception e) {
                call.reject("Error checking battery status", e);
            }
        }

        @PluginMethod
        public void requestDisableBatteryOptimization(PluginCall call) {
            try {
                Context context = getContext();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                        Intent intent = new Intent();
                        intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + context.getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        call.resolve(new com.getcapacitor.JSObject().put("requested", true));
                        return;
                    }
                }
                call.resolve(new com.getcapacitor.JSObject().put("requested", false));
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    call.resolve(new com.getcapacitor.JSObject().put("requested", true));
                } catch (Exception ex) {
                    call.reject("Could not open battery settings", ex);
                }
            }
        }

        @PluginMethod
        public void areNotificationsEnabled(PluginCall call) {
            try {
                boolean areEnabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
                call.resolve(new com.getcapacitor.JSObject().put("enabled", areEnabled));
            } catch (Exception e) {
                call.resolve(new com.getcapacitor.JSObject().put("enabled", true));
            }
        }

        @PluginMethod
        public void openNotificationSettings(PluginCall call) {
            try {
                Context context = getContext();
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                call.resolve(new com.getcapacitor.JSObject().put("opened", true));
            } catch (Exception e) {
                call.reject("Could not open notification settings", e);
            }
        }

        @PluginMethod
        public void showNativeFloodAlert(PluginCall call) {
            try {
                Context context = getContext();
                String title = call.getString("title", "🚨 FLOOD WARNING ALERT");
                String body = call.getString("body", "Continuous river rise detected! Evacuate to high ground immediately.");

                Intent intent = new Intent(context, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_UPDATE_CURRENT
                );

                Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmSound == null) {
                    alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, FLOOD_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setSound(alarmSound)
                    .setVibrate(new long[]{0, 1000, 300, 1000, 300, 1000});

                NotificationManagerCompat.from(context).notify((int) System.currentTimeMillis(), builder.build());

                // Hardware vibration trigger
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(new long[]{0, 1000, 300, 1000, 300, 1000}, -1));
                    } else {
                        v.vibrate(new long[]{0, 1000, 300, 1000, 300, 1000}, -1);
                    }
                }

                call.resolve(new com.getcapacitor.JSObject().put("notified", true));
            } catch (Exception e) {
                call.reject("Failed to show native notification", e);
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Flood Emergency Sirens";
            String description = "Critical alerts and loud siren notifications during river floods";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(FLOOD_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 300, 1000, 300, 1000});
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            channel.setSound(alarmSound, audioAttributes);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePowerHelperPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }
}

