/**
 * Acoustic & Sound Resonance Sensor Service
 * Secondary Flood Detection Method (Microphone Audio Analysis)
 * 
 * Analyzes ambient sound decibels (SPL dB) and low-frequency flood resonance (40Hz - 450Hz)
 * created by rushing river water, torrential flash floods, and turbulent culvert flow.
 * Triggers flood warning / critical alerts when acoustic resonance & dB exceed safety limits.
 */

import { AcousticData, AcousticSensorState, FloodSeverity } from '../types';

export type AcousticCallback = (data: AcousticData) => void;
export type AcousticTriggerCallback = (
  peakDecibels: number,
  severity: FloodSeverity,
  durationSec: number,
  source: 'acoustic_sound_sensor' | 'manual_test' | 'simulated'
) => void;

class AcousticSensorService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  private isListening: boolean = false;
  private isPaused: boolean = false;

  // Thresholds
  private thresholdYellowDb: number = 68; // dB (Moderate Roar / Warning)
  private thresholdRedDb: number = 82; // dB (Severe Rushing Water / Critical)
  private resonanceThreshold: number = 65; // % low-frequency resonance
  private sensitivityMultiplier: number = 1.2;

  // Debounce & timing
  private soundStartTime: number | null = null;
  private currentPeakDb: number = 0;
  private lastYellowTriggerTime: number = 0;
  private lastRedTriggerTime: number = 0;

  private latestData: AcousticData = {
    decibels: 32,
    rms: 0.01,
    peakRms: 0.01,
    resonanceScore: 0,
    frequencyData: new Array(32).fill(0),
    isWaterRoarDetected: false,
    sustainedDurationSec: 0,
    triggerProgress: 0,
    timestamp: Date.now(),
  };

  private callbacks: Set<AcousticCallback> = new Set();
  private triggerCallbacks: Set<AcousticTriggerCallback> = new Set();
  private stateCallbacks: Set<(state: AcousticSensorState) => void> = new Set();
  private simIntervalId: number | null = null;

  constructor() {
    //
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  public setConfig(
    thresholdYellowDb: number = 68,
    thresholdRedDb: number = 82,
    sensitivity: number = 1.2
  ) {
    this.thresholdYellowDb = thresholdYellowDb;
    this.thresholdRedDb = thresholdRedDb;
    this.sensitivityMultiplier = Math.max(0.5, Math.min(3.0, sensitivity));
    this.notifyStateChange();
  }

  public async requestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      // Stop stream immediately if just requesting permission
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (err) {
      console.warn('[AcousticSensor] Permission request error:', err);
      return 'denied';
    }
  }

  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;
    this.isPaused = false;

    if (!this.isSupported()) {
      this.notifyStateChange({
        isSupported: false,
        isListening: false,
        permissionStatus: 'unsupported',
        isPaused: false,
        error: 'Microphone / Web Audio API is not supported on this browser.',
        thresholdYellowDb: this.thresholdYellowDb,
        thresholdRedDb: this.thresholdRedDb,
        resonanceThreshold: this.resonanceThreshold,
      });
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.6;
      this.sourceNode.connect(this.analyser);

      this.isListening = true;
      this.isPaused = false;
      this.soundStartTime = null;
      this.currentPeakDb = 0;

      this.notifyStateChange({
        isSupported: true,
        isListening: true,
        permissionStatus: 'granted',
        isPaused: false,
        thresholdYellowDb: this.thresholdYellowDb,
        thresholdRedDb: this.thresholdRedDb,
        resonanceThreshold: this.resonanceThreshold,
      });

      this.startProcessingLoop();
      return true;
    } catch (err) {
      console.error('[AcousticSensor] Failed to start microphone listener:', err);
      this.stopListening();
      this.notifyStateChange({
        isSupported: true,
        isListening: false,
        permissionStatus: 'denied',
        isPaused: false,
        error: 'Microphone access denied or unavailable. Grant permission to use sound recognition.',
        thresholdYellowDb: this.thresholdYellowDb,
        thresholdRedDb: this.thresholdRedDb,
        resonanceThreshold: this.resonanceThreshold,
      });
      return false;
    }
  }

  public stopListening() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.isListening = false;
    this.isPaused = false;
    this.soundStartTime = null;
    this.stopSimulation();

    this.notifyStateChange({
      isSupported: this.isSupported(),
      isListening: false,
      permissionStatus: 'granted',
      isPaused: false,
      thresholdYellowDb: this.thresholdYellowDb,
      thresholdRedDb: this.thresholdRedDb,
      resonanceThreshold: this.resonanceThreshold,
    });
  }

  public pause() {
    this.isPaused = true;
    this.soundStartTime = null;
    this.currentPeakDb = 0;
    this.stopSimulation();
    this.notifyStateChange({
      isSupported: this.isSupported(),
      isListening: this.isListening,
      permissionStatus: 'granted',
      isPaused: true,
      thresholdYellowDb: this.thresholdYellowDb,
      thresholdRedDb: this.thresholdRedDb,
      resonanceThreshold: this.resonanceThreshold,
    });
  }

  public resume() {
    this.isPaused = false;
    this.soundStartTime = null;
    if (!this.isListening) {
      this.startListening();
    } else {
      this.notifyStateChange({
        isSupported: this.isSupported(),
        isListening: true,
        permissionStatus: 'granted',
        isPaused: false,
        thresholdYellowDb: this.thresholdYellowDb,
        thresholdRedDb: this.thresholdRedDb,
        resonanceThreshold: this.resonanceThreshold,
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

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getLatestData(): AcousticData {
    return this.latestData;
  }

  private startProcessingLoop() {
    const bufferLength = this.analyser?.frequencyBinCount || 256;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    const processFrame = () => {
      if (!this.isListening || !this.analyser) {
        return;
      }

      if (this.isPaused) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      // 1. Time-domain waveform for RMS calculation
      this.analyser.getByteTimeDomainData(timeData);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeData[i] - 128) / 128; // -1.0 to 1.0
        sumSquares += normalized * normalized;
      }
      const rawRms = Math.sqrt(sumSquares / bufferLength);
      const rms = Math.min(1.0, rawRms * this.sensitivityMultiplier);

      // Decibel calculation: map RMS to approximate Sound Pressure Level (SPL dB: 30dB - 110dB)
      // Reference: silence ~ 30dB, normal speech ~ 60dB, loud water/rush ~ 75-90dB, jet/siren ~ 100dB+
      let decibels = 30;
      if (rms > 0.001) {
        // dBFS formula: 20 * log10(rms)
        const dbfs = 20 * Math.log10(rms);
        // Map dbfs (-60dB to 0dB) to approximate SPL (30dB to 105dB)
        decibels = Math.max(30, Math.min(110, Math.round(98 + dbfs * 1.15)));
      }

      // 2. Frequency spectrum for Low-Frequency Turbulent Water Resonance (40Hz - 450Hz)
      this.analyser.getByteFrequencyData(freqData);

      // Calculate sample rate step per bin
      const sampleRate = this.audioContext?.sampleRate || 44100;
      const binWidth = sampleRate / (bufferLength * 2); // ~86 Hz per bin if fftSize=512

      // Analyze bins corresponding to 40Hz - 450Hz (turbulent water roar)
      let lowEnergy = 0;
      let lowBinCount = 0;
      let totalEnergy = 0;

      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        const val = freqData[i];
        totalEnergy += val;

        if (freq >= 40 && freq <= 480) {
          lowEnergy += val;
          lowBinCount++;
        }
      }

      const avgLow = lowBinCount > 0 ? lowEnergy / lowBinCount : 0;
      const avgTotal = bufferLength > 0 ? totalEnergy / bufferLength : 1;

      // Low frequency turbulence ratio (0 to 100%)
      let resonanceScore = Math.round(
        Math.min(100, Math.max(0, (avgLow / 255) * 100 * (avgTotal > 10 ? avgLow / avgTotal : 0.5) * this.sensitivityMultiplier))
      );

      // Visualizer bin aggregation (downsample to 32 visual bars)
      const visualBarsCount = 32;
      const step = Math.floor(bufferLength / visualBarsCount);
      const visualBins: number[] = [];
      for (let b = 0; b < visualBarsCount; b++) {
        let barSum = 0;
        for (let s = 0; s < step; s++) {
          barSum += freqData[b * step + s] || 0;
        }
        visualBins.push(Math.round(barSum / step));
      }

      const isWaterRoarDetected = resonanceScore >= this.resonanceThreshold && decibels >= this.thresholdYellowDb;

      const now = Date.now();
      let sustainedSec = 0;
      let triggerProgress = 0;

      // Threshold trigger logic
      const isAboveYellow = decibels >= this.thresholdYellowDb || resonanceScore >= this.resonanceThreshold;
      const isAboveRed = decibels >= this.thresholdRedDb || (decibels >= this.thresholdYellowDb && resonanceScore >= 80);

      if (isAboveYellow) {
        if (this.soundStartTime === null) {
          this.soundStartTime = now;
          this.currentPeakDb = decibels;
        } else {
          this.currentPeakDb = Math.max(this.currentPeakDb, decibels);
        }
        sustainedSec = (now - this.soundStartTime) / 1000;
        triggerProgress = Math.min(1.0, (decibels - 40) / (this.thresholdRedDb - 40));
      } else {
        if (this.soundStartTime !== null) {
          const timeSinceHigh = (now - this.soundStartTime) / 1000;
          if (timeSinceHigh >= 0.2) {
            this.soundStartTime = null;
            this.currentPeakDb = 0;
          }
        }
      }

      // === IMMEDIATE THRESHOLD TRIGGER LOGIC ===
      // 1. RED CRITICAL LEVEL: Loud continuous water roar / extreme sound level
      if (isAboveRed) {
        const timeSinceLastRed = now - this.lastRedTriggerTime;
        if (timeSinceLastRed > 8000) {
          this.lastRedTriggerTime = now;
          this.lastYellowTriggerTime = now;
          this.notifyFloodTrigger(decibels, 'red', Math.max(0.1, sustainedSec), 'acoustic_sound_sensor');
        }
      }
      // 2. YELLOW WARNING LEVEL: Moderate roar / elevated resonance
      else if (isAboveYellow) {
        const timeSinceLastYellow = now - this.lastYellowTriggerTime;
        const timeSinceLastRed = now - this.lastRedTriggerTime;
        if (timeSinceLastYellow > 10000 && timeSinceLastRed > 5000) {
          this.lastYellowTriggerTime = now;
          this.notifyFloodTrigger(decibels, 'yellow', Math.max(0.1, sustainedSec), 'acoustic_sound_sensor');
        }
      }

      this.latestData = {
        decibels,
        rms,
        peakRms: rms,
        resonanceScore,
        frequencyData: visualBins,
        isWaterRoarDetected,
        sustainedDurationSec: sustainedSec,
        triggerProgress,
        timestamp: now,
      };

      this.callbacks.forEach((cb) => cb(this.latestData));

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  public simulateSoundTest(severity: FloodSeverity = 'red') {
    this.stopSimulation();
    const isRed = severity === 'red';
    const targetDb = isRed ? 88 : 72;
    const targetResonance = isRed ? 85 : 68;

    let tick = 0;
    const durationTicks = 18; // ~3.6 seconds

    this.simIntervalId = window.setInterval(() => {
      tick++;
      const jitter = (Math.random() - 0.5) * 4;
      const currentDb = Math.round(targetDb + jitter);
      const resonance = Math.round(targetResonance + (Math.random() - 0.5) * 5);

      // Generate synthetic frequency bins emphasizing low frequencies
      const simBins: number[] = [];
      for (let i = 0; i < 32; i++) {
        if (i < 8) {
          simBins.push(Math.min(255, Math.round(180 + Math.random() * 70)));
        } else if (i < 16) {
          simBins.push(Math.min(255, Math.round(100 + Math.random() * 60)));
        } else {
          simBins.push(Math.min(255, Math.round(30 + Math.random() * 40)));
        }
      }

      const now = Date.now();
      this.latestData = {
        decibels: currentDb,
        rms: currentDb / 100,
        peakRms: currentDb / 100,
        resonanceScore: resonance,
        frequencyData: simBins,
        isWaterRoarDetected: true,
        sustainedDurationSec: tick * 0.2,
        triggerProgress: Math.min(1.0, tick / 6),
        timestamp: now,
      };

      this.callbacks.forEach((cb) => cb(this.latestData));

      if (tick === 4) {
        this.notifyFloodTrigger(targetDb, severity, 0.8, 'simulated');
      }

      if (tick >= durationTicks) {
        this.stopSimulation();
      }
    }, 200);
  }

  public stopSimulation() {
    if (this.simIntervalId !== null) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
  }

  private notifyFloodTrigger(
    peakDb: number,
    severity: FloodSeverity,
    durationSec: number,
    source: 'acoustic_sound_sensor' | 'manual_test' | 'simulated'
  ) {
    this.triggerCallbacks.forEach((cb) => cb(peakDb, severity, durationSec, source));
  }

  public onSoundData(callback: AcousticCallback): () => void {
    this.callbacks.add(callback);
    callback(this.latestData);
    return () => this.callbacks.delete(callback);
  }

  public onTrigger(callback: AcousticTriggerCallback): () => void {
    this.triggerCallbacks.add(callback);
    return () => this.triggerCallbacks.delete(callback);
  }

  public onStateChange(callback: (state: AcousticSensorState) => void): () => void {
    this.stateCallbacks.add(callback);
    callback({
      isSupported: this.isSupported(),
      isListening: this.isListening,
      permissionStatus: 'prompt',
      isPaused: this.isPaused,
      thresholdYellowDb: this.thresholdYellowDb,
      thresholdRedDb: this.thresholdRedDb,
      resonanceThreshold: this.resonanceThreshold,
    });
    return () => this.stateCallbacks.delete(callback);
  }

  private notifyStateChange(override?: Partial<AcousticSensorState>) {
    const base: AcousticSensorState = {
      isSupported: this.isSupported(),
      isListening: this.isListening,
      permissionStatus: 'granted',
      isPaused: this.isPaused,
      thresholdYellowDb: this.thresholdYellowDb,
      thresholdRedDb: this.thresholdRedDb,
      resonanceThreshold: this.resonanceThreshold,
      ...override,
    };
    this.stateCallbacks.forEach((cb) => cb(base));
  }
}

export const acousticSensorService = new AcousticSensorService();
