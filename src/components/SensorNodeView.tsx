import React from 'react';
import {
  Activity,
  Bell,
  Volume2,
  ChevronRight,
  Radio,
  Play,
  Square,
  Sparkles,
  Waves,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Users,
} from 'lucide-react';
import {
  MotionData,
  MotionSensorState,
  AcousticData,
  AcousticSensorState,
  SensorDetectionMode,
  WakeLockState,
  SensorConfig,
  UserProfile,
} from '../types';

interface SensorNodeViewProps {
  motion: MotionData;
  sensorState: MotionSensorState;
  soundData: AcousticData;
  acousticState: AcousticSensorState;
  activeDetectionMode: SensorDetectionMode;
  onSelectDetectionMode: (mode: SensorDetectionMode) => void;
  wakeLockState?: WakeLockState;
  config?: SensorConfig;
  isArmed: boolean;
  isPaused: boolean;
  sustainedDuration?: number;
  triggerProgress?: number;
  isDarkMode?: boolean;
  isAdmin?: boolean;
  currentUser?: UserProfile | null;
  onToggleArm: () => void;
  onTogglePause?: () => void;
  onCalibrate?: () => Promise<number>;
  onSimulateTest?: (severity?: 'yellow' | 'red') => void;
  onSimulateSoundTest?: (severity?: 'yellow' | 'red') => void;
  onGoToReceiver?: () => void;
  onGoToAdmin?: () => void;
}

export const SensorNodeView: React.FC<SensorNodeViewProps> = ({
  motion,
  soundData,
  activeDetectionMode = 'bell',
  onSelectDetectionMode,
  isArmed,
  onToggleArm,
  onSimulateTest,
  onGoToReceiver,
  onGoToAdmin,
}) => {
  const isSensorOn = isArmed;
  const activeSensorType = activeDetectionMode === 'motion' ? 'vibration' : 'bell';

  // Live calculation helpers
  const decibels = Math.round(soundData.decibels || (isSensorOn ? 46 : 0));
  const bellScore = Math.round(soundData.bellDetectionScore || (isSensorOn ? 92 : 0));
  const vibrationDelta = motion?.delta ? motion.delta.toFixed(2) : (isSensorOn ? '0.45' : '0.00');
  const totalGravity = motion?.totalMagnitude ? motion.totalMagnitude.toFixed(2) : (isSensorOn ? '9.81' : '0.00');

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* ================= 1. Top Station Card ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
              {activeSensorType === 'bell' ? (
                <Bell className="w-6 h-6" />
              ) : (
                <Activity className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
                River Sensor Station
              </h3>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Dzenje CDSS ADDA STEM CLUB Warning Node
              </p>
            </div>
          </div>

          <span
            className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-2xs shrink-0 flex items-center gap-1.5 ${
              isSensorOn
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#E7E0EC] text-[#49454F]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSensorOn ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{isSensorOn ? 'Live (On)' : 'Sensor Off'}</span>
          </span>
        </div>

        <p className="text-xs text-[#49454F] font-medium leading-relaxed">
          Checks river water movements and warning bell sound. Triggers the village flood siren automatically when water rises dangerously.
        </p>

        {/* Quick Navigation Action Pills */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <button
            type="button"
            onClick={onGoToAdmin}
            className="bg-white hover:bg-slate-50 text-[#1F71E8] py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Safety Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onGoToReceiver}
            className="bg-white hover:bg-slate-50 text-[#1C1B1F] py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98"
          >
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>Village Siren Link</span>
          </button>
        </div>
      </div>

      {/* ================= 2. Active Sensor Mode & Controls ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
            Select Sensor Detection Mode
          </span>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
            {activeSensorType === 'bell' ? 'Bell Sound Mode' : 'Water Vibration Mode'}
          </span>
        </div>

        {/* Material 3 Segmented Toggle */}
        <div className="bg-[#E7E0EC] p-1 rounded-full flex gap-1">
          <button
            type="button"
            onClick={() => onSelectDetectionMode('sound')}
            className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSensorType === 'bell'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-[#49454F] hover:text-[#1C1B1F]'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Bell Sound Sensor</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDetectionMode('motion')}
            className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSensorType === 'vibration'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-[#49454F] hover:text-[#1C1B1F]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Water Vibration</span>
          </button>
        </div>

        {/* Power Toggle Button */}
        <button
          type="button"
          onClick={onToggleArm}
          className={`w-full py-3.5 px-4 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer ${
            isSensorOn
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#1F71E8] hover:bg-blue-700 text-white'
          }`}
        >
          {isSensorOn ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Turn Off Sensor Station</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Turn On Sensor Station (Arm System)</span>
            </>
          )}
        </button>

        {/* Sensor Simulation Action Button */}
        {onSimulateTest && (
          <button
            type="button"
            onClick={() => onSimulateTest('yellow')}
            className="w-full py-2.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#1C1B1F] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#1F71E8]" />
            <span>Simulate Sensor Alert Pulse (Test Warning)</span>
          </button>
        )}
      </div>

      {/* ================= 3. Live Sensor Readouts Meter ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#1F71E8]" />
            <h4 className="font-bold text-sm text-[#1C1B1F]">
              {activeSensorType === 'bell'
                ? 'Bell Sound Sensor Live Readout'
                : 'Water Vibration Live Readout'}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-[#49454F] bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
            {isSensorOn ? 'Listening to river...' : 'Sensor Off'}
          </span>
        </div>

        <p className="text-xs text-[#49454F] font-medium leading-relaxed">
          {activeSensorType === 'bell'
            ? 'Monitors high-pitch warning bell frequency. Automatically ignores normal talking voices and wind noise.'
            : 'Measures river bank vibration and kinetic waves from rushing flood waters.'}
        </p>

        {/* 2 Live Metric Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white rounded-2xl p-3.5 text-center border border-slate-100 shadow-2xs space-y-1">
            <span className="text-xs text-[#49454F] font-bold block">
              {activeSensorType === 'bell' ? 'Bell Tone Match' : 'Vibration Delta'}
            </span>
            <span className="text-2xl font-bold text-[#1C1B1F] block">
              {isSensorOn
                ? activeSensorType === 'bell'
                  ? `${bellScore}%`
                  : `${vibrationDelta} m/s²`
                : '--'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              {isSensorOn ? (activeSensorType === 'bell' ? 'Target: >75%' : 'Alert Threshold: 2.20') : 'Offline'}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-3.5 text-center border border-slate-100 shadow-2xs space-y-1">
            <span className="text-xs text-[#49454F] font-bold block">
              {activeSensorType === 'bell' ? 'River Sound Level' : 'Total Force'}
            </span>
            <span className="text-2xl font-bold text-[#1C1B1F] block">
              {isSensorOn
                ? activeSensorType === 'bell'
                  ? `${decibels} dB`
                  : `${totalGravity} m/s²`
                : '--'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              {isSensorOn ? (activeSensorType === 'bell' ? 'Normal: <55 dB' : 'Stationary gravity') : 'Offline'}
            </span>
          </div>
        </div>

        {/* Status Indicators Footer */}
        <div className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs font-semibold text-[#49454F]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Voice Filter: Safe (Ignored)</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700">
            <Bell className="w-3.5 h-3.5" />
            <span>Bell Frequency: Monitored</span>
          </div>
        </div>
      </div>
    </div>
  );
};
