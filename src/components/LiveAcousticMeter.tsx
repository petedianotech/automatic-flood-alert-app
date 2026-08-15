import React from 'react';
import { AcousticData } from '../types';
import { Bell, AlertTriangle, AlertOctagon, Volume2 } from 'lucide-react';

interface LiveAcousticMeterProps {
  soundData: AcousticData;
  thresholdYellowDb?: number;
  thresholdRedDb?: number;
  isArmed: boolean;
  isPaused: boolean;
  isDarkMode: boolean;
}

export const LiveAcousticMeter: React.FC<LiveAcousticMeterProps> = ({
  soundData,
  thresholdYellowDb = 68,
  thresholdRedDb = 82,
  isArmed,
  isPaused,
  isDarkMode,
}) => {
  const decibels = soundData.decibels;
  const isRed = decibels >= thresholdRedDb && isArmed && !isPaused;
  const isYellowActive = decibels >= thresholdYellowDb && !isRed && isArmed && !isPaused;

  // Decibel gauge percentage
  const dbPercent = Math.min(100, Math.max(0, ((decibels - 30) / (105 - 30)) * 100));

  return (
    <div
      id="live-acoustic-meter-card"
      className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
              !isArmed || isPaused
                ? 'bg-black/5 dark:bg-white/5 text-[#5F6368] dark:text-[#9AA0A6]'
                : isRed
                ? 'bg-[#D93025] text-white animate-pulse'
                : isYellowActive
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-[#E6F4EA] dark:bg-[#137333]/30 text-[#137333] dark:text-[#81C995]'
            }`}
          >
            {isRed ? (
              <AlertOctagon className="w-5 h-5" />
            ) : isYellowActive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base tracking-tight">
                Sound Sensor
              </h3>
              {!isArmed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  Sensor Off
                </span>
              ) : isPaused ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Paused
                </span>
              ) : isRed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#D93025] text-white animate-pulse">
                  🚨 System Bell Alarm
                </span>
              ) : isYellowActive ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-black">
                  ⚠️ System Bell Ringing
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/30 dark:text-[#81C995] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />
                  Listening for System Bell
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Senses the sound from the warning bell made in the system
            </p>
          </div>
        </div>

        {/* Sound Level dB Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-right font-mono">
            <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] block leading-tight">
              Bell Sound Level
            </span>
            <span
              className={`text-base font-black ${
                isRed
                  ? 'text-[#D93025]'
                  : isYellowActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
              }`}
            >
              {!isArmed ? '--' : `${decibels} dB`}
            </span>
          </div>
        </div>
      </div>

      {/* Simplified Sound Level Gauge */}
      <div className="mt-4 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-[#1A73E8]" />
            Bell Sound Loudness
          </span>
          <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-medium">
            Warning: {thresholdYellowDb} dB &bull; Danger: {thresholdRedDb} dB
          </span>
        </div>

        {/* Decibel Progress Bar with Markers */}
        <div className="h-4 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5 relative">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
            style={{ left: `${((thresholdYellowDb - 30) / 75) * 100}%` }}
            title={`Warning: ${thresholdYellowDb} dB`}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${((thresholdRedDb - 30) / 75) * 100}%` }}
            title={`Danger: ${thresholdRedDb} dB`}
          />

          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isRed
                ? 'bg-red-600 animate-pulse'
                : isYellowActive
                ? 'bg-amber-500'
                : 'bg-[#137333] dark:bg-[#81C995]'
            }`}
            style={{ width: isArmed ? `${dbPercent}%` : '0%' }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">
          <span>30 dB (Quiet)</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{thresholdYellowDb} dB Warning</span>
          <span className="text-red-600 dark:text-red-400 font-bold">{thresholdRedDb} dB Danger Alarm</span>
          <span>105 dB (Loud)</span>
        </div>
      </div>
    </div>
  );
};
