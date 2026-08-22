/**
 * Screen Wake Lock API Service
 * Keeps device screen awake continuously while plugged in as a dedicated sensor node.
 */

export class ScreenWakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private isRequested: boolean = false;
  private onChangeListeners: Array<(active: boolean, err?: string) => void> = [];

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (this.isRequested && document.visibilityState === 'visible') {
          this.request();
        }
      });
      window.addEventListener('focus', () => {
        if (this.isRequested && !this.isActive()) {
          this.request();
        }
      });
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  public async request(): Promise<boolean> {
    this.isRequested = true;

    if (!this.isSupported()) {
      this.notifyListeners(false, 'Screen Wake Lock API is not supported in this browser.');
      return false;
    }

    try {
      // Release existing sentinel if any
      if (this.sentinel) {
        try {
          await this.sentinel.release();
        } catch {
          // ignore
        }
      }

      this.sentinel = await navigator.wakeLock.request('screen');

      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        if (this.isRequested && document.visibilityState === 'visible') {
          // Try to re-acquire
          setTimeout(() => this.request(), 1000);
        } else {
          this.notifyListeners(false);
        }
      });

      this.notifyListeners(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wake lock request failed';
      this.notifyListeners(false, msg);
      return false;
    }
  }

  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // ignore
      } finally {
        this.sentinel = null;
        this.notifyListeners(false);
      }
    }
  }

  public isActive(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  public subscribe(cb: (active: boolean, err?: string) => void): () => void {
    this.onChangeListeners.push(cb);
    cb(this.isActive());
    return () => {
      this.onChangeListeners = this.onChangeListeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(active: boolean, err?: string) {
    this.onChangeListeners.forEach((cb) => cb(active, err));
  }
}

export const wakeLockService = new ScreenWakeLockService();
