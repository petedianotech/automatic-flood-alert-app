import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Volume2,
  VolumeX,
  Power,
  Check,
  MapPin,
  ExternalLink,
  Share2,
  Activity,
  BellRing,
  BellOff,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Package,
} from 'lucide-react';
import { FloodAlert } from '../types';
import { sirenService } from '../services/audioSiren';

interface CriticalAlarmModalProps {
  activeAlert: FloodAlert | null;
  onDismiss: (alertId: string) => void;
  onTurnOffSensorAndDismiss?: (alertId: string) => void;
  isSoundEnabled: boolean;
}

export const CriticalAlarmModal: React.FC<CriticalAlarmModalProps> = ({
  activeAlert,
  onDismiss,
  onTurnOffSensorAndDismiss,
  isSoundEnabled,
}) => {
  const [isMuted, setIsMuted] = useState(!isSoundEnabled);
  const [copied, setCopied] = useState(false);

  // Both collapsible sections are open (shown) by default as requested
  const [showFloodActions, setShowFloodActions] = useState(true);
  const [showPrepareActions, setShowPrepareActions] = useState(true);

  const isYellow = activeAlert?.severity === 'yellow';

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

  // One-Tap: Turn Off Sensor & Stop Alert
  const handleTurnOffSensorAndStop = () => {
    sirenService.stopAllAlarms();
    if (activeAlert) {
      if (onTurnOffSensorAndDismiss) {
        onTurnOffSensorAndDismiss(activeAlert.id);
      } else {
        onDismiss(activeAlert.id);
      }
    }
  };

  // One-Tap: Stop Siren & Dismiss Alert
  const handleStopAlertOnly = () => {
    sirenService.stopAllAlarms();
    if (activeAlert) {
      onDismiss(activeAlert.id);
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      {/* Main Alert Card (Solid clean colors without gradients) */}
      <div
        id="critical-alert-card"
        className={`w-full max-w-lg rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all text-white border-2 sm:border-3 my-auto max-h-[95vh] overflow-y-auto ${
          isYellow
            ? 'bg-[#5C3000] border-amber-400'
            : 'bg-[#8E1014] border-red-400'
        }`}
      >
        {/* 1. Header Bar: Severity Badge & Siren Mute Control */}
        <div className="flex items-center justify-between gap-3 relative z-10 mb-3">
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
            className="p-2 rounded-2xl bg-black/40 hover:bg-black/60 active:scale-95 transition-all text-white border border-white/20 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
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
        <div className="text-center relative z-10 space-y-1.5 mb-3.5">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xl ${
              isYellow
                ? 'bg-amber-300 text-amber-950'
                : 'bg-white text-red-600'
            }`}
          >
            {isYellow ? (
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            ) : (
              <AlertOctagon className="w-8 h-8 animate-bounce" />
            )}
          </div>

          <h1
            id="critical-alert-title"
            className="text-lg sm:text-xl font-black font-sans tracking-tight uppercase leading-tight text-white"
          >
            {isYellow ? '⚠️ Flood Warning: Water Rising' : '🚨 Flood Danger! Move to Safety'}
          </h1>

          <p className="text-xs sm:text-sm font-medium text-white/90 max-w-sm mx-auto leading-snug">
            {isYellow
              ? 'River water is rising. Prepare your family and stay alert.'
              : 'Dangerous rushing water detected! Move to high ground immediately!'}
          </p>
        </div>

        {/* 3. Location Box */}
        <div className="relative z-10 rounded-2xl bg-black/40 p-3 border border-white/15 mb-3 space-y-1">
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
                className="text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 transition-colors shrink-0"
              >
                <span>View Map</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <p className="text-white text-xs font-medium leading-snug">
            {locationFullString}
          </p>

          <div className="flex items-center justify-between text-[11px] text-white/80 pt-1 border-t border-white/10">
            <span>Reported at: <strong>{activeAlert.formattedTime || 'Just now'}</strong></span>
            <span className="font-semibold text-emerald-300 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Live Bell Sensor Signal
            </span>
          </div>
        </div>

        {/* 4. Collapsible Section 1: What to do when there are floods (Open by default) */}
        <div
          id="collapsible-what-to-do-in-floods"
          className="relative z-10 rounded-2xl border mb-2.5 overflow-hidden transition-all bg-black/40 border-white/20"
        >
          <button
            type="button"
            id="btn-toggle-flood-actions"
            onClick={() => setShowFloodActions(!showFloodActions)}
            className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-white">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
              <span>What to do when there are floods:</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded-lg">
              <span>{showFloodActions ? 'Hide' : 'Show'}</span>
              {showFloodActions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showFloodActions && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-white/10 animate-in fade-in duration-150">
              <ul className="space-y-1.5 text-xs text-white/95 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-300 shrink-0">1.</span>
                  <span><strong>Move immediately to high ground</strong> or the nearest village school/church shelter.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-300 shrink-0">2.</span>
                  <span><strong>Take children, elderly people, and animals</strong> away from low river areas right away.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-300 shrink-0">3.</span>
                  <span><strong>Do NOT walk, swim, or drive through flowing water</strong> or flooded roads.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-300 shrink-0">4.</span>
                  <span><strong>Stay far away from river banks</strong>, electric poles, and falling trees.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-300 shrink-0">5.</span>
                  <span><strong>If you are trapped</strong>, climb to the highest safe place and call for rescue.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 5. Collapsible Section 2: How to prepare if floods might come (Open by default) */}
        <div
          id="collapsible-how-to-prepare"
          className="relative z-10 rounded-2xl border mb-3.5 overflow-hidden transition-all bg-black/40 border-white/20"
        >
          <button
            type="button"
            id="btn-toggle-prepare-actions"
            onClick={() => setShowPrepareActions(!showPrepareActions)}
            className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-white">
              <Package className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>How to prepare if floods might come:</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-emerald-300 bg-white/10 px-2 py-0.5 rounded-lg">
              <span>{showPrepareActions ? 'Hide' : 'Show'}</span>
              {showPrepareActions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showPrepareActions && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-white/10 animate-in fade-in duration-150">
              <ul className="space-y-1.5 text-xs text-white/95 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-300 shrink-0">&bull;</span>
                  <span><strong>Pack important papers, medicine, and torch (flashlight)</strong> in a plastic bag so they stay dry.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-300 shrink-0">&bull;</span>
                  <span><strong>Store clean drinking water and food</strong> that does not spoil quickly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-300 shrink-0">&bull;</span>
                  <span><strong>Keep your mobile phone charged</strong> and keep a battery or power bank nearby.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-300 shrink-0">&bull;</span>
                  <span><strong>Agree on a safe meeting place</strong> on high ground with your family and neighbors.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-300 shrink-0">&bull;</span>
                  <span><strong>Listen for the bell sound sensor</strong> and warnings from village leaders.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 6. Primary One-Tap Actions: Turn Off Sensor & Stop Alert */}
        <div className="relative z-10 space-y-2">
          {/* Main 1-Tap Button: Turn Off Sensor & Stop Alert */}
          <button
            type="button"
            id="btn-turn-off-sensor-and-stop"
            onClick={handleTurnOffSensorAndStop}
            className={`w-full py-3.5 rounded-2xl active:scale-98 font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-2 ${
              isYellow
                ? 'bg-amber-300 text-amber-950 hover:bg-amber-200 border-amber-200'
                : 'bg-white text-red-700 hover:bg-zinc-100 border-white'
            }`}
          >
            <Power className="w-4 h-4 text-red-600 shrink-0" />
            <span>TURN OFF SENSOR &amp; STOP ALERT</span>
          </button>

          {/* Secondary 1-Tap Button: Stop Alert / Dismiss */}
          <button
            type="button"
            id="btn-stop-alert-only"
            onClick={handleStopAlertOnly}
            className="w-full py-2.5 rounded-xl bg-black/50 hover:bg-black/70 active:scale-98 text-xs font-bold text-white/90 hover:text-white flex items-center justify-center gap-2 transition-all border border-white/20 cursor-pointer"
          >
            <BellOff className="w-4 h-4 text-white/80" />
            <span>Stop Loud Siren Only</span>
          </button>

          <p className="text-[11px] text-white/80 font-medium text-center">
            *Tap once to immediately turn off sensor detection and silence the alarm.
          </p>
        </div>

        {/* 7. Quick Share / WhatsApp / SMS button */}
        <div className="relative z-10 mt-2.5 pt-2.5 border-t border-white/15 flex items-center justify-center">
          <button
            type="button"
            id="btn-share-alert-action"
            onClick={handleShareOrCopy}
            className="w-full sm:w-auto py-2 px-4 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all border border-white/20 cursor-pointer"
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
