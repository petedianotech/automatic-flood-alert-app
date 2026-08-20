import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Smartphone,
  Zap,
  Save,
  Check,
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
    <div id="diagnostics-view" className="space-y-4 pb-16">
      {/* 1. Threshold & Sensor Tuning Parameters Card */}
      <form
        onSubmit={handleSave}
        className={`rounded-[28px] border p-5 sm:p-6 transition-all shadow-xs space-y-5 ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
            : 'bg-[#F3F3FA] border-[#E0E2EC] text-[#1C1B1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E0E2EC] dark:border-[#444746]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0EFFF] text-[#0B57D0] dark:bg-[#1F71E8]/20 dark:text-[#A8C7FA] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans tracking-tight text-[#1C1B1F] dark:text-[#E3E3E3]">Sensor Settings &amp; Alarm Volume</h2>
              <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
                Configure vibration sensitivity, trigger timer, and siren loudness
              </p>
            </div>
          </div>

          <button
            type="submit"
            id="btn-save-diagnostics-config"
            className="px-5 py-2.5 rounded-full bg-[#1F71E8] hover:bg-[#1557B0] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Settings Saved' : 'Save Settings'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-[#1C1B1F] dark:text-[#E3E3E3]">
                Vibration Alarm Level:
              </label>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#E0EFFF] text-[#0B57D0] dark:bg-[#1F71E8]/20 dark:text-[#A8C7FA] font-bold">
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
              className="w-full h-2 bg-[#E0E2EC] dark:bg-[#444746] rounded-lg appearance-none cursor-pointer accent-[#1F71E8]"
            />
            <div className="flex justify-between text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
              <span>0.5 (Very Sensitive)</span>
              <span>1.5 (Recommended)</span>
              <span>5.0 (Strong Vibration)</span>
            </div>
          </div>

          {/* Continuous Duration Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-[#1C1B1F] dark:text-[#E3E3E3]">
                Continuous Vibration Time:
              </label>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#E0EFFF] text-[#0B57D0] dark:bg-[#1F71E8]/20 dark:text-[#A8C7FA] font-bold">
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
              className="w-full h-2 bg-[#E0E2EC] dark:bg-[#444746] rounded-lg appearance-none cursor-pointer accent-[#1F71E8]"
            />
            <div className="flex justify-between text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
              <span>1.0s (Instant Trigger)</span>
              <span>3.0s (Normal)</span>
              <span>10.0s (Wait longer)</span>
            </div>
          </div>

          {/* Node Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#49454F] dark:text-[#C4C7C5]">
              Sensor Station Name / Location
            </label>
            <input
              type="text"
              value={localConfig.sensorName}
              onChange={(e) => setLocalConfig({ ...localConfig, sensorName: e.target.value })}
              placeholder="River Node #1 - Dzenje Bridge"
              className="w-full px-3.5 py-2.5 rounded-[20px] border border-[#E0E2EC] dark:border-[#444746] bg-white dark:bg-[#1E1F20] text-xs font-semibold text-[#1C1B1F] dark:text-[#E3E3E3] focus:border-[#1F71E8] outline-none"
            />
          </div>

          {/* Node ID */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#49454F] dark:text-[#C4C7C5]">
              Sensor ID Tag
            </label>
            <input
              type="text"
              value={localConfig.nodeId}
              onChange={(e) => setLocalConfig({ ...localConfig, nodeId: e.target.value })}
              placeholder="sensor-node-01"
              className="w-full px-3.5 py-2.5 rounded-[20px] border border-[#E0E2EC] dark:border-[#444746] bg-white dark:bg-[#1E1F20] font-mono text-xs text-[#1C1B1F] dark:text-[#E3E3E3] focus:border-[#1F71E8] outline-none"
            />
          </div>

          {/* Siren Volume Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-[#1C1B1F] dark:text-[#E3E3E3]">
                Emergency Siren Loudness:
              </label>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#E0EFFF] text-[#0B57D0] dark:bg-[#1F71E8]/20 dark:text-[#A8C7FA] font-bold">
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
              className="w-full h-2 bg-[#E0E2EC] dark:bg-[#444746] rounded-lg appearance-none cursor-pointer accent-[#1F71E8]"
            />
          </div>

          {/* Siren Test Button */}
          <div className="flex items-end">
            <button
              type="button"
              id="btn-toggle-siren-test"
              onClick={handleToggleSirenTest}
              className={`w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isSirenTesting
                  ? 'bg-[#BA1A1A] text-white shadow-xs'
                  : 'bg-white hover:bg-[#E0EFFF] dark:bg-[#28292A] dark:hover:bg-[#303134] text-[#1C1B1F] dark:text-[#E3E3E3] border border-[#E0E2EC] dark:border-[#444746]'
              }`}
            >
              {isSirenTesting ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#1F71E8] dark:text-[#A8C7FA]" />}
              <span>{isSirenTesting ? 'Stop Siren Test' : 'Test Siren Sound'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 2. Device Hardware & Sensors Health */}
      <div
        className={`rounded-[28px] border p-5 sm:p-6 transition-all shadow-xs space-y-4 ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
            : 'bg-[#F3F3FA] border-[#E0E2EC] text-[#1C1B1F]'
        }`}
      >
        <h3 className="text-base font-bold font-sans text-[#1C1B1F] dark:text-[#E3E3E3]">Phone Sensors &amp; System Status</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Motion Sensor API */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#1C1B1F] dark:text-[#E3E3E3]">
                <Smartphone className="w-4 h-4 text-[#1F71E8] dark:text-[#A8C7FA]" />
                Movement Sensor
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  sensorState.isListening
                    ? 'bg-[#E6F4EA] text-[#0D652D] dark:bg-[#137333]/20 dark:text-[#81C995]'
                    : 'bg-[#F1F3F4] text-[#49454F] dark:bg-[#2D2E30] dark:text-[#C4C7C5]'
                }`}
              >
                {sensorState.isListening ? 'Active' : 'Idle'}
              </span>
            </div>
            <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
              Permission: <strong className="text-[#1C1B1F] dark:text-white">{sensorState.permissionStatus}</strong> &bull; Hardware:{' '}
              {sensorState.isSupported ? 'Supported' : 'Unavailable'}
            </p>
            <button
              onClick={onRequestMotionPermission}
              className="text-xs text-[#1F71E8] dark:text-[#A8C7FA] font-bold hover:underline cursor-pointer"
            >
              Check Permissions &rarr;
            </button>
          </div>

          {/* Screen Wake Lock API */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#1C1B1F] dark:text-[#E3E3E3]">
                <Zap className="w-4 h-4 text-[#1F71E8] dark:text-[#A8C7FA]" />
                Screen Stay-Awake
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  wakeLockState.isActive
                    ? 'bg-[#E6F4EA] text-[#0D652D] dark:bg-[#137333]/20 dark:text-[#81C995]'
                    : 'bg-[#FFDAD6] text-[#BA1A1A] dark:bg-[#BA1A1A]/20 dark:text-[#FFB4AB]'
                }`}
              >
                {wakeLockState.isActive ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
              Keeps phone screen on while plugged into charger.
            </p>
            <button
              onClick={onRequestWakeLock}
              className="text-xs text-[#1F71E8] dark:text-[#A8C7FA] font-bold hover:underline cursor-pointer"
            >
              Keep Screen Awake &rarr;
            </button>
          </div>

          {/* Web Audio API */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#1C1B1F] dark:text-[#E3E3E3]">
                <Volume2 className="w-4 h-4 text-[#1F71E8] dark:text-[#A8C7FA]" />
                Siren Speaker
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#0D652D] dark:bg-[#137333]/20 dark:text-[#81C995]">
                Ready
              </span>
            </div>
            <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
              Emergency warning sound synthesizer speaker.
            </p>
            <button
              onClick={onTestSiren}
              className="text-xs text-[#1F71E8] dark:text-[#A8C7FA] font-bold hover:underline cursor-pointer"
            >
              Play Siren Sound &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
