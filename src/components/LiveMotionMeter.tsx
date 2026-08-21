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
      className={`rounded-[24px] border transition-all p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E6E1E5]'
          : 'bg-[#F3F3FA] border-[#E7E0EC]/80 text-[#1C1B1F]'
      }`}
    >
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-[18px] flex items-center justify-center shrink-0 transition-colors shadow-xs ${
              isRed
                ? 'bg-[#FCE8E6] text-[#BA1A1A] dark:bg-[#BA1A1A]/20 dark:text-[#F28B82]'
                : isYellow
                ? 'bg-[#FEF7E0] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
                : isPaused
                ? 'bg-[#E7E0EC] text-[#49454F] dark:bg-[#2D2E30] dark:text-[#CAC4D0]'
                : 'bg-[#E0EFFF] text-[#1F71E8] dark:bg-[#1F71E8]/20 dark:text-[#A8C7FA]'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base tracking-tight font-sans text-[#1C1B1F] dark:text-white">
              Vibration Sensor Meter
            </h3>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-normal">
              Warning at {yellowLimit.toFixed(1)} m/s² &bull; Alarm at {redLimit.toFixed(1)} m/s²
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {isRed ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FCE8E6] border border-[#FAD2CF] text-[#BA1A1A] dark:bg-[#BA1A1A]/20 dark:text-[#F28B82] dark:border-[#BA1A1A]/40 font-medium text-xs">
            <AlertOctagon className="w-3.5 h-3.5" />
            Alarm Active
          </span>
        ) : isYellow ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FEF7E0] border border-[#FEEFC3] text-[#934D00] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40 font-medium text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning Active
          </span>
        ) : (
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 border ${
              isPaused
                ? 'bg-[#FEF7E0] text-[#934D00] border-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663] dark:border-[#B06000]/40'
                : !isArmed
                ? 'bg-[#E7E0EC] text-[#49454F] border-transparent dark:bg-[#2D2E30] dark:text-[#CAC4D0]'
                : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6] dark:bg-[#137333]/20 dark:text-[#81C995] dark:border-[#137333]/40'
            }`}
          >
            {isArmed && !isPaused && <span className="w-2 h-2 rounded-full bg-[#137333] dark:bg-[#81C995] animate-ping" />}
            {isPaused ? 'Paused' : isArmed ? 'Listening' : 'Off'}
          </span>
        )}
      </div>

      {/* 2. Main Live Vibration Reading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[20px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] gap-3 shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#49454F] dark:text-[#CAC4D0] block">
            Vibration Sensor
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              id="motion-delta-value"
              className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight transition-colors ${deltaColorClass}`}
            >
              {isPaused || !isArmed ? '0.00' : motion.delta.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">
              m/s²
            </span>
          </div>
        </div>

        {/* Baseline Rest Level & Calibration Button */}
        <div className="flex items-center gap-2">
          <div className="text-left sm:text-right">
            <span className="text-xs text-[#1C1B1F] dark:text-white block font-bold">
              Rest Level: {baselineGravity.toFixed(2)} m/s²
            </span>
            <span className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium">
              Gravity calibrated
            </span>
          </div>

          {onCalibrate && isArmed && (
            <button
              type="button"
              id="btn-calibrate-motion"
              onClick={handleCalibrateClick}
              disabled={isCalibrating}
              className="px-3.5 py-1.5 rounded-full bg-[#E0EFFF] hover:bg-[#D2E7FC] dark:bg-[#1F71E8]/20 dark:hover:bg-[#1F71E8]/30 border border-[#C2E7FF] dark:border-[#1F71E8]/40 text-xs font-bold text-[#1F71E8] dark:text-[#A8C7FA] flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
              title="Calibrate still rest position"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#1F71E8] ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'Calibrating...' : 'Calibrate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Horizontal Level Bar with Markers */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">
          <span className="text-[#1C1B1F] dark:text-white font-bold">0.0 (Still)</span>
          <span className="text-[#934D00] dark:text-[#FDD663] font-bold">Warning: {yellowLimit.toFixed(1)}</span>
          <span className="text-[#BA1A1A] dark:text-[#F28B82] font-bold">Alarm: {redLimit.toFixed(1)}</span>
        </div>

        <div className="w-full h-3 bg-[#E7E0EC] dark:bg-[#303134] rounded-full overflow-hidden relative">
          {/* Yellow marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#934D00] dark:bg-[#FDD663] z-10"
            style={{ left: `${yellowMarkerPos}%` }}
          />
          {/* Red marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#BA1A1A] dark:bg-[#F28B82] z-10"
            style={{ left: `${redMarkerPos}%` }}
          />
          {/* Level Fill */}
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              isRed
                ? 'bg-[#BA1A1A]'
                : isYellow
                ? 'bg-[#934D00]'
                : 'bg-[#1F71E8]'
            }`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      </div>

      {/* 4. Real-time Oscilloscope Waveform */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#49454F] dark:text-[#CAC4D0]">
          <span className="font-bold text-[#1C1B1F] dark:text-white">Live Waveform</span>
          <span className="font-mono text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">
            X: {motion.x.toFixed(1)} &bull; Y: {motion.y.toFixed(1)} &bull; Z: {motion.z.toFixed(1)}
          </span>
        </div>

        <div className="relative rounded-[20px] overflow-hidden border border-[#E7E0EC]/80 dark:border-[#303134] bg-white dark:bg-[#121316] p-2 shadow-xs">
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
        <div className="py-2.5 px-1 rounded-[16px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] shadow-xs">
          <span className="block text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">X Axis</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-[#1C1B1F] dark:text-white">
            {motion.x.toFixed(1)}
          </span>
        </div>
        <div className="py-2.5 px-1 rounded-[16px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] shadow-xs">
          <span className="block text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">Y Axis</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-[#1C1B1F] dark:text-white">
            {motion.y.toFixed(1)}
          </span>
        </div>
        <div className="py-2.5 px-1 rounded-[16px] bg-white dark:bg-[#28292A] border border-[#E7E0EC]/80 dark:border-[#303134] shadow-xs">
          <span className="block text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">Z Axis</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-[#1C1B1F] dark:text-white">
            {motion.z.toFixed(1)}
          </span>
        </div>
        <div className="py-2.5 px-1 rounded-[16px] bg-[#E0EFFF] dark:bg-[#1F71E8]/20 border border-[#C2E7FF] dark:border-[#1F71E8]/40 shadow-xs">
          <span className="block text-xs font-semibold text-[#1F71E8] dark:text-[#A8C7FA]">Total</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-[#1F71E8] dark:text-[#A8C7FA]">
            {motion.totalMagnitude.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};
