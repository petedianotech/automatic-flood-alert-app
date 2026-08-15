/**
 * Web Audio Siren API Service
 * Synthesizes high-pitched oscillating emergency alarm sound using HTML5 Web Audio API
 */

class SirenAudioService {
  private audioCtx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.85;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => {
        console.warn('AudioContext resume deferred until user interaction:', err);
      });
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public startEmergencySiren() {
    if (this.isPlaying) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.1);
      this.masterGain.connect(this.audioCtx.destination);

      // Main Oscillator 1: High frequency emergency sweep (800Hz - 1600Hz)
      this.osc1 = this.audioCtx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(1100, now);

      // Main Oscillator 2: Sub-harmonic carrier (950Hz)
      this.osc2 = this.audioCtx.createOscillator();
      this.osc2.type = 'square';
      this.osc2.frequency.setValueAtTime(950, now);

      // Low Frequency Oscillator (LFO) to create the rising/falling urgent siren sweep (2.5 Hz)
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.type = 'triangle';
      this.lfo.frequency.setValueAtTime(2.2, now); // ~2.2 sweeps per second

      // LFO Gain to modulate pitch by +/- 450 Hz
      this.lfoGain = this.audioCtx.createGain();
      this.lfoGain.gain.setValueAtTime(450, now);

      // Connect LFO to modulate oscillator frequencies
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc1.frequency);
      this.lfoGain.connect(this.osc2.frequency);

      // Connect oscillators to master gain
      const osc1Gain = this.audioCtx.createGain();
      osc1Gain.gain.setValueAtTime(0.6, now);
      this.osc1.connect(osc1Gain);
      osc1Gain.connect(this.masterGain);

      const osc2Gain = this.audioCtx.createGain();
      osc2Gain.gain.setValueAtTime(0.4, now);
      this.osc2.connect(osc2Gain);
      osc2Gain.connect(this.masterGain);

      // Start all nodes
      this.lfo.start(now);
      this.osc1.start(now);
      this.osc2.start(now);

      this.isPlaying = true;
    } catch (err) {
      console.error('Failed to start siren audio context:', err);
    }
  }

  public stopEmergencySiren() {
    if (!this.isPlaying) return;

    try {
      if (this.masterGain && this.audioCtx) {
        const now = this.audioCtx.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      }

      setTimeout(() => {
        try {
          this.osc1?.stop();
          this.osc1?.disconnect();
          this.osc2?.stop();
          this.osc2?.disconnect();
          this.lfo?.stop();
          this.lfo?.disconnect();
          this.lfoGain?.disconnect();
          this.masterGain?.disconnect();
        } catch {
          // ignore cleanup errors
        } finally {
          this.osc1 = null;
          this.osc2 = null;
          this.lfo = null;
          this.lfoGain = null;
          this.masterGain = null;
          this.isPlaying = false;
        }
      }, 180);
    } catch (err) {
      console.error('Error stopping emergency siren:', err);
      this.isPlaying = false;
    }
  }

  private isPlayingWarning: boolean = false;
  private warningIntervalId: number | null = null;

  public playWarningAlertSound() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Tone 1 (Amber Advisory Chime)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(this.volume * 0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2 (Higher tone 160ms later)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.16); // A5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(this.volume * 0.85, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.55);
    } catch {
      // ignore
    }
  }

  public startWarningChime() {
    if (this.isPlayingWarning) return;
    this.isPlayingWarning = true;
    this.playWarningAlertSound();
    this.warningIntervalId = window.setInterval(() => {
      this.playWarningAlertSound();
    }, 2200);
  }

  public stopWarningChime() {
    this.isPlayingWarning = false;
    if (this.warningIntervalId !== null) {
      clearInterval(this.warningIntervalId);
      this.warningIntervalId = null;
    }
  }

  public stopAllAlarms() {
    this.stopEmergencySiren();
    this.stopWarningChime();
  }

  public playBeep(freq = 880, durationMs = 120) {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000);
    } catch {
      // ignore
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const sirenService = new SirenAudioService();
