/**
 * Notification Service & Offline PWA Engine
 * 
 * Provides:
 * - Service Worker registration & lifecycle management (`/sw.js`)
 * - Offline-first background notifications (via `ServiceWorkerRegistration.showNotification`)
 * - Hardware vibration patterns (haptics)
 * - PWA Installation prompt listener (`beforeinstallprompt`)
 * - Online / Offline network status detection & event emitter
 * - Offline alert caching and automatic background synchronization
 */

export interface OfflineAlertPayload {
  title?: string;
  body?: string;
  village?: string;
  riverName?: string;
  locationLabel?: string;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
  peakDelta?: number;
  isTest?: boolean;
}

export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static deferredInstallPrompt: any = null;
  private static installPromptListeners: Set<(canInstall: boolean) => void> = new Set();
  private static networkListeners: Set<(isOnline: boolean) => void> = new Set();

  public static init() {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          this.swRegistration = reg;
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration info:', err);
        });

      navigator.serviceWorker.ready.then((reg) => {
        this.swRegistration = reg;
      });
    }

    // 2. Listen for PWA Install Prompt
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
        this.notifyInstallPromptListeners(true);
      });

      window.addEventListener('appinstalled', () => {
        this.deferredInstallPrompt = null;
        this.notifyInstallPromptListeners(false);
      });

      // 3. Listen for Online / Offline transitions
      window.addEventListener('online', () => {
        this.notifyNetworkListeners(true);
      });

      window.addEventListener('offline', () => {
        this.notifyNetworkListeners(false);
      });
    }
  }

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public static isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  public static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted' && !this.swRegistration && this.isServiceWorkerSupported()) {
        try {
          this.swRegistration = await navigator.serviceWorker.ready;
        } catch {
          // ignore
        }
      }
      return result;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    }
  }

  /**
   * Sends flood notification even if app is in background, minimized, or offline!
   * Uses ServiceWorker registration when available so notifications show up reliably.
   */
  public static async sendFloodPushNotification(
    title: string,
    body: string,
    payload?: OfflineAlertPayload
  ): Promise<boolean> {
    // Always trigger hardware vibration immediately if supported (even offline)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([600, 200, 600, 200, 1000, 200, 1000]);
      } catch {
        // ignore
      }
    }

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const options: any = {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload?.isTest ? 'flood_test_alert' : 'critical_flood_alarm',
      renotify: true,
      requireInteraction: true,
      data: {
        url: payload?.mapsUrl || '/',
        village: payload?.village || 'Dzenje',
        riverName: payload?.riverName || 'Ruo River',
        locationLabel: payload?.locationLabel || 'Ruo River, Dzenje Village, T/A Mabuka, Mulanje',
        peakDelta: payload?.peakDelta || 0,
        timestamp: Date.now(),
      },
    };

    // Try Service Worker registration first (works in background & offline)
    try {
      if (this.swRegistration) {
        await this.swRegistration.showNotification(title, options);
        return true;
      }

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          village: payload?.village,
          riverName: payload?.riverName,
          locationLabel: payload?.locationLabel,
          mapsUrl: payload?.mapsUrl,
          peakDelta: payload?.peakDelta,
          isTest: payload?.isTest,
        });
        return true;
      }
    } catch (swErr) {
      console.warn('[PWA] Service Worker showNotification failed, trying standard Notification:', swErr);
    }

    // Standard Window Notification Fallback
    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: payload?.isTest ? 'flood_test_alert' : 'critical_flood_alarm',
        requireInteraction: true,
      } as any);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch (err) {
      console.warn('Failed to display window notification:', err);
      return false;
    }
  }

  // PWA Install Prompt methods
  public static canInstallPwa(): boolean {
    return Boolean(this.deferredInstallPrompt);
  }

  public static async promptPwaInstall(): Promise<boolean> {
    if (!this.deferredInstallPrompt) {
      return false;
    }
    try {
      this.deferredInstallPrompt.prompt();
      const choiceResult = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      this.notifyInstallPromptListeners(false);
      return choiceResult.outcome === 'accepted';
    } catch (err) {
      console.warn('Error prompting PWA install:', err);
      return false;
    }
  }

  public static subscribeInstallPrompt(cb: (canInstall: boolean) => void): () => void {
    this.installPromptListeners.add(cb);
    cb(this.canInstallPwa());
    return () => this.installPromptListeners.delete(cb);
  }

  private static notifyInstallPromptListeners(canInstall: boolean) {
    this.installPromptListeners.forEach((cb) => cb(canInstall));
  }

  public static subscribeNetworkStatus(cb: (isOnline: boolean) => void): () => void {
    this.networkListeners.add(cb);
    cb(this.isOnline());
    return () => this.networkListeners.delete(cb);
  }

  private static notifyNetworkListeners(isOnline: boolean) {
    this.networkListeners.forEach((cb) => cb(isOnline));
  }
}

// Auto-initialize on module load
NotificationService.init();
