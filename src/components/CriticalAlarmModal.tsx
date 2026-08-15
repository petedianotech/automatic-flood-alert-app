import React, { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldCheck,
  Check,
  Copy,
  ArrowRight,
  Sparkles,
  MapPin,
  Compass,
  ExternalLink,
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

  const isYellow = activeAlert?.severity === 'yellow';
  const HOLD_DURATION_MS = isYellow ? 1000 : 2000;

  // Sound triggers based on alert level
  useEffect(() => {
    if (!activeAlert || isMuted) {
      sirenService.stopAllAlarms();
      return;
    }

    if (activeAlert.severity === 'yellow') {
      sirenService.stopEmergencySiren();
      sirenService.startWarningChime();
    } else {
      sirenService.stopWarningChime();
      sirenService.startEmergencySiren();
    }

    return () => {
      sirenService.stopAllAlarms();
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

      if (progress < 1) {
        sirenService.playBeep(isYellow ? 580 + progress * 400 : 600 + progress * 800, 40);
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
    sirenService.stopAllAlarms();
    if (activeAlert) {
      onDismiss(activeAlert.id);
    }
    setHoldProgress(0);
    setIsHolding(false);
  };

  const locationFullString =
    activeAlert?.location?.fullAddress ||
    activeAlert?.locationLabel ||
    `${activeAlert?.riverName || 'Ruo River'}, ${activeAlert?.village || 'Dzenje Village'}, ${activeAlert?.traditionalAuthority || 'T/A Mabuka'}, ${activeAlert?.district || 'Mulanje District'}, ${activeAlert?.region || 'Southern Region, Malawi'}`;

  const handleCopyAlertText = () => {
    if (!activeAlert) return;
    const levelLabel = isYellow ? '⚠️ FLOOD WARNING (YELLOW LEVEL)' : '🚨 CRITICAL FLOOD ALARM (RED LEVEL)';
    const text = `${levelLabel}\nRiver & Station: ${activeAlert.riverName || 'Ruo River'} - ${activeAlert.nodeName}\nLocation: ${locationFullString}\nTime: ${activeAlert.formattedTime}\nPeak Force: ${activeAlert.peakDelta.toFixed(2)} m/s²\nCoordinates: ${activeAlert.latitude || -16.0315}°, ${activeAlert.longitude || 35.5000}°\nAction: ${isYellow ? 'Prepare belongings and stand by for evacuation' : 'EVACUATE TO HIGH GROUND IMMEDIATELY!'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!activeAlert) return null;

  return (
    <div
      id="critical-flood-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`w-full max-w-lg rounded-[28px] sm:rounded-3xl text-white p-5 sm:p-7 shadow-2xl border-3 sm:border-4 relative overflow-hidden transition-all ${
          isYellow
            ? 'bg-[#B06000] border-amber-300/40 animate-pulse'
            : 'bg-[#D93025] border-white/20 animate-pulse'
        }`}
        style={{
          boxShadow: isYellow
            ? '0 0 50px rgba(235, 140, 0, 0.7), 0 0 90px rgba(235, 140, 0, 0.35)'
            : '0 0 60px rgba(217, 48, 37, 0.8), 0 0 100px rgba(217, 48, 37, 0.4)',
        }}
      >
        {/* Glow ambient blurs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-black/25 blur-3xl pointer-events-none" />

        {/* Top Bar Header */}
        <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs ${
                isYellow ? 'bg-amber-100 text-[#8C4A00]' : 'bg-white text-[#D93025]'
              }`}
            >
              {isYellow ? '⚠️ Level 1: Yellow Warning' : '🚨 Level 2: Critical Emergency'}
            </span>
          </div>

          <button
            id="btn-mute-siren-alarm"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white border border-white/25"
            title={isMuted ? 'Unmute Alarm' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
          </button>
        </div>

        {/* Center Icon & Heading */}
        <div className="text-center relative z-10 space-y-1.5 mb-3">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg transform transition-transform ${
              isYellow
                ? 'bg-amber-100 text-[#B06000] rotate-2'
                : 'bg-white text-[#D93025] rotate-3'
            }`}
          >
            {isYellow ? (
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            ) : (
              <AlertOctagon className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            )}
          </div>

          <h1
            id="critical-alert-title"
            className="text-lg sm:text-xl font-black font-sans tracking-tight text-white uppercase leading-tight drop-shadow-xs"
          >
            {isYellow ? '⚠️ FLOOD WARNING (YELLOW LEVEL)' : '🚨 CRITICAL FLOOD ALARM (RED LEVEL)'}
          </h1>

          {/* Prominent Flood River Location Box */}
          <div className="rounded-2xl bg-black/35 p-2.5 sm:p-3 border border-white/20 text-left space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-200">
                <MapPin className="w-3.5 h-3.5 text-red-300 shrink-0" />
                <span>Flood Location: {activeAlert.riverName || 'Ruo River'}</span>
              </div>
              {(activeAlert.mapsUrl || (activeAlert.latitude && activeAlert.longitude)) && (
                <a
                  href={
                    activeAlert.mapsUrl ||
                    `https://www.google.com/maps?q=${activeAlert.latitude || -16.0315},${activeAlert.longitude || 35.5000}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-white bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 transition-colors"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <p className="text-white text-xs font-semibold leading-tight">
              {locationFullString}
            </p>

            <div className="flex items-center gap-2 text-[10px] font-mono text-white/80">
              <Compass className="w-3 h-3 text-blue-200" />
              <span>
                Coordinates: {activeAlert.latitude ? activeAlert.latitude.toFixed(4) : '-16.0315'}° S,{' '}
                {activeAlert.longitude ? activeAlert.longitude.toFixed(4) : '35.5000'}° E
              </span>
            </div>
          </div>
        </div>

        {/* Live Metrics Pill Box */}
        <div className="relative z-10 rounded-2xl bg-black/25 p-2.5 sm:p-3 border border-white/15 backdrop-blur-xs mb-3 grid grid-cols-3 gap-1.5 text-center">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70 block">
              Vibration Delta (Δ)
            </span>
            <span className="text-sm sm:text-lg font-black font-mono text-white">
              {activeAlert.peakDelta.toFixed(2)} m/s²
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70 block">
              Alert Severity
            </span>
            <span
              className={`text-[11px] sm:text-xs font-black uppercase font-mono px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                isYellow ? 'bg-amber-400 text-black' : 'bg-red-600 text-white'
              }`}
            >
              {isYellow ? 'YELLOW' : 'CRITICAL RED'}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70 block">
              Time
            </span>
            <span className="text-[11px] sm:text-xs font-bold font-mono text-white">
              {activeAlert.formattedTime}
            </span>
          </div>
        </div>

        {/* Action Directives Card */}
        <div className="relative z-10 rounded-xl bg-white/10 p-2 sm:p-2.5 border border-white/15 mb-3 text-xs font-semibold space-y-1">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-white/95">
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            <span>{isYellow ? 'What to do now:' : 'What to do right now:'}</span>
          </div>
          <p className="text-white/85 text-[11px] leading-relaxed">
            {isYellow
              ? 'Pack your essential items, charge your phone, keep torches ready, and stay tuned for updates.'
              : 'Move children, elderly family members, and animals to high ground or safe shelters immediately.'}
          </p>
        </div>

        {/* Action Button: Hold To Acknowledge / Dismiss */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5">
          <button
            id="btn-hold-to-dismiss"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            className={`w-full py-3.5 rounded-2xl active:scale-98 font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl transition-all relative overflow-hidden flex items-center justify-center gap-2 select-none ${
              isYellow
                ? 'bg-white text-[#8C4A00] hover:bg-amber-50'
                : 'bg-white text-[#D93025] hover:bg-gray-100'
            }`}
          >
            <div
              className={`absolute left-0 top-0 bottom-0 opacity-30 transition-all duration-75 ${
                isYellow ? 'bg-amber-600' : 'bg-[#B3261E]'
              }`}
              style={{ width: `${holdProgress * 100}%` }}
            />

            <ShieldCheck className="w-4 h-4 shrink-0 relative z-10" />
            <span className="relative z-10">
              {isHolding
                ? `HOLDING... ${Math.round(holdProgress * 100)}%`
                : isYellow
                ? 'PRESS & HOLD TO ACKNOWLEDGE'
                : 'PRESS & HOLD TO STOP ALARM'}
            </span>
          </button>

          <p className="text-[10px] text-white/75 font-medium text-center">
            *Press and hold the button to silence the alarm and acknowledge the warning
          </p>
        </div>

        {/* Copy Details Bar */}
        <div className="relative z-10 mt-2.5 pt-2.5 border-t border-white/15 flex items-center justify-center gap-3">
          <button
            id="btn-copy-alert-summary"
            onClick={handleCopyAlertText}
            className="text-[11px] font-bold text-white hover:text-white/80 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 border border-white/20 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5 text-white" />}
            <span>{copied ? 'Details Copied!' : 'Copy Alert Info & Location'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
