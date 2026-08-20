import React from 'react';
import { AcousticData } from '../types';
import { Bell, AlertTriangle, AlertOctagon, Volume2, ShieldCheck, UserX, Wind, Activity } from 'lucide-react';

interface LiveAcousticMeterProps {
  soundData: AcousticData;
  thresholdYellowDb?: number;
  thresholdRedDb?: number;
  isArmed: boolean;
  isPaused: boolean;
  isDarkMode: boolean;
  onSimulateSoundTest?: (severity?: 'yellow' | 'red') => void;
}

export const LiveAcousticMeter: React.FC<LiveAcousticMeterProps> = ({
  soundData,
  thresholdYellowDb = 48,
  thresholdRedDb = 60,
  isArmed,
  isPaused,
  isDarkMode,
  onSimulateSoundTest,
}) => {
  const decibels = soundData.decibels;
  const bellScore = soundData.bellDetectionScore || 0;
  const classification = soundData.soundClassification || 'quiet';
  const isBellDetected = soundData.isBellRingingDetected;
  const isVoiceRejected = soundData.voiceRejectionActive;
  const isWhistleRejected = soundData.whistleRejectionActive;

  const isRed = (isBellDetected && decibels >= thresholdRedDb) && isArmed && !isPaused;
  const isYellowActive = (isBellDetected && decibels >= thresholdYellowDb) && !isRed && isArmed && !isPaused;

  // Decibel gauge percentage (30dB to 90dB)
  const dbPercent = Math.min(100, Math.max(0, ((decibels - 30) / (90 - 30)) * 100));

  return (
    <div
      id="live-acoustic-meter-card"
      className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-xs space-y-4 ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      }`}
    >
      {/* 1. Header Bar: Status & Sound Level */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E3E1] dark:border-[#303134]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
              !isArmed || isPaused
                ? 'bg-[#F1F3F4] text-[#3C4043] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                : isRed
                ? 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82]'
                : isYellowActive
                ? 'bg-[#FEF7E0] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                : isBellDetected
                ? 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995]'
                : isVoiceRejected
                ? 'bg-[#FEF7E0] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                : 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
            }`}
          >
            {isRed ? (
              <AlertOctagon className="w-5 h-5" />
            ) : isYellowActive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isVoiceRejected ? (
              <UserX className="w-5 h-5" />
            ) : isWhistleRejected ? (
              <Wind className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base tracking-tight font-sans text-[#1F1F1F] dark:text-[#E3E3E3]">
                Bell Sound Sensor Meter
              </h3>
              {!isArmed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F1F3F4] text-[#3C4043] border border-[#E1E3E1] dark:bg-[#2D2E30] dark:text-[#9AA0A6] dark:border-transparent">
                  Sensor Off
                </span>
              ) : isPaused ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF7E0] text-[#934D00] border border-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40">
                  Paused
                </span>
              ) : isRed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#FCE8E6] text-red-950 border-2 border-red-300 dark:bg-[#D93025]/20 dark:text-[#F28B82] dark:border-[#D93025]/40">
                  Bell Alarm Active
                </span>
              ) : isYellowActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#FEF7E0] text-amber-950 border-2 border-amber-300 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40">
                  Bell Warning Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-green-950 border-2 border-green-300 dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />
                  Listening for Bell
                </span>
              )}
            </div>
            <p className="text-xs text-gray-700 dark:text-[#9AA0A6] font-medium">
              Listens for warning bell. Automatically ignores voices and whistles.
            </p>
          </div>
        </div>

        {/* Real-time Match & Decibel Readings */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3.5 py-2 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134] text-right font-mono">
            <span className="text-[10px] font-extrabold text-gray-900 dark:text-[#9AA0A6] block leading-tight">
              Bell Match
            </span>
            <span
              className={`text-sm sm:text-base font-extrabold ${
                bellScore >= 50
                  ? 'text-green-900 dark:text-[#81C995]'
                  : bellScore >= 30
                  ? 'text-amber-950 dark:text-[#FDD663]'
                  : 'text-black dark:text-white'
              }`}
            >
              {!isArmed ? '--' : `${bellScore}%`}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134] text-right font-mono">
            <span className="text-[10px] font-extrabold text-gray-900 dark:text-[#9AA0A6] block leading-tight">
              Sound Level
            </span>
            <span
              className={`text-sm sm:text-base font-extrabold ${
                isRed
                  ? 'text-red-950 dark:text-[#F28B82]'
                  : isYellowActive
                  ? 'text-amber-950 dark:text-[#FDD663]'
                  : 'text-black dark:text-white'
              }`}
            >
              {!isArmed ? '--' : `${decibels} dB`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Sound Filter Status */}
      <div
        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs transition-colors ${
          !isArmed
            ? 'bg-gray-50 dark:bg-[#28292A] border-gray-200 dark:border-[#303134] text-gray-800'
            : isBellDetected
            ? 'bg-[#E6F4EA] text-green-950 border-green-300 dark:bg-[#137333]/20 dark:text-[#81C995] dark:border-[#137333]/40'
            : isVoiceRejected
            ? 'bg-[#FEF7E0] text-amber-950 border-amber-300 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40'
            : isWhistleRejected
            ? 'bg-[#FEF7E0] text-amber-950 border-amber-300 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40'
            : 'bg-gray-50 dark:bg-[#28292A] border-gray-200 dark:border-[#303134] text-gray-800 dark:text-[#9AA0A6]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isBellDetected ? (
            <ShieldCheck className="w-4 h-4 text-[#137333] dark:text-[#81C995] shrink-0" />
          ) : isVoiceRejected ? (
            <UserX className="w-4 h-4 text-[#B06000] dark:text-[#FDD663] shrink-0" />
          ) : isWhistleRejected ? (
            <Wind className="w-4 h-4 text-[#B06000] dark:text-[#FDD663] shrink-0" />
          ) : (
            <Activity className="w-4 h-4 text-gray-700 dark:text-[#9AA0A6] shrink-0" />
          )}

          <div className="truncate">
            <span className="font-extrabold block text-xs text-black dark:text-white">
              {isBellDetected
                ? 'Bell Ringing Sound Detected'
                : isVoiceRejected
                ? 'Talking Detected (Ignored)'
                : isWhistleRejected
                ? 'Whistle Detected (Ignored)'
                : classification === 'ambient_noise'
                ? 'Room Sound'
                : 'Quiet Room'}
            </span>
            <span className="text-[11px] font-medium block truncate text-gray-700 dark:text-[#9AA0A6]">
              {isBellDetected
                ? `Bell sound level is ${decibels} dB`
                : isVoiceRejected
                ? 'Voice sound is filtered out'
                : isWhistleRejected
                ? 'Whistle sound is filtered out'
                : 'Waiting for bell sound'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Frequency Spectrum Bars */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-900 dark:text-[#9AA0A6] font-bold">
          <span className="text-amber-950 dark:text-[#FDD663] font-extrabold">
            &larr; Voice Filter (Ignored)
          </span>
          <span className="text-green-950 dark:text-[#81C995] font-extrabold">
            Bell Resonance (Detected) &rarr;
          </span>
        </div>

        {/* 32 Frequency Bars */}
        <div className="h-12 w-full bg-gray-50 dark:bg-[#121316] rounded-2xl p-1.5 flex items-end justify-between gap-0.5 border-2 border-gray-200 dark:border-[#303134]">
          {soundData.frequencyData && soundData.frequencyData.length > 0 ? (
            soundData.frequencyData.map((val, idx) => {
              const isVoiceBin = idx < 12;
              const isBellBin = idx >= 12 && idx <= 26;
              const heightPercent = Math.max(8, Math.min(100, (val / 255) * 100));

              return (
                <div
                  key={idx}
                  className={`w-full rounded-t-xs transition-all duration-75 ${
                    !isArmed
                      ? 'bg-gray-300 dark:bg-[#303134]'
                      : isBellBin
                      ? val > 50
                        ? 'bg-[#137333] dark:bg-[#81C995]'
                        : 'bg-[#CEEAD6] dark:bg-[#137333]/40'
                      : isVoiceBin
                      ? val > 40
                        ? 'bg-[#B06000] dark:bg-[#FDD663]'
                        : 'bg-[#FEEFC3] dark:bg-[#B06000]/30'
                      : 'bg-[#D2E3FC] dark:bg-[#1A73E8]/30'
                  }`}
                  style={{ height: `${isArmed ? heightPercent : 8}%` }}
                />
              );
            })
          ) : (
            <div className="w-full text-center text-[10px] text-gray-700 dark:text-[#9AA0A6] my-auto font-bold">
              Standby
            </div>
          )}
        </div>
      </div>

      {/* 4. Sound Loudness Bar with Markers */}
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold flex items-center gap-1.5 text-black dark:text-white">
            <Volume2 className="w-4 h-4 text-[#1A73E8] dark:text-[#8AB4F8]" />
            Bell Sound Level
          </span>
          <span className="text-xs text-gray-800 dark:text-[#9AA0A6] font-extrabold">
            Warning: {thresholdYellowDb} dB &bull; Alarm: {thresholdRedDb} dB
          </span>
        </div>

        <div className="h-3.5 w-full bg-gray-200 dark:bg-[#303134] rounded-full overflow-hidden p-0.5 relative">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#B06000] dark:bg-[#FDD663] z-10"
            style={{ left: `${((thresholdYellowDb - 30) / 60) * 100}%` }}
            title={`Warning: ${thresholdYellowDb} dB`}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#D93025] dark:bg-[#F28B82] z-10"
            style={{ left: `${((thresholdRedDb - 30) / 60) * 100}%` }}
            title={`Alarm: ${thresholdRedDb} dB`}
          />

          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isRed
                ? 'bg-[#D93025]'
                : isYellowActive
                ? 'bg-[#B06000]'
                : 'bg-[#137333] dark:bg-[#81C995]'
            }`}
            style={{ width: isArmed ? `${dbPercent}%` : '0%' }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-gray-800 dark:text-[#9AA0A6] font-bold">
          <span className="font-extrabold text-gray-950 dark:text-white">30 dB (Quiet)</span>
          <span className="text-amber-950 dark:text-[#FDD663] font-extrabold">{thresholdYellowDb} dB Warning</span>
          <span className="text-red-950 dark:text-[#F28B82] font-extrabold">{thresholdRedDb} dB Alarm</span>
          <span className="font-extrabold text-gray-950 dark:text-white">90 dB (Loud)</span>
        </div>
      </div>

      {/* 5. Quick Simulation Test Buttons */}
      {onSimulateSoundTest && (
        <div className="pt-2 border-t-2 border-gray-200 dark:border-[#303134] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-black dark:text-white">
            Test Bell Sound System:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSimulateSoundTest('yellow')}
              className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FEF7E0] hover:bg-[#FEEFC3] text-amber-950 border-2 border-amber-400 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40 transition-colors active:scale-95 shadow-2xs cursor-pointer"
            >
              Test Warning (Yellow)
            </button>
            <button
              type="button"
              onClick={() => onSimulateSoundTest('red')}
              className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FCE8E6] hover:bg-[#FAD2CF] text-red-950 border-2 border-red-400 dark:bg-[#D93025]/20 dark:text-[#F28B82] dark:border-[#D93025]/40 transition-colors active:scale-95 shadow-2xs cursor-pointer"
            >
              Test Danger (Red)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
