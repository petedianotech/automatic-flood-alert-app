import React, { useState } from 'react';
import {
  Shield,
  ShieldOff,
  Pause,
  Play,
  Crosshair,
  Sparkles,
  Zap,
  CheckCircle2,
  BellRing,
  Lock,
  User,
  Radio,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { LiveMotionMeter } from './LiveMotionMeter';
import {
  MotionData,
  MotionSensorState,
  WakeLockState,
  SensorConfig,
  UserProfile,
  ADMIN_EMAIL,
} from '../types';

interface SensorNodeViewProps {
  motion: MotionData;
  sensorState: MotionSensorState;
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
  onSimulateTest: (durationSec?: number, peakForce?: number) => void;
  onRequestWakeLock: () => void;
  onManualTriggerAlert: () => void;
  onOpenAuthModal?: () => void;
  onGoToReceiver?: () => void;
}

export const SensorNodeView: React.FC<SensorNodeViewProps> = ({
  motion,
  sensorState,
  wakeLockState,
  config,
  isArmed,
  isPaused,
  sustainedDuration,
  triggerProgress,
  isDarkMode,
  isAdmin = false,
  currentUser,
  onToggleArm,
  onTogglePause,
  onCalibrate,
  onSimulateTest,
  onRequestWakeLock,
  onManualTriggerAlert,
  onOpenAuthModal,
  onGoToReceiver,
}) => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState<number | null>(null);

  // If user is not the designated admin (petedianotech@gmail.com), render owner lock gate
  if (!isAdmin) {
    return (
      <div id="sensor-owner-gate" className="space-y-4 animate-in fade-in duration-200">
        {/* Security Lock Card */}
        <div
          className={`rounded-3xl border p-6 sm:p-7 text-center shadow-md ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          {/* Lock Icon Emblem */}
          <div className="w-16 h-16 rounded-3xl mx-auto mb-4 bg-[#FEF7E0] dark:bg-amber-950/40 border border-[#FEEFC3] dark:border-amber-900/50 flex items-center justify-center text-amber-600 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF7E0] text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-[#FEEFC3] dark:border-amber-900/50 mb-2">
            <span>App Owner &amp; Manager Screen</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
            Sensor Node Control Restricted
          </h2>

          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6] mt-2 max-w-md mx-auto leading-relaxed">
            Physical water accelerometer calibration, sensor sensitivity thresholds, and river basin trip points can only be operated by the system owner:
          </p>

          {/* Target Admin Email Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mt-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 font-mono text-xs font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
            <span>👑 {ADMIN_EMAIL}</span>
          </div>

          {/* Current User Status Banner */}
          <div className="mt-5 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs text-left max-w-md mx-auto flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold block text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                {currentUser ? currentUser.name : 'Guest User'}
              </span>
              <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] truncate block">
                {currentUser?.email
                  ? `${currentUser.email} (Receiver Node)`
                  : currentUser?.village
                  ? `${currentUser.village} (Receiver Node)`
                  : 'Not signed in with Owner Google Account'}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            {onOpenAuthModal && (
              <button
                id="btn-owner-sign-in"
                onClick={onOpenAuthModal}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>Sign In as Owner (Google)</span>
              </button>
            )}

            {onGoToReceiver && (
              <button
                id="btn-goto-receiver"
                onClick={onGoToReceiver}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#1F1F1F] dark:text-[#E3E3E3] border border-black/10 dark:border-white/10 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Radio className="w-4 h-4 text-[#D93025]" />
                <span>Go to Receiver Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Resident Capability Info */}
        <div
          className={`rounded-3xl border p-5 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-3">
            Receiver Node Capabilities for Community Members
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#137333] dark:text-[#81C995]">
                <BellRing className="w-3.5 h-3.5" />
                <span>Background OS Push Alerts</span>
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                Instant push notifications even when the screen is locked or offline.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#D93025]">
                <Zap className="w-3.5 h-3.5" />
                <span>Emergency Audio Sirens</span>
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                900Hz piercing alarms and phone vibrations upon flood trip.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCalibrateClick = async () => {
    setIsCalibrating(true);
    setCalibrationSuccess(null);
    try {
      const newBaseline = await onCalibrate();
      setCalibrationSuccess(newBaseline);
      setTimeout(() => setCalibrationSuccess(null), 3000);
    } finally {
      setIsCalibrating(false);
    }
  };

  const isSensorActive = isArmed && !isPaused;

  return (
    <div id="sensor-node-view" className="space-y-5">
      {/* 1. Main Sensor Control Panel */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs ${
          isSensorActive
            ? isDarkMode
              ? 'bg-[#1E1F20] border-[#1A73E8]/40'
              : 'bg-white border-[#1A73E8]/30 shadow-blue-500/5'
            : isPaused
            ? isDarkMode
              ? 'bg-[#1E1F20] border-amber-500/40'
              : 'bg-white border-amber-300 shadow-amber-500/5'
            : isDarkMode
            ? 'bg-[#1E1F20] border-[#303134]'
            : 'bg-white border-[#E1E3E1]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Node Identity & Status */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                id="sensor-status-badge"
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  isSensorActive
                    ? 'bg-[#E8F0FE] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
                    : isPaused
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSensorActive
                      ? 'bg-[#1A73E8] animate-ping'
                      : isPaused
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                  }`}
                />
                {isSensorActive
                  ? 'ACTIVE MONITORING'
                  : isPaused
                  ? 'SENSOR PAUSED'
                  : 'STANDBY / DISARMED'}
              </span>

              {/* Wake Lock Status Pill */}
              <button
                id="btn-wake-lock-status"
                onClick={onRequestWakeLock}
                title="Keeps screen awake 24/7"
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-colors ${
                  wakeLockState.isActive
                    ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6] dark:bg-[#137333]/20 dark:text-[#81C995] dark:border-[#137333]/40'
                    : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF] dark:bg-[#D93025]/20 dark:text-[#F28B82] dark:border-[#D93025]/40 hover:opacity-80'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{wakeLockState.isActive ? 'Screen Awake' : 'Screen Wake Inactive'}</span>
              </button>
            </div>

            <h2 className="text-xl font-bold font-sans tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
              {config.sensorName || 'Basement Flood Sensor'}
            </h2>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Trips siren &amp; push alert when vibration exceeds {config.thresholdDelta} m/s² for {config.continuousDurationSec}s continuously.
            </p>
          </div>

          {/* Action Buttons: Pause/Resume + Arm/Disarm */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* PAUSE / RESUME SENSOR BUTTON */}
            {isArmed && (
              <button
                id="btn-pause-resume-sensor"
                onClick={onTogglePause}
                className={`px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 ${
                  isPaused
                    ? 'bg-[#1A73E8] hover:bg-[#1557B0] text-white ring-2 ring-blue-500/20'
                    : 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-500/20'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Sensor</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Sensor</span>
                  </>
                )}
              </button>
            )}

            {/* ARM / DISARM BUTTON */}
            <button
              id="btn-toggle-arm-disarm"
              onClick={onToggleArm}
              className={`px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 ${
                isArmed
                  ? 'bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#D93025] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] border border-red-200 dark:border-red-900/50'
                  : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-blue-500/20'
              }`}
            >
              {isArmed ? (
                <>
                  <ShieldOff className="w-4 h-4" />
                  <span>Disarm</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 fill-current" />
                  <span>Arm Sensor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Motion Meter & Real-Time Waveform */}
      <LiveMotionMeter
        motion={motion}
        threshold={config.thresholdDelta}
        continuousDuration={config.continuousDurationSec}
        sustainedDuration={sustainedDuration}
        triggerProgress={triggerProgress}
        isArmed={isArmed}
        isPaused={isPaused}
        baselineGravity={config.baselineGravity}
        isDarkMode={isDarkMode}
      />

      {/* 3. Essential Quick Actions Toolbar */}
      <div
        id="sensor-actions-toolbar"
        className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
              Quick Tools
            </span>
            {calibrationSuccess !== null && (
              <span className="text-xs text-[#137333] dark:text-[#81C995] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zeroed: {calibrationSuccess.toFixed(2)} m/s²
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zero Baseline */}
            <button
              id="btn-calibrate-baseline"
              onClick={handleCalibrateClick}
              disabled={isCalibrating || !isArmed || isPaused}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isCalibrating
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 border-amber-300 animate-pulse'
                  : !isArmed || isPaused
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent'
                  : 'bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] border-transparent'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'Calibrating...' : 'Zero Baseline'}</span>
            </button>

            {/* Simulate 3.5s Flood Vibration Drill */}
            <button
              id="btn-simulate-flood-vibration"
              onClick={() => onSimulateTest(3.5, 3.2)}
              disabled={!isArmed || isPaused}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                !isArmed || isPaused
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400'
                  : 'bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate 3s Drill</span>
            </button>

            {/* Instant Test Alert */}
            <button
              id="btn-instant-test-alert"
              onClick={onManualTriggerAlert}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#D93025] hover:bg-red-50 dark:hover:bg-red-950/30 border border-[#FAD2CF] dark:border-red-900/60 transition-colors flex items-center gap-1.5"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Instant Test Siren</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
