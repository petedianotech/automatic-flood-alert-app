import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Smartphone,
  Zap,
  Radio,
  Sparkles,
  Save,
  Check,
  Shield,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { SensorConfig, MotionSensorState, WakeLockState } from '../types';
import { sirenService } from '../services/audioSiren';

interface DiagnosticsViewProps {
  config: SensorConfig;
  onUpdateConfig: (newConfig: SensorConfig) => void;
  sensorState: MotionSensorState;
  wakeLockState: WakeLockState;
  onRequestWakeLock: () => void;
  onRequestMotionPermission: () => Promise<string>;
  onTestSiren: () => void;
  isDarkMode: boolean;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  config,
  onUpdateConfig,
  sensorState,
  wakeLockState,
  onRequestWakeLock,
  onRequestMotionPermission,
  onTestSiren,
  isDarkMode,
}) => {
  const [localConfig, setLocalConfig] = useState<SensorConfig>(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isSirenTesting, setIsSirenTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(localConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleToggleSirenTest = () => {
    if (isSirenTesting) {
      sirenService.stopEmergencySiren();
      setIsSirenTesting(false);
    } else {
      sirenService.setVolume(localConfig.sirenVolume);
      sirenService.startEmergencySiren();
      setIsSirenTesting(true);
    }
  };

  return (
    <div id="diagnostics-view" className="space-y-6">
      {/* 1. Threshold & Sensor Tuning Parameters Card */}
      <form
        onSubmit={handleSave}
        className={`rounded-3xl border p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1A73E8]/10 text-[#1A73E8] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans">Sensor Calibration &amp; Threshold Tuning</h2>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Configure physical water vibrator sensitivity and trip timing
              </p>
            </div>
          </div>

          <button
            type="submit"
            id="btn-save-diagnostics-config"
            className="px-5 py-2.5 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Settings Saved!' : 'Save Config'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-[#1F1F1F] dark:text-[#E3E3E3]">
                Vibration Trip Threshold ($\Delta$):
              </label>
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#1A73E8] font-bold">
                {localConfig.thresholdDelta.toFixed(2)} m/s²
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={localConfig.thresholdDelta}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, thresholdDelta: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1A73E8]"
            />
            <div className="flex justify-between text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              <span>0.5 m/s² (Very Sensitive)</span>
              <span>1.5 m/s² (Recommended)</span>
              <span>5.0 m/s² (Heavy Jolts)</span>
            </div>
          </div>

          {/* Continuous Duration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-[#1F1F1F] dark:text-[#E3E3E3]">
                Continuous Vibration Hold Duration:
              </label>
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#1A73E8] font-bold">
                {localConfig.continuousDurationSec.toFixed(1)} Seconds
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={localConfig.continuousDurationSec}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, continuousDurationSec: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1A73E8]"
            />
            <div className="flex justify-between text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              <span>1.0s (Fast Trip)</span>
              <span>3.0s (Default)</span>
              <span>10.0s (High Filter)</span>
            </div>
          </div>

          {/* Node Name */}
          <div>
            <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
              Sensor Node Location / Name
            </label>
            <input
              type="text"
              value={localConfig.sensorName}
              onChange={(e) => setLocalConfig({ ...localConfig, sensorName: e.target.value })}
              placeholder="Basement Sump Pump Sensor"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-transparent text-xs font-semibold focus:ring-2 focus:ring-[#1A73E8] outline-none"
            />
          </div>

          {/* Node ID */}
          <div>
            <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
              Node Identifier (Unique Tag)
            </label>
            <input
              type="text"
              value={localConfig.nodeId}
              onChange={(e) => setLocalConfig({ ...localConfig, nodeId: e.target.value })}
              placeholder="sensor-node-01"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-transparent font-mono text-xs focus:ring-2 focus:ring-[#1A73E8] outline-none"
            />
          </div>

          {/* Siren Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-[#1F1F1F] dark:text-[#E3E3E3]">
                Emergency Siren Audio Volume:
              </label>
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#1A73E8] font-bold">
                {Math.round(localConfig.sirenVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.sirenVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setLocalConfig({ ...localConfig, sirenVolume: vol });
                sirenService.setVolume(vol);
              }}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1A73E8]"
            />
          </div>

          {/* Siren Test Button */}
          <div className="flex items-end">
            <button
              type="button"
              id="btn-toggle-siren-test"
              onClick={handleToggleSirenTest}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                isSirenTesting
                  ? 'bg-[#D93025] text-white border-transparent shadow-xs animate-pulse'
                  : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10'
              }`}
            >
              {isSirenTesting ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#1A73E8]" />}
              <span>{isSirenTesting ? 'Stop Audio Siren Test' : 'Test Audio Siren Synth'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 2. Web API Diagnostics & Hardware Health */}
      <div
        className={`rounded-3xl border p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <h3 className="text-base font-bold font-sans mb-4">Underlying Web APIs Diagnostics</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Motion Sensor API */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#1A73E8]" />
                Device Motion API
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  sensorState.isListening
                    ? 'bg-[#E6F4EA] text-[#137333]'
                    : 'bg-[#F1F3F4] text-[#5F6368]'
                }`}
              >
                {sensorState.isListening ? 'LISTENING' : 'IDLE'}
              </span>
            </div>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              Permission: <strong>{sensorState.permissionStatus}</strong> • Hardware:{' '}
              {sensorState.isSupported ? 'Supported' : 'Unavailable'}
            </p>
            <button
              onClick={onRequestMotionPermission}
              className="text-[11px] text-[#1A73E8] font-bold hover:underline"
            >
              Re-query Permissions →
            </button>
          </div>

          {/* Screen Wake Lock API */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#1A73E8]" />
                Screen Wake Lock
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  wakeLockState.isActive
                    ? 'bg-[#E6F4EA] text-[#137333]'
                    : 'bg-[#FCE8E6] text-[#D93025]'
                }`}
              >
                {wakeLockState.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              Prevents phone display from sleeping while plugged in.
            </p>
            <button
              onClick={onRequestWakeLock}
              className="text-[11px] text-[#1A73E8] font-bold hover:underline"
            >
              Request Screen Lock →
            </button>
          </div>

          {/* Web Audio API */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#1A73E8]" />
                Web Audio Siren
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333]">
                READY
              </span>
            </div>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              Oscillating frequency synthesizer with sawtooth &amp; square carrier LFO sweep.
            </p>
            <button
              onClick={onTestSiren}
              className="text-[11px] text-[#1A73E8] font-bold hover:underline"
            >
              Play Siren Blast →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
