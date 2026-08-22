/**
 * Battery Optimization Helper Service
 * Manages native Android battery exemption dialogs, background wake settings,
 * and village-friendly guides for Samsung, Xiaomi, Tecno, Infinix, Huawei, and Itel phones.
 */

import { registerPlugin } from '@capacitor/core';

interface NativePowerHelper {
  isBatteryOptimized(): Promise<{ isIgnoringBatteryOptimizations: boolean }>;
  requestDisableBatteryOptimization(): Promise<{ requested: boolean }>;
}

const NativePowerHelperPlugin = registerPlugin<NativePowerHelper>('NativePowerHelper');

export interface PhoneBrandGuide {
  brand: string;
  steps: string[];
}

export const PHONE_BRAND_GUIDES: PhoneBrandGuide[] = [
  {
    brand: 'Samsung Galaxy',
    steps: [
      'Open Settings → Apps → Flood Alert',
      'Tap "Battery" → choose "Unrestricted"',
      'Turn OFF "Put app to sleep when not in use"',
    ],
  },
  {
    brand: 'Tecno / Infinix / Itel (Transsion)',
    steps: [
      'Open Settings → Phone Master / Battery Lab',
      'Go to "App Power Management" → Flood Alert',
      'Turn OFF "Smart Power Saving" and allow "Auto-start / Background running"',
    ],
  },
  {
    brand: 'Xiaomi / Redmi / POCO',
    steps: [
      'Open Settings → Apps → Manage Apps → Flood Alert',
      'Turn ON "Autostart"',
      'Tap "Battery Saver" → select "No restrictions"',
    ],
  },
  {
    brand: 'Huawei / Honor',
    steps: [
      'Open Settings → Battery → App Launch',
      'Find Flood Alert → Turn OFF "Manage automatically"',
      'Enable all three: "Auto-launch", "Secondary launch", and "Run in background"',
    ],
  },
  {
    brand: 'Standard Android / Google Pixel',
    steps: [
      'Open Settings → Apps → Flood Alert',
      'Tap "App Battery Usage" or "Battery"',
      'Select "Unrestricted" (Don\'t optimize battery)',
    ],
  },
];

class BatteryOptimizationService {
  private storageKey = 'flood_alert_battery_opt_dismissed_v1';
  private statusKey = 'flood_alert_battery_opt_enabled_v1';

  /**
   * Check if battery optimization exemption is active natively or confirmed by user
   */
  async checkNativeStatus(): Promise<boolean> {
    try {
      if (NativePowerHelperPlugin && typeof NativePowerHelperPlugin.isBatteryOptimized === 'function') {
        const result = await NativePowerHelperPlugin.isBatteryOptimized();
        if (result && typeof result.isIgnoringBatteryOptimizations === 'boolean') {
          if (result.isIgnoringBatteryOptimizations) {
            this.setExemptionConfirmed(true);
            return true;
          }
        }
      }
    } catch {
      // ignore
    }
    return this.isExemptionConfirmed();
  }

  isExemptionConfirmed(): boolean {
    try {
      return localStorage.getItem(this.statusKey) === 'true';
    } catch {
      return false;
    }
  }

  setExemptionConfirmed(confirmed: boolean) {
    try {
      if (confirmed) {
        localStorage.setItem(this.statusKey, 'true');
      } else {
        localStorage.removeItem(this.statusKey);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Check if the user dismissed the card
   */
  isPromptDismissed(): boolean {
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch {
      return false;
    }
  }

  setPromptDismissed(dismissed: boolean) {
    try {
      if (dismissed) {
        localStorage.setItem(this.storageKey, 'true');
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Open Android App Battery Settings or trigger native system prompt
   */
  async openAndroidBatterySettings(): Promise<boolean> {
    // 1. Try Native Capacitor Bridge first
    try {
      if (NativePowerHelperPlugin && typeof NativePowerHelperPlugin.requestDisableBatteryOptimization === 'function') {
        await NativePowerHelperPlugin.requestDisableBatteryOptimization();
        return true;
      }
    } catch {
      // fallback
    }

    // 2. Try browser intent protocol
    try {
      const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        const intentUrl = 'intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;package=com.dzenjecdsstem.floodalert;end';
        window.location.href = intentUrl;
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

export const batteryOptimizationService = new BatteryOptimizationService();

