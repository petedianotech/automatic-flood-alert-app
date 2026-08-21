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
      className={`rounded-[24px] border p-5 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E6E1E5]'
          : 'bg-[#F3F3FA] border-[#E7E0EC]/80 text-[#1C1B1F]'
      }`}
    >
      {/* 1. Header Bar: Status & Sound Level */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0EC] dark:border-[#303134]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-[18px] flex items-center justify-center transition-colors shrink-0 shadow-xs ${
              !isArmed || isPaused
                ? 'bg-[#E7E0EC] text-[#49454F] dark:bg-[#2D2E30] dark:text-[#CAC4D0]'
                : isRed
                ? 'bg-[#FCE8E6] text-[#BA1A1A] dark:bg-[#BA1A1A]/20 dark:text-[#F28B82]'
                : isYellowActive
                ? 'bg-[#FEF7E0] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                : isBellDetected
                ? 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995]'
                : isVoiceRejected
                ? 'bg-[#FEF7E0] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                : 'bg-[#E0EFFF] text-[#1F71E8] dark:bg-[#1F71E8]/20 dark:text-[#A8C7FA]'
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
              <h3 className="font-bold text-sm sm:text-base tracking-tight font-sans text-[#1C1B1F] dark:text-white">
                Bell Sound Sensor Meter
              </h3>
              {!isArmed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E7E0EC] text-[#49454F] dark:bg-[#2D2E30] dark:text-[#CAC4D0]">
                  Sensor Off
                </span>
              ) : isPaused ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF7E0] text-[#934D00] border border-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40">
                  Paused
                </span>
              ) : isRed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FCE8E6] text-[#BA1A1A] border border-[#FAD2CF] dark:bg-[#BA1A1A]/20 dark:text-[#F28B82] dark:border-[#BA1A1A]/40">
                  Bell Alarm Active
                </span>
              ) : isYellowActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF7E0] text-[#934D00] border border-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40">
                  Bell Warning Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />
                  Listening for Bell
                </span>
              )}
            </div>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-normal">
              Listens for warning bell. Automatically ignores voices and whistles.
            </p>
          </div>
        </div>

        {/* Real-time Match & Decibel Readings */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3.5 py-2 rounded-[16px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] text-right font-mono shadow-xs">
            <span className="text-xs font-bold text-[#49454F] dark:text-[#CAC4D0] block leading-tight">
              Bell Match
            </span>
            <span
              className={`text-sm sm:text-base font-bold ${
                bellScore >= 50
                  ? 'text-[#137333] dark:text-[#81C995]'
                  : bellScore >= 30
                  ? 'text-[#934D00] dark:text-[#FDD663]'
                  : 'text-[#1C1B1F] dark:text-white'
              }`}
            >
              {!isArmed ? '--' : `${bellScore}%`}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-[16px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] text-right font-mono shadow-xs">
            <span className="text-xs font-bold text-[#49454F] dark:text-[#CAC4D0] block leading-tight">
              Sound Level
            </span>
            <span
              className={`text-sm sm:text-base font-bold ${
                isRed
                  ? 'text-[#BA1A1A] dark:text-[#F28B82]'
                  : isYellowActive
                  ? 'text-[#934D00] dark:text-[#FDD663]'
                  : 'text-[#1C1B1F] dark:text-white'
              }`}
            >
              {!isArmed ? '--' : `${decibels} dB`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Sound Filter Status */}
      <div
        className={`p-3.5 rounded-[18px] border flex items-center justify-between gap-3 text-xs transition-colors shadow-xs ${
          !isArmed
            ? 'bg-white dark:bg-[#28292A] border-[#E7E0EC]/80 dark:border-[#303134] text-[#49454F]'
            : isBellDetected
            ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6] dark:bg-[#137333]/20 dark:text-[#81C995] dark:border-[#137333]/40'
            : isVoiceRejected
            ? 'bg-[#FEF7E0] text-[#934D00] border-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40'
            : isWhistleRejected
            ? 'bg-[#FEF7E0] text-[#934D00] border-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40'
            : 'bg-white dark:bg-[#28292A] border-[#E7E0EC]/80 dark:border-[#303134] text-[#49454F] dark:text-[#CAC4D0]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isBellDetected ? (
            <ShieldCheck className="w-4 h-4 text-[#137333] dark:text-[#81C995] shrink-0" />
          ) : isVoiceRejected ? (
            <UserX className="w-4 h-4 text-[#934D00] dark:text-[#FDD663] shrink-0" />
          ) : isWhistleRejected ? (
            <Wind className="w-4 h-4 text-[#934D00] dark:text-[#FDD663] shrink-0" />
          ) : (
            <Activity className="w-4 h-4 text-[#49454F] dark:text-[#CAC4D0] shrink-0" />
          )}

          <div className="truncate">
            <span className="font-semibold block text-xs text-[#1C1B1F] dark:text-white">
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
            <span className="text-xs font-normal block truncate text-[#49454F] dark:text-[#CAC4D0]">
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
        <div className="flex items-center justify-between text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium">
          <span className="text-[#934D00] dark:text-[#FDD663] font-semibold">
            &larr; Voice Filter (Ignored)
          </span>
          <span className="text-[#137333] dark:text-[#81C995] font-semibold">
            Bell Resonance (Detected) &rarr;
          </span>
        </div>

        {/* 32 Frequency Bars */}
        <div className="h-12 w-full bg-white dark:bg-[#121316] rounded-[18px] p-2 flex items-end justify-between gap-0.5 border border-[#E7E0EC]/80 dark:border-[#303134] shadow-xs">
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
                      ? 'bg-[#E7E0EC] dark:bg-[#303134]'
                      : isBellBin
                      ? val > 50
                        ? 'bg-[#137333] dark:bg-[#81C995]'
                        : 'bg-[#CEEAD6] dark:bg-[#137333]/40'
                      : isVoiceBin
                      ? val > 40
                        ? 'bg-[#B06000] dark:bg-[#FDD663]'
                        : 'bg-[#FEEFC3] dark:bg-[#B06000]/30'
                      : 'bg-[#E0EFFF] dark:bg-[#1F71E8]/30'
                  }`}
                  style={{ height: `${isArmed ? heightPercent : 8}%` }}
                />
              );
            })
          ) : (
            <div className="w-full text-center text-xs text-[#49454F] dark:text-[#CAC4D0] my-auto font-medium">
              Standby
            </div>
          )}
        </div>
      </div>

      {/* 4. Sound Loudness Bar with Markers */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold flex items-center gap-1.5 text-[#1C1B1F] dark:text-white">
            <Volume2 className="w-4 h-4 text-[#1F71E8] dark:text-[#A8C7FA]" />
            Bell Sound Level
          </span>
          <span className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium">
            Warning: {thresholdYellowDb} dB &bull; Alarm: {thresholdRedDb} dB
          </span>
        </div>

        <div className="h-3 w-full bg-[#E7E0EC] dark:bg-[#303134] rounded-full overflow-hidden p-0.5 relative">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#934D00] dark:bg-[#FDD663] z-10"
            style={{ left: `${((thresholdYellowDb - 30) / 60) * 100}%` }}
            title={`Warning: ${thresholdYellowDb} dB`}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#BA1A1A] dark:bg-[#F28B82] z-10"
            style={{ left: `${((thresholdRedDb - 30) / 60) * 100}%` }}
            title={`Alarm: ${thresholdRedDb} dB`}
          />

          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isRed
                ? 'bg-[#BA1A1A]'
                : isYellowActive
                ? 'bg-[#934D00]'
                : 'bg-[#137333] dark:bg-[#81C995]'
            }`}
            style={{ width: isArmed ? `${dbPercent}%` : '0%' }}
          />
        </div>

        <div className="flex justify-between text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium">
          <span className="font-bold text-[#1C1B1F] dark:text-white">30 dB (Quiet)</span>
          <span className="text-[#934D00] dark:text-[#FDD663] font-bold">{thresholdYellowDb} dB Warning</span>
          <span className="text-[#BA1A1A] dark:text-[#F28B82] font-bold">{thresholdRedDb} dB Alarm</span>
          <span className="font-bold text-[#1C1B1F] dark:text-white">90 dB (Loud)</span>
        </div>
      </div>
    </div>
  );
};
