import React, { useEffect, useRef, useState } from 'react';
import { MotionData } from '../types';
import { Activity, AlertTriangle } from 'lucide-react';

interface LiveMotionMeterProps {
  motion: MotionData;
  threshold: number;
  continuousDuration: number;
  sustainedDuration: number;
  triggerProgress: number;
  isArmed: boolean;
  isPaused: boolean;
  baselineGravity: number;
  isDarkMode: boolean;
}

export const LiveMotionMeter: React.FC<LiveMotionMeterProps> = ({
  motion,
  threshold,
  continuousDuration,
  sustainedDuration,
  triggerProgress,
  isArmed,
  isPaused,
  baselineGravity,
  isDarkMode,
}) => {
  const [history, setHistory] = useState<number[]>(() => new Array(50).fill(0));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep a 50-sample rolling history for the oscilloscope waveform
  useEffect(() => {
    if (!isArmed || isPaused) return;
    setHistory((prev) => {
      return [...prev.slice(1), motion.delta];
    });
  }, [motion.delta, motion.timestamp, isArmed, isPaused]);

  // Draw real-time oscilloscope waveform
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

    // Horizontal threshold line
    const maxVal = Math.max(4.5, threshold * 2.2);
    const thresholdY = height - (threshold / maxVal) * (height - 16) - 8;

    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isDarkMode ? '#F28B82' : '#D93025';
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw baseline bottom line
    const baselineY = height - 6;
    ctx.beginPath();
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
    ctx.moveTo(0, baselineY);
    ctx.lineTo(width, baselineY);
    ctx.stroke();

    // Plot waveform
    if (history.length > 1) {
      const step = width / (history.length - 1);
      ctx.beginPath();

      const isOver = motion.delta >= threshold && !isPaused && isArmed;
      ctx.strokeStyle = isPaused
        ? isDarkMode ? '#80868B' : '#9AA0A6'
        : isOver
        ? '#D93025'
        : motion.delta >= threshold * 0.6
        ? '#F9AB00'
        : '#1A73E8';
      ctx.lineWidth = 2.5;

      history.forEach((val, index) => {
        const normalized = Math.min(val, maxVal);
        const y = height - (normalized / maxVal) * (height - 20) - 8;
        const x = index * step;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Subtle fill area under curve
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      if (isOver) {
        gradient.addColorStop(0, 'rgba(217, 48, 37, 0.3)');
        gradient.addColorStop(1, 'rgba(217, 48, 37, 0.0)');
      } else if (!isPaused && isArmed) {
        gradient.addColorStop(0, 'rgba(26, 115, 232, 0.18)');
        gradient.addColorStop(1, 'rgba(26, 115, 232, 0.0)');
      } else {
        gradient.addColorStop(0, 'rgba(154, 160, 166, 0.1)');
        gradient.addColorStop(1, 'rgba(154, 160, 166, 0.0)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, [history, threshold, motion.delta, isDarkMode, isPaused, isArmed]);

  const isHighVibration = motion.delta >= threshold && isArmed && !isPaused;
  const isModerateVibration = motion.delta >= threshold * 0.6 && !isHighVibration && isArmed && !isPaused;

  const deltaColorClass = isPaused || !isArmed
    ? 'text-[#5F6368] dark:text-[#9AA0A6]'
    : isHighVibration
    ? 'text-[#D93025]'
    : isModerateVibration
    ? 'text-[#F9AB00]'
    : 'text-[#1A73E8]';

  const gaugePercent = isPaused || !isArmed
    ? 0
    : Math.min(100, (motion.delta / (threshold * 2.5)) * 100);

  return (
    <div
      id="live-motion-meter"
      className={`rounded-3xl border transition-all p-5 sm:p-6 shadow-xs ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
              isHighVibration
                ? 'bg-[#FCE8E6] text-[#D93025] animate-pulse'
                : isPaused
                ? 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                : 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base font-sans tracking-tight">
              Live Motion Telemetry
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Trip Threshold: {threshold.toFixed(2)} m/s² &bull; Base: {baselineGravity.toFixed(2)} m/s²
            </p>
          </div>
        </div>

        {/* Sustained Countdown Badge */}
        {isHighVibration ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] font-bold text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              Sustained: {sustainedDuration.toFixed(1)}s / {continuousDuration.toFixed(1)}s
            </span>
          </div>
        ) : (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isPaused
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : !isArmed
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995]'
            }`}
          >
            {isPaused ? 'PAUSED' : isArmed ? 'LIVE' : 'STANDBY'}
          </span>
        )}
      </div>

      {/* Main Metric & Waveform Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center mb-5">
        {/* Delta Number & Range Bar */}
        <div className="lg:col-span-5 flex flex-col justify-center p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#28292A] border border-black/5 dark:border-white/5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            Vibration Delta (Δ)
          </span>

          <div className="flex items-baseline gap-1.5">
            <span
              id="motion-delta-value"
              className={`text-5xl font-black font-mono tracking-tight transition-colors ${deltaColorClass}`}
            >
              {isPaused ? '0.00' : motion.delta.toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
              m/s²
            </span>
          </div>

          {/* Linear Bar */}
          <div className="w-full mt-3">
            <div className="flex justify-between text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
              <span>0.0</span>
              <span className="text-[#D93025] font-bold">Limit: {threshold.toFixed(1)}</span>
              <span>{(threshold * 2.5).toFixed(1)}</span>
            </div>
            <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#D93025] z-10"
                style={{ left: `${(threshold / (threshold * 2.5)) * 100}%` }}
              />
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  isHighVibration
                    ? 'bg-[#D93025]'
                    : isModerateVibration
                    ? 'bg-[#F9AB00]'
                    : 'bg-[#1A73E8]'
                }`}
                style={{ width: `${gaugePercent}%` }}
              />
            </div>
          </div>

          {/* 3s Hold Progress */}
          {triggerProgress > 0 && isArmed && !isPaused && (
            <div className="w-full mt-3 pt-3 border-t border-black/5 dark:border-white/5">
              <div className="flex justify-between text-xs font-bold text-[#D93025] mb-1">
                <span>Hold Progress:</span>
                <span>{Math.round(triggerProgress * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-red-100 dark:bg-red-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D93025] transition-all duration-75 rounded-full"
                  style={{ width: `${triggerProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Oscilloscope Waveform */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121212] p-2">
            <canvas
              ref={canvasRef}
              width={460}
              height={125}
              className="w-full h-[125px] block rounded-xl"
            />
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/80 dark:bg-black/80 text-[#5F6368] dark:text-[#9AA0A6] border border-black/5 dark:border-white/10 backdrop-blur-xs">
              {isPaused ? 'SENSOR PAUSED' : isArmed ? '50-SAMPLE WAVEFORM' : 'STANDBY'}
            </div>
          </div>
        </div>
      </div>

      {/* Compact 3-Axis Telemetry Row */}
      <div className="grid grid-cols-4 gap-2.5 text-center">
        <div className="py-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
          <span className="block text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">X</span>
          <span className="font-mono text-sm font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
            {motion.x.toFixed(2)}
          </span>
        </div>
        <div className="py-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
          <span className="block text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Y</span>
          <span className="font-mono text-sm font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
            {motion.y.toFixed(2)}
          </span>
        </div>
        <div className="py-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
          <span className="block text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Z</span>
          <span className="font-mono text-sm font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
            {motion.z.toFixed(2)}
          </span>
        </div>
        <div className="py-2 px-3 rounded-xl bg-[#E8F0FE] dark:bg-[#1A73E8]/15 border border-[#D2E3FC] dark:border-[#1A73E8]/30">
          <span className="block text-[10px] font-bold text-[#1967D2] dark:text-[#8AB4F8]">Total Vector A</span>
          <span className="font-mono text-sm font-bold text-[#1967D2] dark:text-[#8AB4F8]">
            {motion.totalMagnitude.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
