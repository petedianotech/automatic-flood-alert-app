/**
 * Device Motion Sensor API Service
 * Computes 3-axis accelerometer values (X, Y, Z)
 * Math Formula: A = sqrt(X^2 + Y^2 + Z^2), Delta = |A - 9.81|
 * Continuous vibration monitor: triggers flood alert if Delta > threshold for continuous duration
 */

import { MotionData, MotionSensorState } from '../types';

export type MotionCallback = (data: MotionData, sustainedDurationSec: number, triggerProgress: number) => void;
export type FloodTriggerCallback = (peakDelta: number, durationSec: number, source: 'hardware_sensor' | 'manual_test' | 'simulated') => void;

class MotionSensorService {
  private isListening: boolean = false;
  private isPaused: boolean = false;
  private thresholdDelta: number = 1.5; // m/s^2
  private continuousDurationSec: number = 3.0; // 3 seconds
  private baselineGravity: number = 9.81; // Standard Earth gravity

  private motionCallbacks: Set<MotionCallback> = new Set();
  private triggerCallbacks: Set<FloodTriggerCallback> = new Set();
  private stateChangeCallbacks: Set<(state: MotionSensorState) => void> = new Set();

  private vibrationStartTime: number | null = null;
  private currentPeakDelta: number = 0;
  private alertTriggeredThisEvent: boolean = false;

  private latestMotion: MotionData = {
    x: 0,
    y: 0,
    z: 9.81,
    totalMagnitude: 9.81,
    delta: 0,
    timestamp: Date.now(),
  };

  private simIntervalId: number | null = null;
  private isCalibrating: boolean = false;
  private calibrationSamples: number[] = [];

  constructor() {
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  public async requestPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!this.isSupported()) {
      this.notifyStateChange();
      return 'unsupported';
    }

    const deviceMotionEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof deviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await deviceMotionEvent.requestPermission();
        if (response === 'granted') {
          return 'granted';
        }
        return 'denied';
      } catch (err) {
        console.warn('DeviceMotionEvent permission error:', err);
        return 'denied';
      }
    }

    // Standard Android / Desktop Chrome supports without explicit iOS permission prompt
    return 'granted';
  }

  public setConfig(threshold: number, duration: number, baseline?: number) {
    this.thresholdDelta = threshold;
    this.continuousDurationSec = duration;
    if (baseline !== undefined) {
      this.baselineGravity = baseline;
    }
  }

  public async startListening(): Promise<boolean> {
    this.isPaused = false;
    if (this.isListening) {
      this.notifyStateChange();
      return true;
    }

    const perm = await this.requestPermission();
    if (perm === 'denied') {
      this.notifyStateChange({
        isSupported: true,
        isListening: false,
        permissionStatus: 'denied',
        isCalibrating: false,
        isPaused: false,
        error: 'Motion sensor access was denied by the user.',
        hardwareAvailable: false,
      });
      return false;
    }

    try {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
      this.isListening = true;
      this.isPaused = false;
      this.vibrationStartTime = null;
      this.alertTriggeredThisEvent = false;
      this.currentPeakDelta = 0;

      this.notifyStateChange({
        isSupported: true,
        isListening: true,
        permissionStatus: 'granted',
        isCalibrating: false,
        isPaused: false,
        hardwareAvailable: true,
      });

      return true;
    } catch (err) {
      console.error('Failed to attach devicemotion listener:', err);
      return false;
    }
  }

  public stopListening() {
    if (!this.isListening) return;

    window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
    this.isListening = false;
    this.isPaused = false;
    this.vibrationStartTime = null;
    this.alertTriggeredThisEvent = false;
    this.stopSimulation();

    this.notifyStateChange({
      isSupported: this.isSupported(),
      isListening: false,
      permissionStatus: 'granted',
      isCalibrating: false,
      isPaused: false,
      hardwareAvailable: true,
    });
  }

  public pause() {
    this.isPaused = true;
    this.vibrationStartTime = null;
    this.alertTriggeredThisEvent = false;
    this.currentPeakDelta = 0;
    this.stopSimulation();

    // Broadcast zeroed delta / paused frame
    this.latestMotion = {
      ...this.latestMotion,
      delta: 0,
      timestamp: Date.now(),
    };
    this.motionCallbacks.forEach((cb) => cb(this.latestMotion, 0, 0));

    this.notifyStateChange({
      isSupported: this.isSupported(),
      isListening: this.isListening,
      permissionStatus: 'granted',
      isCalibrating: false,
      isPaused: true,
      hardwareAvailable: true,
    });
  }

  public resume() {
    this.isPaused = false;
    this.vibrationStartTime = null;
    this.alertTriggeredThisEvent = false;
    this.currentPeakDelta = 0;

    if (!this.isListening) {
      this.startListening();
    } else {
      this.notifyStateChange({
        isSupported: this.isSupported(),
        isListening: true,
        permissionStatus: 'granted',
        isCalibrating: false,
        isPaused: false,
        hardwareAvailable: true,
      });
    }
  }

  public togglePause(): boolean {
    if (this.isPaused) {
      this.resume();
      return false;
    } else {
      this.pause();
      return true;
    }
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  private handleDeviceMotion(event: DeviceMotionEvent) {
    if (this.isPaused) return;

    // Prefer accelerationIncludingGravity if available, or acceleration + baseline
    const acc = event.accelerationIncludingGravity || event.acceleration;

    if (!acc || acc.x === null || acc.y === null || acc.z === null) {
      return;
    }

    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;

    this.processRawAcceleration(x, y, z, 'hardware_sensor');
  }

  public processRawAcceleration(x: number, y: number, z: number, source: 'hardware_sensor' | 'manual_test' | 'simulated' = 'hardware_sensor') {
    if (this.isPaused && source !== 'manual_test') {
      return;
    }

    // Formula: Total magnitude A = sqrt(x^2 + y^2 + z^2)
    const totalMagnitude = Math.sqrt(x * x + y * y + z * z);

    // Delta = |A - baselineGravity|
    const delta = Math.abs(totalMagnitude - this.baselineGravity);
    const now = Date.now();

    this.latestMotion = {
      x,
      y,
      z,
      totalMagnitude,
      delta,
      timestamp: now,
    };

    // If in calibration mode, collect samples
    if (this.isCalibrating) {
      this.calibrationSamples.push(totalMagnitude);
      return;
    }

    // Continuous Vibration Tracking
    let sustainedSec = 0;
    let progress = 0;

    if (delta >= this.thresholdDelta) {
      if (this.vibrationStartTime === null) {
        this.vibrationStartTime = now;
        this.currentPeakDelta = delta;
      } else {
        this.currentPeakDelta = Math.max(this.currentPeakDelta, delta);
      }

      sustainedSec = (now - this.vibrationStartTime) / 1000;
      progress = Math.min(1, sustainedSec / this.continuousDurationSec);

      // Check if continuous condition is met (e.g., Delta > 1.5 m/s^2 for 3s)
      if (sustainedSec >= this.continuousDurationSec && !this.alertTriggeredThisEvent) {
        this.alertTriggeredThisEvent = true;
        this.notifyFloodTrigger(this.currentPeakDelta, sustainedSec, source);
      }
    } else {
      // Delta fell below threshold -> reset continuous counter (allows 300ms debounce buffer)
      if (this.vibrationStartTime !== null) {
        const timeSinceHigh = (now - this.vibrationStartTime) / 1000;
        if (timeSinceHigh < 0.2) {
          // brief transient
        } else {
          this.vibrationStartTime = null;
          this.alertTriggeredThisEvent = false;
          this.currentPeakDelta = 0;
        }
      }
    }

    // Notify UI motion subscribers
    this.motionCallbacks.forEach((cb) => cb(this.latestMotion, sustainedSec, progress));
  }

  /**
   * Start 2-second zero baseline calibration to neutralize resting angle & gravity drift
   */
  public async calibrateBaseline(): Promise<number> {
    this.isCalibrating = true;
    this.calibrationSamples = [];

    // Collect for 1.5 seconds
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isCalibrating = false;
        if (this.calibrationSamples.length > 0) {
          const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
          const avg = sum / this.calibrationSamples.length;
          this.baselineGravity = parseFloat(avg.toFixed(3));
        } else {
          this.baselineGravity = 9.81;
        }
        resolve(this.baselineGravity);
      }, 1500);
    });
  }

  /**
   * Simulate a realistic high vibration flood event (for preview/desktop testing)
   */
  public simulateFloodTest(durationSec = 3.5, peakForce = 3.8) {
    if (this.simIntervalId !== null) {
      clearInterval(this.simIntervalId);
    }

    const startTime = Date.now();
    this.simIntervalId = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > durationSec) {
        this.stopSimulation();
        // Return to resting state
        this.processRawAcceleration(0, 0, this.baselineGravity, 'simulated');
        return;
      }

      // Generate oscillating vibration noise with jitter
      const noise = (Math.random() - 0.5) * 0.8;
      const wave = Math.sin(elapsed * 25) * peakForce;
      const simX = wave * 0.6 + noise;
      const simY = wave * 0.4 + noise;
      const simZ = this.baselineGravity + wave * 0.7 + noise;

      this.processRawAcceleration(simX, simY, simZ, 'simulated');
    }, 40); // 25 Hz sampling
  }

  public stopSimulation() {
    if (this.simIntervalId !== null) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
  }

  public onMotion(cb: MotionCallback): () => void {
    this.motionCallbacks.add(cb);
    return () => this.motionCallbacks.delete(cb);
  }

  public onTrigger(cb: FloodTriggerCallback): () => void {
    this.triggerCallbacks.add(cb);
    return () => this.triggerCallbacks.delete(cb);
  }

  public onStateChange(cb: (state: MotionSensorState) => void): () => void {
    this.stateChangeCallbacks.add(cb);
    return () => this.stateChangeCallbacks.delete(cb);
  }

  private notifyFloodTrigger(peakDelta: number, durationSec: number, source: 'hardware_sensor' | 'manual_test' | 'simulated') {
    this.triggerCallbacks.forEach((cb) => cb(peakDelta, durationSec, source));
  }

  private notifyStateChange(partialState?: Partial<MotionSensorState>) {
    const defaultState: MotionSensorState = {
      isSupported: this.isSupported(),
      isListening: this.isListening,
      permissionStatus: this.isListening ? 'granted' : 'prompt',
      isCalibrating: this.isCalibrating,
      hardwareAvailable: this.isSupported(),
      ...partialState,
    };
    this.stateChangeCallbacks.forEach((cb) => cb(defaultState));
  }

  public getLatestMotion(): MotionData {
    return this.latestMotion;
  }

  public getBaseline(): number {
    return this.baselineGravity;
  }
}

export const motionSensorService = new MotionSensorService();
