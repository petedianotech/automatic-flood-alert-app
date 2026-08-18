import React, { useState } from 'react';
import {
  ShieldOff,
  Pause,
  Play,
  Radio,
  ArrowRight,
  ArrowLeft,
  Activity,
  Mic,
  Sliders,
  RotateCcw,
  Check,
} from 'lucide-react';
import { LiveMotionMeter } from './LiveMotionMeter';
import { LiveAcousticMeter } from './LiveAcousticMeter';
import {
  MotionData,
  MotionSensorState,
  AcousticData,
  AcousticSensorState,
  SensorDetectionMode,
  WakeLockState,
  SensorConfig,
  UserProfile,
  SensorLocation,
} from '../types';

interface SensorNodeViewProps {
  motion: MotionData;
  sensorState: MotionSensorState;
  soundData: AcousticData;
  acousticState: AcousticSensorState;
  activeDetectionMode: SensorDetectionMode;
  onSelectDetectionMode: (mode: SensorDetectionMode) => void;
  wakeLockState: WakeLockState;
  config: SensorConfig;
  isArmed: boolean;
  isPaused: boolean;
  sustainedDuration: number;
  triggerProgress: number;
  isDarkMode: boolean;
  isAdmin?: boolean;
  currentUser?: UserProfile | null;
  onToggleArm: () => void;
  onTogglePause: () => void;
  onCalibrate: () => Promise<number>;
  onSimulateTest: (severity?: 'yellow' | 'red') => void;
  onSimulateSoundTest?: (severity?: 'yellow' | 'red') => void;
  onRequestWakeLock: () => void;
  onManualTriggerAlert: (severity?: 'yellow' | 'red') => void;
  onUpdateLocation?: (location: SensorLocation) => void;
  onUpdateSoundConfig?: (thresholdYellowDb: number, thresholdRedDb: number, sensitivity: number) => void;
  onOpenAuthModal?: () => void;
  onGoToReceiver?: () => void;
  onGoToAdmin?: () => void;
}

export const SensorNodeView: React.FC<SensorNodeViewProps> = ({
  motion,
  soundData,
  activeDetectionMode = 'motion',
  onSelectDetectionMode,
  config,
  isArmed,
  isPaused,
  sustainedDuration,
  triggerProgress,
  isDarkMode,
  isAdmin = false,
  onToggleArm,
  onTogglePause,
  onCalibrate,
  onSimulateTest,
  onSimulateSoundTest,
  onUpdateSoundConfig,
  onGoToReceiver,
  onGoToAdmin,
}) => {
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);

  // Sound thresholds state
  const [yellowDb, setYellowDb] = useState<number>(config.thresholdYellowDb || 48);
  const [redDb, setRedDb] = useState<number>(config.thresholdRedDb || 60);
  const [soundSensitivity, setSoundSensitivity] = useState<number>(config.soundResonanceSensitivity || 1.3);

  // Non-admin view (Community radar fallback)
  if (!isAdmin) {
    return (
      <div id="sensor-owner-gate" className="space-y-4">
        <div
          className={`rounded-3xl border p-6 sm:p-7 text-center shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center">
            <Radio className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold font-sans tracking-tight">
            Community Alert Mode
          </h2>

          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6] mt-1.5 max-w-md mx-auto leading-relaxed">
            Your device receives real-time flood warning sirens and safety broadcasts from river sensors.
          </p>

          <div className="mt-5 flex justify-center max-w-md mx-auto">
            {onGoToReceiver && (
              <button
                type="button"
                id="btn-goto-receiver"
                onClick={onGoToReceiver}
                className="w-full py-3 px-4 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Radio className="w-4 h-4" />
                <span>Open Community Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSoundThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSoundConfig) {
      onUpdateSoundConfig(yellowDb, redDb, soundSensitivity);
    }
    setIsSoundSettingsOpen(false);
  };

  // Sensor activation handlers
  const handleTurnOnMode = (mode: SensorDetectionMode) => {
    onSelectDetectionMode(mode);
    if (!isArmed) {
      onToggleArm();
    }
  };

  const isMotionActive = activeDetectionMode === 'motion';
  const isSoundActive = activeDetectionMode === 'sound';

  return (
    <div id="sensor-node-view" className="space-y-4 pb-20">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & NAVIGATION CARD                                     */}
      {/* =================================================================== */}
      <div
        id="sensor-station-header-card"
        className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${
                !isArmed
                  ? 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                  : isMotionActive
                  ? 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
                  : 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995]'
              }`}
            >
              {isMotionActive ? <Activity className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1A73E8] dark:bg-[#8AB4F8]" />
                  River Sensor Station
                </span>

                {isArmed ? (
                  isPaused ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF7E0] text-[#B06000] dark:bg-[#B06000]/20 dark:text-[#FDD663]">
                      Paused
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />
                      Live Monitoring
                    </span>
                  )
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F3F4] text-[#5F6368] dark:bg-[#2D2E30] dark:text-[#9AA0A6]">
                    Standby (Off)
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight">
                Flood Sensor Station
              </h1>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                Monitors water movement and warning bell sound. Triggers village siren when water rises.
              </p>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onGoToAdmin && (
              <button
                type="button"
                id="btn-nav-to-admin-dashboard"
                onClick={onGoToAdmin}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <span>Safety Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onGoToReceiver && (
              <button
                type="button"
                id="btn-nav-to-receiver-radar"
                onClick={onGoToReceiver}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <Radio className="w-3.5 h-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
                <span>Community Radar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. SENSOR SELECTOR BAR (Material 3 Segmented Pills)                 */}
      {/* =================================================================== */}
      <div
        id="sensor-mode-selector-card"
        className={`p-3.5 rounded-3xl border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
            Active Sensor:
          </span>
          <div className="flex items-center gap-1.5 bg-[#F1F3F4] dark:bg-[#28292A] p-1 rounded-full">
            <button
              type="button"
              id="select-mode-motion-btn"
              onClick={() => onSelectDetectionMode('motion')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                isMotionActive
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Vibration Sensor</span>
            </button>

            <button
              type="button"
              id="select-mode-sound-btn"
              onClick={() => onSelectDetectionMode('sound')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                isSoundActive
                  ? 'bg-[#137333] text-white shadow-xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Bell Sound Sensor</span>
            </button>
          </div>
        </div>

        {/* Master Power Controls */}
        <div className="flex items-center gap-2">
          {isArmed ? (
            <>
              {/* Pause / Resume */}
              <button
                type="button"
                id="btn-pause-resume"
                onClick={onTogglePause}
                className={`px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                  isPaused
                    ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                    : 'bg-[#FEF7E0] text-[#B06000] hover:bg-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              {/* Sound Calibration Settings Toggle */}
              {isSoundActive && (
                <button
                  type="button"
                  id="btn-sound-settings-toggle"
                  onClick={() => setIsSoundSettingsOpen(!isSoundSettingsOpen)}
                  className="px-3.5 py-1.5 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Sound Levels</span>
                </button>
              )}

              {/* Turn Off Button */}
              <button
                type="button"
                id="btn-turn-off-sensor"
                onClick={onToggleArm}
                className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-[#FCE8E6] text-[#D93025] hover:bg-[#FAD2CF] dark:bg-[#D93025]/20 dark:text-[#F28B82] flex items-center gap-1.5 transition-all active:scale-95"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                <span>Turn Off</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              id="btn-turn-on-active-sensor"
              onClick={() => handleTurnOnMode(activeDetectionMode as SensorDetectionMode)}
              className="px-5 py-2 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Turn On Sensor</span>
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. SOUND CALIBRATION FORM (Collapsible)                            */}
      {/* =================================================================== */}
      {isSoundActive && isSoundSettingsOpen && (
        <form
          onSubmit={handleSaveSoundThresholds}
          className={`p-5 rounded-3xl border shadow-xs space-y-4 ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#E1E3E1] dark:border-[#303134]">
            <div>
              <h3 className="font-bold text-sm font-sans">
                Warning Bell Sound Levels
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Set the loudness thresholds to detect the warning bell and filter background noise.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setYellowDb(48);
                setRedDb(60);
                setSoundSensitivity(1.3);
              }}
              className="text-xs font-bold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline"
            >
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
                Warning Level ({yellowDb} dB)
              </label>
              <input
                type="range"
                min={35}
                max={65}
                value={yellowDb}
                onChange={(e) => setYellowDb(Number(e.target.value))}
                className="w-full accent-[#B06000]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
                Alarm Level ({redDb} dB)
              </label>
              <input
                type="range"
                min={50}
                max={85}
                value={redDb}
                onChange={(e) => setRedDb(Number(e.target.value))}
                className="w-full accent-[#D93025]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
                Sensitivity ({soundSensitivity.toFixed(1)}x)
              </label>
              <input
                type="range"
                min={0.8}
                max={2.5}
                step={0.1}
                value={soundSensitivity}
                onChange={(e) => setSoundSensitivity(Number(e.target.value))}
                className="w-full accent-[#137333]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSoundSettingsOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#137333] hover:bg-[#0D652D] text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Sound Levels</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* 4. ACTIVE SENSOR LIVE METERS                                        */}
      {/* =================================================================== */}
      {isMotionActive ? (
        <LiveMotionMeter
          motion={motion}
          thresholdYellow={config.thresholdYellow}
          thresholdRed={config.thresholdRed || config.thresholdDelta}
          threshold={config.thresholdDelta}
          continuousDuration={config.continuousDurationSec}
          sustainedDuration={sustainedDuration}
          triggerProgress={triggerProgress}
          isArmed={isArmed}
          isPaused={isPaused}
          baselineGravity={config.baselineGravity}
          isDarkMode={isDarkMode}
          onSimulateTest={onSimulateTest}
          onCalibrate={onCalibrate}
        />
      ) : (
        <LiveAcousticMeter
          soundData={soundData}
          thresholdYellowDb={yellowDb}
          thresholdRedDb={redDb}
          isArmed={isArmed}
          isPaused={isPaused}
          isDarkMode={isDarkMode}
          onSimulateSoundTest={onSimulateSoundTest}
        />
      )}
    </div>
  );
};
