import React, { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  Volume2,
  VolumeX,
  ShieldCheck,
  Flame,
  PhoneCall,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { FloodAlert } from '../types';
import { sirenService } from '../services/audioSiren';

interface CriticalAlarmModalProps {
  activeAlert: FloodAlert | null;
  onDismiss: (alertId: string) => void;
  isSoundEnabled: boolean;
}

export const CriticalAlarmModal: React.FC<CriticalAlarmModalProps> = ({
  activeAlert,
  onDismiss,
  isSoundEnabled,
}) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(!isSoundEnabled);
  const [copied, setCopied] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const HOLD_DURATION_MS = 2000; // 2 seconds safety hold to dismiss

  // Play / Stop siren
  useEffect(() => {
    if (activeAlert && !isMuted) {
      sirenService.startEmergencySiren();
    } else {
      sirenService.stopEmergencySiren();
    }

    return () => {
      sirenService.stopEmergencySiren();
    };
  }, [activeAlert, isMuted]);

  // Hold handler
  const handleHoldStart = () => {
    setIsHolding(true);
    startTimeRef.current = Date.now();

    holdTimerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);

      // Play escalating feedback click/beep
      if (progress < 1) {
        sirenService.playBeep(600 + progress * 800, 40);
      }

      if (progress >= 1) {
        handleHoldComplete();
      }
    }, 40);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    startTimeRef.current = null;
    if (holdTimerRef.current !== null) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const handleHoldComplete = () => {
    if (holdTimerRef.current !== null) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    sirenService.stopEmergencySiren();
    if (activeAlert) {
      onDismiss(activeAlert.id);
    }
    setHoldProgress(0);
    setIsHolding(false);
  };

  const handleCopyAlertText = () => {
    if (!activeAlert) return;
    const text = `🚨 CRITICAL FLOOD ALERT DETECTED!\nLocation: ${activeAlert.nodeName}\nTime: ${activeAlert.formattedTime}\nPeak Force: ${activeAlert.peakDelta.toFixed(2)} m/s²\nSustained Vibration: ${activeAlert.durationSeconds.toFixed(1)}s\nPlease check water sensor immediately!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!activeAlert) return null;

  return (
    <div
      id="critical-flood-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      {/* Animated Emergency Modal Container with Material System Red Palette */}
      <div
        className="w-full max-w-xl rounded-3xl bg-[#D93025] text-white p-6 sm:p-8 shadow-2xl border-4 border-white/20 animate-pulse relative overflow-hidden"
        style={{
          boxShadow: '0 0 60px rgba(217, 48, 37, 0.8), 0 0 100px rgba(217, 48, 37, 0.4)',
        }}
      >
        {/* Background pulsating effect */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        {/* Top Header & Mute Button */}
        <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-white text-[#D93025] shadow-xs">
              System Emergency
            </span>
          </div>

          <button
            id="btn-mute-siren-alarm"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white border border-white/20"
            title={isMuted ? 'Unmute Siren' : 'Mute Local Siren'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
          </button>
        </div>

        {/* Big Alert Icon & Main Text */}
        <div className="text-center relative z-10 space-y-3 mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white text-[#D93025] mx-auto flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
            <AlertOctagon className="w-12 h-12 sm:w-14 sm:h-14 animate-bounce" />
          </div>

          <h1
            id="critical-alert-title"
            className="text-2xl sm:text-3xl lg:text-4xl font-black font-sans tracking-tight text-white uppercase leading-tight drop-shadow-sm"
          >
            🚨 CRITICAL FLOOD ALERT DETECTED!
          </h1>

          <p className="text-white/90 text-sm sm:text-base font-medium max-w-md mx-auto leading-snug">
            Water sensor continuous vibration trip reached. High-amplitude water movement detected at{' '}
            <strong className="underline font-bold text-white">{activeAlert.nodeName}</strong>.
          </p>
        </div>

        {/* Telemetry Breakdown Box */}
        <div className="relative z-10 rounded-2xl bg-black/20 p-4 border border-white/15 backdrop-blur-xs mb-8 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block">
              Peak Delta ($\Delta$)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {activeAlert.peakDelta.toFixed(2)} m/s²
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block">
              Sustained
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {activeAlert.durationSeconds.toFixed(1)}s
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block">
              Trigger Time
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-white">
              {activeAlert.formattedTime}
            </span>
          </div>
        </div>

        {/* Safety "HOLD TO DISMISS" Button */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
          <div className="w-full relative">
            <button
              id="btn-hold-to-dismiss"
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              className="w-full py-5 rounded-2xl bg-white text-[#D93025] hover:bg-gray-100 active:scale-98 font-black text-base sm:text-lg tracking-wider uppercase shadow-xl transition-all relative overflow-hidden flex items-center justify-center gap-3 select-none"
            >
              {/* Hold Progress Fill Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#B3261E] opacity-25 transition-all duration-75"
                style={{ width: `${holdProgress * 100}%` }}
              />

              <ShieldCheck className="w-6 h-6 shrink-0 relative z-10" />
              <span className="relative z-10">
                {isHolding
                  ? `HOLDING... ${Math.round(holdProgress * 100)}%`
                  : 'HOLD 2 SECONDS TO DISMISS SIREN'}
              </span>
            </button>
          </div>

          <p className="text-xs text-white/75 font-medium text-center">
            *Requires intentional press-and-hold to prevent accidental dismissal during an emergency.
          </p>
        </div>

        {/* Action Bar (Copy summary / Quick Share) */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/15 flex items-center justify-center gap-4">
          <button
            id="btn-copy-alert-summary"
            onClick={handleCopyAlertText}
            className="text-xs font-bold text-white hover:text-white/80 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Alert Summary!' : 'Copy Alert Details'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
