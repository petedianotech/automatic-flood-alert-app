import React, { useEffect, useRef, useState } from 'react';
import { MotionData } from '../types';
import { Activity, AlertTriangle, AlertOctagon, Play, RotateCcw } from 'lucide-react';

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
  onSimulateTest?: (severity?: 'yellow' | 'red') => void;
  onCalibrate?: () => Promise<number>;
}

export const LiveMotionMeter: React.FC<LiveMotionMeterProps> = ({
  motion,
  thresholdYellow = 0.8,
  thresholdRed = 1.6,
  threshold = 1.6,
  isArmed,
  isPaused,
  baselineGravity,
  isDarkMode,
  onSimulateTest,
  onCalibrate,
}) => {
  const redLimit = thresholdRed || threshold || 1.6;
  const yellowLimit = thresholdYellow || redLimit * 0.5;

  const [history, setHistory] = useState<number[]>(() => new Array(40).fill(0));
  const [isCalibrating, setIsCalibrating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep a 40-sample rolling history for the oscilloscope waveform
  useEffect(() => {
    if (!isArmed || isPaused) return;
    setHistory((prev) => {
      return [...prev.slice(1), motion.delta];
    });
  }, [motion.delta, motion.timestamp, isArmed, isPaused]);

  // Draw real-time oscilloscope waveform with solid colors (strictly no gradients)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Baseline grid lines
    ctx.strokeStyle = isDarkMode ? '#303134' : '#E1E3E1';
    ctx.lineWidth = 1;

    const maxVal = Math.max(3.6, redLimit * 1.8);

    // 1. Yellow Warning line
    const yellowY = height - (yellowLimit / maxVal) * (height - 14) - 6;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = isDarkMode ? '#FDD663' : '#B06000';
    ctx.moveTo(0, yellowY);
    ctx.lineTo(width, yellowY);
    ctx.stroke();

    // 2. Red Danger line
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
    ctx.strokeStyle = isDarkMode ? '#444746' : '#C4C7C5';
    ctx.moveTo(0, baselineY);
    ctx.lineTo(width, baselineY);
    ctx.stroke();

    // 4. Plot waveform with solid colors
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
        ? isDarkMode ? '#FDD663' : '#B06000'
        : '#1A73E8';
      ctx.lineWidth = 2;

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

      // Solid flat fill under curve (no gradient)
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      if (isRed) {
        ctx.fillStyle = isDarkMode ? 'rgba(217, 48, 37, 0.25)' : 'rgba(217, 48, 37, 0.12)';
      } else if (isYellowActive) {
        ctx.fillStyle = isDarkMode ? 'rgba(253, 214, 99, 0.25)' : 'rgba(176, 96, 0, 0.1)';
      } else if (!isPaused && isArmed) {
        ctx.fillStyle = isDarkMode ? 'rgba(138, 180, 248, 0.2)' : 'rgba(26, 115, 232, 0.08)';
      } else {
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
      }
      ctx.fill();
    }
  }, [history, redLimit, yellowLimit, motion.delta, isDarkMode, isPaused, isArmed]);

  const isRed = motion.delta >= redLimit && isArmed && !isPaused;
  const isYellow = motion.delta >= yellowLimit && !isRed && isArmed && !isPaused;

  const deltaColorClass = isPaused || !isArmed
    ? 'text-[#5F6368] dark:text-[#9AA0A6]'
    : isRed
    ? 'text-[#D93025] dark:text-[#F28B82]'
    : isYellow
    ? 'text-[#B06000] dark:text-[#FDD663]'
    : 'text-[#1A73E8] dark:text-[#8AB4F8]';

  const gaugeMax = Math.max(3.6, redLimit * 1.8);
  const gaugePercent = isPaused || !isArmed
    ? 0
    : Math.min(100, (motion.delta / gaugeMax) * 100);

  const yellowMarkerPos = (yellowLimit / gaugeMax) * 100;
  const redMarkerPos = (redLimit / gaugeMax) * 100;

  const handleCalibrateClick = async () => {
    if (!onCalibrate || isCalibrating) return;
    setIsCalibrating(true);
    try {
      await onCalibrate();
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div
      id="live-motion-meter"
      className={`rounded-3xl border transition-all p-4 sm:p-5 shadow-xs space-y-4 ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      }`}
    >
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              isRed
                ? 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82]'
                : isYellow
                ? 'bg-[#FEF7E0] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                : isPaused
                ? 'bg-[#F1F3F4] text-[#3C4043] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                : 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight font-sans text-black dark:text-white">
              Vibration Sensor Meter
            </h3>
            <p className="text-xs text-gray-700 dark:text-[#9AA0A6] font-medium">
              Warning at {yellowLimit.toFixed(1)} m/s² &bull; Alarm at {redLimit.toFixed(1)} m/s²
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {isRed ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FCE8E6] border-2 border-red-300 text-red-950 dark:bg-[#D93025]/20 dark:text-[#F28B82] dark:border-[#D93025]/40 font-extrabold text-xs">
            <AlertOctagon className="w-3.5 h-3.5" />
            Alarm Active
          </span>
        ) : isYellow ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FEF7E0] border-2 border-amber-300 text-amber-950 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40 font-extrabold text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning Active
          </span>
        ) : (
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border-2 ${
              isPaused
                ? 'bg-[#FEF7E0] text-amber-950 border-amber-300 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40'
                : !isArmed
                ? 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-[#2D2E30] dark:text-[#9AA0A6] dark:border-transparent'
                : 'bg-[#E6F4EA] text-green-950 border-green-300 dark:bg-[#137333]/20 dark:text-[#81C995] dark:border-[#137333]/40'
            }`}
          >
            {isArmed && !isPaused && <span className="w-2 h-2 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />}
            {isPaused ? 'Paused' : isArmed ? 'Listening' : 'Off'}
          </span>
        )}
      </div>

      {/* 2. Main Live Vibration Reading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134] gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-[#9AA0A6] block">
            Water Movement Vibration
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              id="motion-delta-value"
              className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight transition-colors ${deltaColorClass}`}
            >
              {isPaused || !isArmed ? '0.00' : motion.delta.toFixed(2)}
            </span>
            <span className="text-xs font-extrabold text-gray-900 dark:text-[#9AA0A6]">
              m/s²
            </span>
          </div>
        </div>

        {/* Baseline Rest Level & Calibration Button */}
        <div className="flex items-center gap-2">
          <div className="text-left sm:text-right">
            <span className="text-xs text-black dark:text-white block font-extrabold">
              Rest Level: {baselineGravity.toFixed(2)} m/s²
            </span>
            <span className="text-[11px] text-gray-700 dark:text-[#9AA0A6] font-medium">
              Gravity calibrated
            </span>
          </div>

          {onCalibrate && isArmed && (
            <button
              type="button"
              id="btn-calibrate-motion"
              onClick={handleCalibrateClick}
              disabled={isCalibrating}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1E1F20] border-2 border-gray-300 dark:border-[#303134] hover:bg-gray-100 text-xs font-bold text-gray-950 dark:text-white flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95 cursor-pointer"
              title="Calibrate still rest position"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#1A73E8] ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'Calibrating...' : 'Calibrate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Horizontal Level Bar with Markers */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-[#9AA0A6]">
          <span className="font-extrabold text-gray-950 dark:text-white">0.0 (Still)</span>
          <span className="text-amber-950 dark:text-[#FDD663] font-extrabold">Warning: {yellowLimit.toFixed(1)}</span>
          <span className="text-red-950 dark:text-[#F28B82] font-extrabold">Alarm: {redLimit.toFixed(1)}</span>
        </div>

        <div className="w-full h-3.5 bg-gray-200 dark:bg-[#303134] rounded-full overflow-hidden relative">
          {/* Yellow marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#B06000] dark:bg-[#FDD663] z-10"
            style={{ left: `${yellowMarkerPos}%` }}
          />
          {/* Red marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#D93025] dark:bg-[#F28B82] z-10"
            style={{ left: `${redMarkerPos}%` }}
          />
          {/* Level Fill */}
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              isRed
                ? 'bg-[#D93025]'
                : isYellow
                ? 'bg-[#B06000]'
                : 'bg-[#1A73E8]'
            }`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      </div>

      {/* 4. Real-time Oscilloscope Waveform */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-900 dark:text-[#9AA0A6]">
          <span className="font-extrabold text-gray-950 dark:text-white">Live Waveform</span>
          <span className="font-mono text-[11px] font-bold text-gray-800 dark:text-[#9AA0A6]">
            X: {motion.x.toFixed(1)} &bull; Y: {motion.y.toFixed(1)} &bull; Z: {motion.z.toFixed(1)}
          </span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-[#303134] bg-gray-50 dark:bg-[#121316] p-2">
          <canvas
            ref={canvasRef}
            width={400}
            height={80}
            className="w-full h-[80px] block"
          />
        </div>
      </div>

      {/* 5. 3-Axis & Total Vector Cards */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="py-2 px-1 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134]">
          <span className="block text-[10px] font-extrabold text-gray-800 dark:text-[#9AA0A6]">X Axis</span>
          <span className="font-mono text-xs sm:text-sm font-extrabold text-black dark:text-white">
            {motion.x.toFixed(1)}
          </span>
        </div>
        <div className="py-2 px-1 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134]">
          <span className="block text-[10px] font-extrabold text-gray-800 dark:text-[#9AA0A6]">Y Axis</span>
          <span className="font-mono text-xs sm:text-sm font-extrabold text-black dark:text-white">
            {motion.y.toFixed(1)}
          </span>
        </div>
        <div className="py-2 px-1 rounded-2xl bg-gray-50 dark:bg-[#28292A] border-2 border-gray-200 dark:border-[#303134]">
          <span className="block text-[10px] font-extrabold text-gray-800 dark:text-[#9AA0A6]">Z Axis</span>
          <span className="font-mono text-xs sm:text-sm font-extrabold text-black dark:text-white">
            {motion.z.toFixed(1)}
          </span>
        </div>
        <div className="py-2 px-1 rounded-2xl bg-[#E8F0FE] dark:bg-[#1A73E8]/20 border-2 border-blue-200 dark:border-[#1A73E8]/40">
          <span className="block text-[10px] font-extrabold text-blue-950 dark:text-[#8AB4F8]">Total Vector</span>
          <span className="font-mono text-xs sm:text-sm font-extrabold text-blue-950 dark:text-[#8AB4F8]">
            {motion.totalMagnitude.toFixed(1)}
          </span>
        </div>
      </div>

      {/* 6. Quick Simulation Test Buttons */}
      {onSimulateTest && (
        <div className="pt-2 border-t-2 border-gray-200 dark:border-[#303134] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-black dark:text-white">
            Test Alarm System:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSimulateTest('yellow')}
              className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FEF7E0] hover:bg-[#FEEFC3] text-amber-950 border-2 border-amber-400 dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40 transition-colors active:scale-95 shadow-2xs cursor-pointer"
            >
              Test Warning (Yellow)
            </button>
            <button
              type="button"
              onClick={() => onSimulateTest('red')}
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
