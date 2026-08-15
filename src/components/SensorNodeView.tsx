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
  onUpdateSoundConfig,
  onGoToReceiver,
  onGoToAdmin,
}) => {
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);

  // Sound thresholds state
  const [yellowDb, setYellowDb] = useState<number>(config.thresholdYellowDb || 68);
  const [redDb, setRedDb] = useState<number>(config.thresholdRedDb || 82);
  const [soundSensitivity, setSoundSensitivity] = useState<number>(config.soundResonanceSensitivity || 1.2);

  // Non-admin view (Community radar fallback)
  if (!isAdmin) {
    return (
      <div id="sensor-owner-gate" className="space-y-4 animate-in fade-in duration-200">
        <div
          className={`rounded-3xl border p-6 sm:p-7 text-center shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center">
            <Radio className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold font-sans tracking-tight">
            Community Alert Mode
          </h2>

          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6] mt-2 max-w-md mx-auto leading-relaxed">
            Your device receives real-time flood sirens and safety roll-call broadcasts from Dzenje CDSS ADDA STEM Club flood sensors.
          </p>

          <div className="mt-6 flex justify-center max-w-md mx-auto">
            {onGoToReceiver && (
              <button
                id="btn-goto-receiver"
                onClick={onGoToReceiver}
                className="w-full py-3 px-4 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
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
    <div id="sensor-node-view" className="space-y-4 pb-24 animate-in fade-in duration-150">
      
      {/* =================================================================== */}
      {/* STATE A: WHEN SENSORS ARE OFF (Clean Sensor Type Cards)             */}
      {/* =================================================================== */}
      {!isArmed ? (
        <div id="sensors-off-container" className="space-y-4">
          {/* Header Overview Card */}
          <div
            className={`rounded-3xl border p-5 transition-all shadow-xs ${
              isDarkMode
                ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
                : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">
                    Flood Sensors Station
                  </h2>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    Off (Standby)
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                  Choose a sensor below and tap turn on to begin active monitoring.
                </p>
              </div>

              {onGoToAdmin && (
                <button
                  type="button"
                  id="btn-go-to-admin-from-sensors-standby"
                  onClick={onGoToAdmin}
                  className="px-3.5 py-2 rounded-2xl bg-[#E8F0FE] hover:bg-[#D2E3FC] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] text-xs font-bold flex items-center gap-1.5 self-start sm:self-center shrink-0 transition-all active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go to Roll-Call Dashboard</span>
                </button>
              )}
            </div>
          </div>

          {/* 2 Clean Sensor Cards to Activate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Vibration Sensor */}
            <div
              id="card-motion-sensor-standby"
              className={`rounded-3xl border p-5 transition-all flex flex-col justify-between shadow-xs ${
                isDarkMode
                  ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
                  : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Sensor Off
                  </span>
                </div>

                <h3 className="text-base font-bold tracking-tight">
                  Vibration Sensor
                </h3>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1.5 leading-relaxed">
                  Senses vibration from the motor that rotates when flood is detected.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  id="btn-activate-motion-sensor"
                  onClick={() => handleTurnOnMode('motion')}
                  className="w-full py-3 px-4 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Turn On Vibration Sensor</span>
                </button>
              </div>
            </div>

            {/* Card 2: Sound Sensor */}
            <div
              id="card-sound-sensor-standby"
              className={`rounded-3xl border p-5 transition-all flex flex-col justify-between shadow-xs ${
                isDarkMode
                  ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
                  : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Sensor Off
                  </span>
                </div>

                <h3 className="text-base font-bold tracking-tight">
                  Sound Sensor
                </h3>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1.5 leading-relaxed">
                  Senses the sound from the warning bell made in the system.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  id="btn-activate-sound-sensor"
                  onClick={() => handleTurnOnMode('sound')}
                  className="w-full py-3 px-4 rounded-2xl bg-[#0F9D58] hover:bg-[#0B8043] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Turn On Sound Sensor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* STATE B: WHEN A SENSOR IS ON (Active Sensor Toolbar & Live Meter)    */
        /* =================================================================== */
        <div id="active-sensor-container" className="space-y-4">
          {/* Back Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white dark:bg-[#1E1F20] border border-[#E1E3E1] dark:border-[#303134] shadow-2xs">
            <button
              type="button"
              id="btn-nav-back-to-sensors-list"
              onClick={onToggleArm}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#28292C] dark:hover:bg-[#3C4043] text-xs font-bold text-[#1F1F1F] dark:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-[#1A73E8] shrink-0" />
              <span>← Go Back to All Sensors List</span>
            </button>

            {onGoToAdmin && (
              <button
                type="button"
                id="btn-nav-back-to-admin-rollcall"
                onClick={onGoToAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8F0FE] hover:bg-[#D2E3FC] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] text-xs font-bold transition-all active:scale-95"
              >
                <span>Safety Roll-Call</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>

          {/* Active Sensor Control Card */}
          <div
            className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
              isDarkMode
                ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
                : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">
                    {isMotionActive ? 'Vibration Sensor Active' : 'Sound Sensor Active'}
                  </h2>
                  {isPaused ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Paused
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/30 dark:text-[#81C995] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />
                      Listening for Floods
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  {isMotionActive
                    ? 'Monitoring motor rotation vibration when flood is detected.'
                    : 'Monitoring sound from the system warning bell.'}
                </p>
              </div>

              {/* Action Buttons: Switch, Pause, Settings, Turn Off */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Switch to Other Sensor */}
                {isMotionActive ? (
                  <button
                    type="button"
                    onClick={() => onSelectDetectionMode('sound')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] hover:bg-[#CEEAD6] transition-colors"
                  >
                    Switch to Sound Sensor
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectDetectionMode('motion')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#E8F0FE] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] hover:bg-[#D2E3FC] transition-colors"
                  >
                    Switch to Vibration Sensor
                  </button>
                )}

                {/* Pause / Resume */}
                <button
                  type="button"
                  id="btn-pause-resume"
                  onClick={onTogglePause}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all active:scale-95 ${
                    isPaused
                      ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
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

                {/* Sound Settings button if sound sensor is active */}
                {isSoundActive && (
                  <button
                    type="button"
                    onClick={() => setIsSoundSettingsOpen(!isSoundSettingsOpen)}
                    className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/[0.08]"
                    title="Sound Settings"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Turn Off Sensor Button */}
                <button
                  type="button"
                  id="btn-turn-off-sensor"
                  onClick={onToggleArm}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>Turn Off Sensor</span>
                </button>
              </div>
            </div>

            {/* Sound Calibration Settings (Collapsible) */}
            {isSoundActive && isSoundSettingsOpen && (
              <form onSubmit={handleSaveSoundThresholds} className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                    Bell Sound Threshold Levels
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setYellowDb(68);
                      setRedDb(82);
                      setSoundSensitivity(1.2);
                    }}
                    className="text-[10px] font-bold text-[#1A73E8] hover:underline"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                      Warning Level ({yellowDb} dB)
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={78}
                      value={yellowDb}
                      onChange={(e) => setYellowDb(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                      Danger Alarm Level ({redDb} dB)
                    </label>
                    <input
                      type="range"
                      min={75}
                      max={98}
                      value={redDb}
                      onChange={(e) => setRedDb(Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                      Microphone Sensitivity ({soundSensitivity.toFixed(1)}x)
                    </label>
                    <input
                      type="range"
                      min={0.8}
                      max={2.5}
                      step={0.1}
                      value={soundSensitivity}
                      onChange={(e) => setSoundSensitivity(Number(e.target.value))}
                      className="w-full accent-[#0F9D58]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSoundSettingsOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-black/[0.05] dark:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0F9D58] hover:bg-[#0B8043] text-white transition-colors"
                  >
                    Save Sound Levels
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Active Live Meter */}
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
            />
          ) : (
            <LiveAcousticMeter
              soundData={soundData}
              thresholdYellowDb={yellowDb}
              thresholdRedDb={redDb}
              isArmed={isArmed}
              isPaused={isPaused}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      )}
    </div>
  );
};
