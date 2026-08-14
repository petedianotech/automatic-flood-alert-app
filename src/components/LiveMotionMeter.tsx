import React, { useEffect, useRef, useState } from 'react';
import { MotionData } from '../types';
import { Activity, AlertTriangle, AlertOctagon } from 'lucide-react';

interface LiveMotionMeterProps {
  motion: MotionData;
  thresholdYellow?: number;
  thresholdRed?: number;
  threshold?: number; // fallback
  continuousDuration?: number;
  sustainedDuration?: number;
  triggerProgress?: number;
  isArmed: boolean;
  isPaused: boolean;
  baselineGravity: number;
  isDarkMode: boolean;
}

export const LiveMotionMeter: React.FC<LiveMotionMeterProps> = ({
  motion,
  thresholdYellow = 0.8,
  thresholdRed = 1.6,
  threshold = 1.6,
  sustainedDuration = 0,
  triggerProgress = 0,
  isArmed,
  isPaused,
  baselineGravity,
  isDarkMode,
}) => {
  const redLimit = thresholdRed || threshold || 1.6;
  const yellowLimit = thresholdYellow || redLimit * 0.5;

  const [history, setHistory] = useState<number[]>(() => new Array(40).fill(0));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep a 40-sample rolling history for the oscilloscope waveform
  useEffect(() => {
    if (!isArmed || isPaused) return;
    setHistory((prev) => {
      return [...prev.slice(1), motion.delta];
    });
  }, [motion.delta, motion.timestamp, isArmed, isPaused]);

  // Draw real-time oscilloscope waveform with Yellow & Red threshold guidelines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Baseline grid
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;

    const maxVal = Math.max(3.6, redLimit * 1.8);

    // 1. Yellow Threshold line
    const yellowY = height - (yellowLimit / maxVal) * (height - 14) - 6;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = isDarkMode ? '#FDD663' : '#F9AB00';
    ctx.moveTo(0, yellowY);
    ctx.lineTo(width, yellowY);
    ctx.stroke();

    // 2. Red Threshold line
    const redY = height - (redLimit / maxVal) * (height - 14) - 6;
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = isDarkMode ? '#F28B82' : '#D93025';
    ctx.moveTo(0, redY);
    ctx.lineTo(width, redY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Baseline bottom line
    const baselineY = height - 4;
    ctx.beginPath();
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
    ctx.moveTo(0, baselineY);
    ctx.lineTo(width, baselineY);
    ctx.stroke();

    // 4. Plot waveform
    if (history.length > 1) {
      const step = width / (history.length - 1);
      ctx.beginPath();

      const isRed = motion.delta >= redLimit && !isPaused && isArmed;
      const isYellowActive = motion.delta >= yellowLimit && !isRed && !isPaused && isArmed;

      ctx.strokeStyle = isPaused
        ? isDarkMode ? '#80868B' : '#9AA0A6'
        : isRed
        ? '#D93025'
        : isYellowActive
        ? '#F9AB00'
        : '#1A73E8';
      ctx.lineWidth = 2.2;

      history.forEach((val, index) => {
        const normalized = Math.min(val, maxVal);
        const y = height - (normalized / maxVal) * (height - 16) - 6;
        const x = index * step;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Area under curve
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      if (isRed) {
        gradient.addColorStop(0, 'rgba(217, 48, 37, 0.35)');
        gradient.addColorStop(1, 'rgba(217, 48, 37, 0.0)');
      } else if (isYellowActive) {
        gradient.addColorStop(0, 'rgba(249, 171, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(249, 171, 0, 0.0)');
      } else if (!isPaused && isArmed) {
        gradient.addColorStop(0, 'rgba(26, 115, 232, 0.18)');
        gradient.addColorStop(1, 'rgba(26, 115, 232, 0.0)');
      } else {
        gradient.addColorStop(0, 'rgba(154, 160, 166, 0.08)');
        gradient.addColorStop(1, 'rgba(154, 160, 166, 0.0)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, [history, redLimit, yellowLimit, motion.delta, isDarkMode, isPaused, isArmed]);

  const isRed = motion.delta >= redLimit && isArmed && !isPaused;
  const isYellow = motion.delta >= yellowLimit && !isRed && isArmed && !isPaused;

  const deltaColorClass = isPaused || !isArmed
    ? 'text-[#5F6368] dark:text-[#9AA0A6]'
    : isRed
    ? 'text-[#D93025]'
    : isYellow
    ? 'text-[#F9AB00]'
    : 'text-[#1A73E8]';

  const gaugeMax = Math.max(3.6, redLimit * 1.8);
  const gaugePercent = isPaused || !isArmed
    ? 0
    : Math.min(100, (motion.delta / gaugeMax) * 100);

  const yellowMarkerPos = (yellowLimit / gaugeMax) * 100;
  const redMarkerPos = (redLimit / gaugeMax) * 100;

  return (
    <div
      id="live-motion-meter"
      className={`rounded-2xl sm:rounded-3xl border transition-all p-3.5 sm:p-5 shadow-xs ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isRed
                ? 'bg-[#FCE8E6] text-[#D93025] animate-pulse'
                : isYellow
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 animate-pulse'
                : isPaused
                ? 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                : 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm font-sans tracking-tight">
              Live Sensor Telemetry
            </h3>
            <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
              💛 Yellow: {yellowLimit.toFixed(1)} m/s² &bull; 🚨 Red: {redLimit.toFixed(1)} m/s²
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {isRed ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] font-black text-[11px] animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            RED CRITICAL
          </span>
        ) : isYellow ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            YELLOW WARNING
          </span>
        ) : (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isPaused
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : !isArmed
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995]'
            }`}
          >
            {isPaused ? 'PAUSED' : isArmed ? 'ARMED' : 'DISARMED'}
          </span>
        )}
      </div>

      {/* Main Metric & Waveform Display */}
      <div className="grid grid-cols-1 gap-3 items-center">
        {/* Delta Number & Range Bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#28292A] border border-black/5 dark:border-white/5 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] block">
              Vibration Delta (Δ)
            </span>
            <div className="flex items-baseline gap-1">
              <span
                id="motion-delta-value"
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight transition-colors ${deltaColorClass}`}
              >
                {isPaused ? '0.00' : motion.delta.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                m/s²
              </span>
            </div>
          </div>

          {/* Quick Real-Time Level Gauge Indicator */}
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
              Base Gravity: {baselineGravity.toFixed(2)} m/s²
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                  isYellow || isRed
                    ? 'bg-amber-400 text-black'
                    : 'bg-black/10 dark:bg-white/10 text-[#5F6368] dark:text-[#9AA0A6]'
                }`}
              >
                Yellow: {yellowLimit.toFixed(1)}
              </div>
              <div
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                  isRed
                    ? 'bg-red-600 text-white'
                    : 'bg-black/10 dark:bg-white/10 text-[#5F6368] dark:text-[#9AA0A6]'
                }`}
              >
                Red: {redLimit.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Severity Bar */}
        <div className="w-full px-1">
          <div className="flex justify-between text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            <span>0.0</span>
            <span className="text-amber-600 dark:text-amber-400">💛 Warning: {yellowLimit.toFixed(1)}</span>
            <span className="text-[#D93025]">🚨 Critical: {redLimit.toFixed(1)}</span>
          </div>
          <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden relative">
            {/* Yellow marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
              style={{ left: `${yellowMarkerPos}%` }}
            />
            {/* Red marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#D93025] z-10"
              style={{ left: `${redMarkerPos}%` }}
            />
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isRed
                  ? 'bg-[#D93025]'
                  : isYellow
                  ? 'bg-[#F9AB00]'
                  : 'bg-[#1A73E8]'
              }`}
              style={{ width: `${gaugePercent}%` }}
            />
          </div>
        </div>

        {/* Compact Waveform Canvas */}
        <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121212] p-1.5">
          <canvas
            ref={canvasRef}
            width={380}
            height={70}
            className="w-full h-[70px] block"
          />
          <div className="absolute right-2 top-1.5 flex items-center gap-2 text-[9px] font-mono text-[#5F6368] dark:text-[#9AA0A6] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
            <span>X:{motion.x.toFixed(1)}</span>
            <span>Y:{motion.y.toFixed(1)}</span>
            <span>Z:{motion.z.toFixed(1)}</span>
          </div>
        </div>

        {/* Compact 3-Axis Telemetry Row */}
        <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
          <div className="py-1 px-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <span className="block text-[9px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">X</span>
            <span className="font-mono text-xs font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
              {motion.x.toFixed(1)}
            </span>
          </div>
          <div className="py-1 px-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <span className="block text-[9px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Y</span>
            <span className="font-mono text-xs font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
              {motion.y.toFixed(1)}
            </span>
          </div>
          <div className="py-1 px-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <span className="block text-[9px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Z</span>
            <span className="font-mono text-xs font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
              {motion.z.toFixed(1)}
            </span>
          </div>
          <div className="py-1 px-1.5 rounded-lg bg-[#E8F0FE] dark:bg-[#1A73E8]/15 border border-[#D2E3FC] dark:border-[#1A73E8]/30">
            <span className="block text-[9px] font-bold text-[#1967D2] dark:text-[#8AB4F8]">Vector |A|</span>
            <span className="font-mono text-xs font-bold text-[#1967D2] dark:text-[#8AB4F8]">
              {motion.totalMagnitude.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
