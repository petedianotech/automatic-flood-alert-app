/**
 * Bell Sound Sensor Service
 * Detects bell ringing while ignoring human voice and whistles.
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

  // Reduced, sensitive thresholds to easily detect real-world bell ringing
  private thresholdYellowDb: number = 48; // dB (Warning level)
  private thresholdRedDb: number = 60; // dB (Alarm / Danger level)
  private resonanceThreshold: number = 30; // % Bell Match Score
  private sensitivityMultiplier: number = 1.3;

  // Circular history buffer for strike rhythm
  private bellEnergyHistory: number[] = [];
  private historyMaxLength: number = 60;

  // Debounce & timing
  private soundStartTime: number | null = null;
  private currentPeakDb: number = 0;
  private lastYellowTriggerTime: number = 0;
  private lastRedTriggerTime: number = 0;

  private latestData: AcousticData = {
    decibels: 30,
    rms: 0.01,
    peakRms: 0.01,
    resonanceScore: 0,
    frequencyData: new Array(32).fill(0),
    isWaterRoarDetected: false,
    sustainedDurationSec: 0,
    triggerProgress: 0,
    timestamp: Date.now(),
    bellDetectionScore: 0,
    isBellRingingDetected: false,
    soundClassification: 'quiet',
    voiceRejectionActive: false,
    whistleRejectionActive: false,
    motorCadenceHz: 0,
    bellBandDb: 30,
    speechBandDb: 30,
  };

  private callbacks: Set<AcousticCallback> = new Set();
  private triggerCallbacks: Set<AcousticTriggerCallback> = new Set();
  private stateCallbacks: Set<(state: AcousticSensorState) => void> = new Set();
  private simIntervalId: number | null = null;

  constructor() {
    this.bellEnergyHistory = new Array(this.historyMaxLength).fill(0);
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  public setConfig(
    thresholdYellowDb: number = 48,
    thresholdRedDb: number = 60,
    sensitivity: number = 1.3
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
        error: 'Microphone is not supported on this browser.',
        thresholdYellowDb: this.thresholdYellowDb,
        thresholdRedDb: this.thresholdRedDb,
        resonanceThreshold: this.resonanceThreshold,
      });
      return false;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.4;
      this.sourceNode.connect(this.analyser);

      this.isListening = true;
      this.isPaused = false;
      this.soundStartTime = null;
      this.currentPeakDb = 0;
      this.bellEnergyHistory = new Array(this.historyMaxLength).fill(0);

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
        error: 'Microphone access denied. Please allow microphone access to use sound sensor.',
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
    const bufferLength = this.analyser?.frequencyBinCount || 512;
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

      // 1. Time-domain waveform for overall sound loudness
      this.analyser.getByteTimeDomainData(timeData);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rawRms = Math.sqrt(sumSquares / bufferLength);
      const rms = Math.min(1.0, rawRms * this.sensitivityMultiplier);

      // Decibels calculation (~30dB to 105dB range)
      let decibels = 30;
      if (rms > 0.001) {
        const dbfs = 20 * Math.log10(rms);
        decibels = Math.max(30, Math.min(105, Math.round(96 + dbfs * 1.12)));
      }

      // 2. Frequency analysis
      this.analyser.getByteFrequencyData(freqData);

      const sampleRate = this.audioContext?.sampleRate || 44100;
      const binWidth = sampleRate / (bufferLength * 2); // ~43 Hz per bin

      let speechEnergy = 0;
      let speechBinCount = 0;
      let whistleEnergy = 0;
      let whistleBinCount = 0;
      let bellPrimaryEnergy = 0;
      let bellPrimaryBinCount = 0;
      let totalEnergy = 0;

      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        const val = freqData[i];
        totalEnergy += val;

        // Human Speech Band (85Hz - 1,200Hz)
        if (freq >= 85 && freq <= 1200) {
          speechEnergy += val;
          speechBinCount++;
        }
        // Whistle Band (1,300Hz - 1,900Hz)
        else if (freq > 1200 && freq <= 1900) {
          whistleEnergy += val;
          whistleBinCount++;
        }
        // Bell Sound Band (Broadened: 1,600Hz - 5,500Hz for easy detection)
        else if (freq >= 1600 && freq <= 5500) {
          bellPrimaryEnergy += val;
          bellPrimaryBinCount++;
        }
      }

      const avgSpeech = speechBinCount > 0 ? speechEnergy / speechBinCount : 0;
      const avgWhistle = whistleBinCount > 0 ? whistleEnergy / whistleBinCount : 0;
      const avgBellPrimary = bellPrimaryBinCount > 0 ? bellPrimaryEnergy / bellPrimaryBinCount : 0;

      // Approximate localized dB
      const speechBandDb = Math.round(30 + (avgSpeech / 255) * 65);
      const bellBandDb = Math.round(30 + (avgBellPrimary / 255) * 75);

      // Track bell energy history for cadence
      this.bellEnergyHistory.push(avgBellPrimary);
      if (this.bellEnergyHistory.length > this.historyMaxLength) {
        this.bellEnergyHistory.shift();
      }

      let motorCadenceHz = 0;
      let strikePeakCount = 0;
      const histLen = this.bellEnergyHistory.length;
      if (histLen >= 15) {
        let mean = 0;
        for (let j = 0; j < histLen; j++) mean += this.bellEnergyHistory[j];
        mean /= histLen;

        for (let j = 1; j < histLen - 1; j++) {
          const prev = this.bellEnergyHistory[j - 1];
          const curr = this.bellEnergyHistory[j];
          const next = this.bellEnergyHistory[j + 1];

          if (curr > 20 && curr > prev && curr > next && curr > mean * 1.1) {
            strikePeakCount++;
          }
        }
        motorCadenceHz = Math.round((strikePeakCount / (histLen / 60)) * 10) / 10;
      }

      // === REJECTION & DETECTION LOGIC ===
      let soundClassification: AcousticData['soundClassification'] = 'quiet';
      let voiceRejectionActive = false;
      let whistleRejectionActive = false;
      let bellDetectionScore = 0;

      if (decibels < 38 && avgBellPrimary < 10 && avgSpeech < 10) {
        soundClassification = 'quiet';
        bellDetectionScore = 0;
      }
      // 1. Voice Rejection (Only if speech is distinctly dominant and bell is not ringing)
      else if (avgSpeech > 30 && avgSpeech > avgBellPrimary * 1.8) {
        soundClassification = 'human_voice';
        voiceRejectionActive = true;
        bellDetectionScore = Math.max(0, Math.round((avgBellPrimary / (avgSpeech + 1)) * 30));
      }
      // 2. Whistle Rejection (Only if whistle is distinctly dominant)
      else if (avgWhistle > 45 && avgWhistle > avgBellPrimary * 2.0) {
        soundClassification = 'whistle';
        whistleRejectionActive = true;
        bellDetectionScore = 0;
      }
      // 3. Bell Sound Detection (Generous calculation)
      else if (avgBellPrimary >= 18) {
        const ratio = avgBellPrimary / (avgSpeech + 1);
        const baseScore = Math.min(100, Math.round((avgBellPrimary / 100) * 75 * Math.min(2.0, Math.max(0.8, ratio))));
        bellDetectionScore = Math.min(100, Math.max(35, baseScore));
        soundClassification = 'bell_ringing';
      } else {
        soundClassification = decibels > 45 ? 'ambient_noise' : 'quiet';
        bellDetectionScore = Math.max(0, Math.round((avgBellPrimary / 255) * 50));
      }

      // 32 visual spectrum bars
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

      // Detection condition (Low, friendly thresholds)
      const isBellRingingDetected =
        bellDetectionScore >= this.resonanceThreshold &&
        (bellBandDb >= this.thresholdYellowDb || decibels >= this.thresholdYellowDb) &&
        !voiceRejectionActive &&
        !whistleRejectionActive;

      const now = Date.now();
      let sustainedSec = 0;
      let triggerProgress = 0;

      const isAboveYellow = isBellRingingDetected || (bellDetectionScore >= 40 && decibels >= this.thresholdYellowDb);
      const isAboveRed =
        (bellDetectionScore >= 45 && (bellBandDb >= this.thresholdRedDb || decibels >= this.thresholdRedDb)) ||
        (isBellRingingDetected && decibels >= this.thresholdRedDb);

      if (isAboveYellow) {
        if (this.soundStartTime === null) {
          this.soundStartTime = now;
          this.currentPeakDb = decibels;
        } else {
          this.currentPeakDb = Math.max(this.currentPeakDb, decibels);
        }
        sustainedSec = (now - this.soundStartTime) / 1000;
        triggerProgress = Math.min(1.0, bellDetectionScore / 100);
      } else {
        if (this.soundStartTime !== null) {
          const timeSinceHigh = (now - this.soundStartTime) / 1000;
          if (timeSinceHigh >= 0.3) {
            this.soundStartTime = null;
            this.currentPeakDb = 0;
          }
        }
      }

      // Trigger Alerts
      if (isAboveRed && !voiceRejectionActive) {
        const timeSinceLastRed = now - this.lastRedTriggerTime;
        if (timeSinceLastRed > 6000) {
          this.lastRedTriggerTime = now;
          this.lastYellowTriggerTime = now;
          this.notifyFloodTrigger(decibels, 'red', Math.max(0.2, sustainedSec), 'acoustic_sound_sensor');
        }
      } else if (isAboveYellow && !voiceRejectionActive) {
        const timeSinceLastYellow = now - this.lastYellowTriggerTime;
        const timeSinceLastRed = now - this.lastRedTriggerTime;
        if (timeSinceLastYellow > 8000 && timeSinceLastRed > 4000) {
          this.lastYellowTriggerTime = now;
          this.notifyFloodTrigger(decibels, 'yellow', Math.max(0.2, sustainedSec), 'acoustic_sound_sensor');
        }
      }

      this.latestData = {
        decibels,
        rms,
        peakRms: rms,
        resonanceScore: bellDetectionScore,
        frequencyData: visualBins,
        isWaterRoarDetected: isBellRingingDetected,
        sustainedDurationSec: sustainedSec,
        triggerProgress,
        timestamp: now,
        bellDetectionScore,
        isBellRingingDetected,
        soundClassification,
        voiceRejectionActive,
        whistleRejectionActive,
        motorCadenceHz,
        bellBandDb,
        speechBandDb,
      };

      this.callbacks.forEach((cb) => cb(this.latestData));

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  public simulateSoundTest(severity: FloodSeverity = 'red') {
    this.stopSimulation();
    const isRed = severity === 'red';
    const targetDb = isRed ? 72 : 55;
    const targetScore = isRed ? 88 : 65;

    let tick = 0;
    const durationTicks = 15;

    this.simIntervalId = window.setInterval(() => {
      tick++;
      const isStrikeTick = tick % 2 === 0;
      const currentDb = Math.round(targetDb + (isStrikeTick ? 6 : -4) + (Math.random() - 0.5) * 2);
      const bellScore = Math.min(100, Math.round(targetScore + (Math.random() - 0.5) * 4));

      const simBins: number[] = [];
      for (let i = 0; i < 32; i++) {
        if (i < 10) {
          simBins.push(Math.min(255, Math.round(15 + Math.random() * 15)));
        } else if (i >= 12 && i <= 24) {
          simBins.push(Math.min(255, Math.round(isStrikeTick ? 210 + Math.random() * 30 : 150 + Math.random() * 25)));
        } else {
          simBins.push(Math.min(255, Math.round(25 + Math.random() * 15)));
        }
      }

      const now = Date.now();
      this.latestData = {
        decibels: currentDb,
        rms: currentDb / 100,
        peakRms: currentDb / 100,
        resonanceScore: bellScore,
        frequencyData: simBins,
        isWaterRoarDetected: true,
        sustainedDurationSec: tick * 0.2,
        triggerProgress: Math.min(1.0, tick / 5),
        timestamp: now,
        bellDetectionScore: bellScore,
        isBellRingingDetected: true,
        soundClassification: 'bell_ringing',
        voiceRejectionActive: false,
        whistleRejectionActive: false,
        motorCadenceHz: 10,
        bellBandDb: currentDb,
        speechBandDb: 25,
      };

      this.callbacks.forEach((cb) => cb(this.latestData));

      if (tick === 3) {
        this.notifyFloodTrigger(targetDb, severity, 0.6, 'simulated');
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
