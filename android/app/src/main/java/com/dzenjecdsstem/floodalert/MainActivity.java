package com.dzenjecdsstem.floodalert;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

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
                // Fallback to general battery settings if direct request fails
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
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePowerHelperPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

