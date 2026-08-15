import React, { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldCheck,
  Check,
  ArrowRight,
  MapPin,
  ExternalLink,
  Share2,
  Activity,
  BellRing,
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
  const HOLD_DURATION_MS = isYellow ? 900 : 1500;

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

  // Hold-to-dismiss handler
  const handleHoldStart = () => {
    setIsHolding(true);
    startTimeRef.current = Date.now();

    holdTimerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);

      if (progress < 1) {
        sirenService.playBeep(isYellow ? 520 + progress * 300 : 600 + progress * 700, 35);
      }

      if (progress >= 1) {
        handleHoldComplete();
      }
    }, 35);
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
    `${activeAlert?.riverName || 'Ruo River'}, ${activeAlert?.village || 'Dzenje Village'}, ${activeAlert?.traditionalAuthority || 'T/A Mabuka'}, ${activeAlert?.district || 'Mulanje'}`;

  const shareText = isYellow
    ? `⚠️ FLOOD WARNING (WATER RISING)\n📍 River & Area: ${locationFullString}\n⏰ Time: ${activeAlert?.formattedTime || 'Just now'}\n\n👉 What to do: Water is rising near the river. Pack your bags, keep phones charged, and get ready to move if needed!`
    : `🚨 URGENT FLOOD ALARM (DANGER!)\n📍 River & Area: ${locationFullString}\n⏰ Time: ${activeAlert?.formattedTime || 'Just now'}\n\n🚨 ACTION NEEDED: Rushing flood water detected! Move your family and animals to high safe ground IMMEDIATELY!`;

  const handleShareOrCopy = async () => {
    if (!activeAlert) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: isYellow ? '⚠️ Flood Warning - Water Rising' : '🚨 URGENT FLOOD ALARM - Move to High Ground!',
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed native share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  if (!activeAlert) return null;

  return (
    <div
      id="critical-flood-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Main Alert Card */}
      <div
        id="critical-alert-card"
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all text-white border-2 sm:border-3 ${
          isYellow
            ? 'bg-gradient-to-b from-[#8C4A00] via-[#703800] to-[#4A2400] border-amber-400/50'
            : 'bg-gradient-to-b from-[#C5221F] via-[#A51D24] to-[#750F14] border-red-400/60'
        }`}
        style={{
          boxShadow: isYellow
            ? '0 0 45px rgba(245, 158, 11, 0.45), 0 20px 50px rgba(0, 0, 0, 0.7)'
            : '0 0 55px rgba(220, 38, 38, 0.6), 0 20px 50px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Subtle decorative background waves */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-black/40 blur-3xl pointer-events-none" />

        {/* 1. Header Bar: Severity Badge & Siren Mute Control */}
        <div className="flex items-center justify-between gap-3 relative z-10 mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs ${
                isYellow
                  ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-400/60'
                  : 'bg-white text-red-700 ring-2 ring-white/60 animate-pulse'
              }`}
            >
              {isYellow ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Warning: Water Rising</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Danger: Flood Alarm</span>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            id="btn-mute-siren-alarm"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-2xl bg-black/30 hover:bg-black/40 active:scale-95 transition-all text-white border border-white/20 flex items-center gap-1.5 text-xs font-semibold"
            title={isMuted ? 'Turn Sound On' : 'Silence Siren'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-200" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-white animate-bounce" />
                <span className="hidden sm:inline">Sound On</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Main Alert Headline & Icon */}
        <div className="text-center relative z-10 space-y-2 mb-4">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-xl transform transition-transform ${
              isYellow
                ? 'bg-amber-300 text-amber-950 shadow-amber-500/30'
                : 'bg-white text-red-600 shadow-red-950/50'
            }`}
          >
            {isYellow ? (
              <AlertTriangle className="w-9 h-9 animate-pulse" />
            ) : (
              <AlertOctagon className="w-10 h-10 animate-bounce" />
            )}
          </div>

          <h1
            id="critical-alert-title"
            className="text-xl sm:text-2xl font-black font-sans tracking-tight uppercase leading-tight drop-shadow-sm text-white"
          >
            {isYellow ? '⚠️ Flood Warning' : '🚨 Flood Danger! Evacuate'}
          </h1>

          <p className="text-xs sm:text-sm font-medium text-white/90 max-w-sm mx-auto leading-snug">
            {isYellow
              ? 'River water is rising fast. Stay alert and get ready to move to safety.'
              : 'Dangerous rushing water detected! Move to high ground immediately!'}
          </p>
        </div>

        {/* 3. Location Box */}
        <div className="relative z-10 rounded-2xl bg-black/30 backdrop-blur-xs p-3.5 border border-white/15 mb-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <span>Location: {activeAlert.riverName || 'Ruo River'}</span>
            </div>

            {(activeAlert.mapsUrl || (activeAlert.latitude && activeAlert.longitude)) && (
              <a
                href={
                  activeAlert.mapsUrl ||
                  `https://www.google.com/maps?q=${activeAlert.latitude || -16.0315},${activeAlert.longitude || 35.5000}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 transition-colors shrink-0"
              >
                <span>View Map</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <p className="text-white text-xs font-medium leading-snug">
            {locationFullString}
          </p>

          <div className="flex items-center justify-between text-[11px] text-white/80 pt-0.5 border-t border-white/10">
            <span>Reported at: <strong>{activeAlert.formattedTime || 'Just now'}</strong></span>
            <span className="font-semibold text-emerald-300 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Live Sensor Signal
            </span>
          </div>
        </div>

        {/* 4. Action Steps (Simple Plain English) */}
        <div
          className={`relative z-10 rounded-2xl p-3.5 border mb-4 ${
            isYellow
              ? 'bg-amber-950/40 border-amber-300/30 text-amber-50'
              : 'bg-black/40 border-red-300/30 text-red-50'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide mb-2 text-white">
            <ArrowRight className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{isYellow ? 'What you should do now:' : 'What you must do right now:'}</span>
          </div>

          {isYellow ? (
            <ul className="space-y-1.5 text-xs text-white/90 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-300">&bull;</span>
                <span>Pack your important papers, torch, and charged phone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-300">&bull;</span>
                <span>Keep watch on children and help elderly neighbors get ready.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-300">&bull;</span>
                <span>Stay away from the river bank and bridges.</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-1.5 text-xs text-white/95 leading-relaxed font-semibold">
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-300">1.</span>
                <span>Move immediately to higher ground or the village school shelter.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-300">2.</span>
                <span>Take family members and livestock away from low river areas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-300">3.</span>
                <span>Do NOT attempt to cross flowing water or flooded roads.</span>
              </li>
            </ul>
          )}
        </div>

        {/* 5. Primary Action: Press & Hold To Stop Alarm */}
        <div className="relative z-10 space-y-2">
          <button
            type="button"
            id="btn-hold-to-dismiss"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            className={`w-full py-3.5 sm:py-4 rounded-2xl active:scale-98 font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl transition-all relative overflow-hidden flex items-center justify-center gap-2 select-none border border-black/10 ${
              isYellow
                ? 'bg-amber-300 text-amber-950 hover:bg-amber-200'
                : 'bg-white text-red-700 hover:bg-zinc-100'
            }`}
          >
            {/* Hold progress filling bar */}
            <div
              className={`absolute left-0 top-0 bottom-0 opacity-40 transition-all duration-75 ${
                isYellow ? 'bg-amber-700' : 'bg-red-800'
              }`}
              style={{ width: `${holdProgress * 100}%` }}
            />

            <ShieldCheck className="w-5 h-5 shrink-0 relative z-10" />
            <span className="relative z-10">
              {isHolding
                ? `HOLDING... ${Math.round(holdProgress * 100)}%`
                : isYellow
                ? 'PRESS & HOLD TO TURN OFF WARNING'
                : 'PRESS & HOLD TO STOP LOUD SIREN'}
            </span>
          </button>

          <p className="text-[11px] text-white/80 font-medium text-center">
            *Hold the button for a moment to confirm you have seen the alert.
          </p>
        </div>

        {/* 6. Quick Share / WhatsApp / SMS button */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/15 flex items-center justify-center">
          <button
            type="button"
            id="btn-share-alert-action"
            onClick={handleShareOrCopy}
            className="w-full sm:w-auto py-2 px-4 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all border border-white/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-200">Alert Message Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Warning with Family &amp; Village</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

