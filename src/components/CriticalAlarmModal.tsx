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
  CheckCircle2,
  Mic,
  Home,
  Phone,
} from 'lucide-react';
import { FloodAlert } from '../types';
import { sirenService } from '../services/audioSiren';

interface CriticalAlarmModalProps {
  activeAlert: FloodAlert | null;
  onDismiss: (alertId: string) => void;
  onTurnOffSensorAndDismiss?: (alertId: string) => void;
  isSoundEnabled: boolean;
  onOpenCheckIn?: () => void;
  onOpenVoiceSOS?: () => void;
}

export const CriticalAlarmModal: React.FC<CriticalAlarmModalProps> = ({
  activeAlert,
  onDismiss,
  onTurnOffSensorAndDismiss,
  isSoundEnabled,
  onOpenCheckIn,
  onOpenVoiceSOS,
}) => {
  const [isMuted, setIsMuted] = useState(!isSoundEnabled);
  const [copied, setCopied] = useState(false);
  const [showFloodActions, setShowFloodActions] = useState(true);
  const [showPrepareActions, setShowPrepareActions] = useState(false);

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
    ? `⚠️ FLOOD WARNING (WATER RISING)\n📍 River & Area: ${locationFullString}\n⏰ Time: ${activeAlert?.formattedTime || 'Just now'}\n\n👉 What to do: River water is rising. Pack essential items, keep phones charged, and be ready to move to high ground!`
    : `🚨 URGENT FLOOD ALARM (DANGER!)\n📍 River & Area: ${locationFullString}\n⏰ Time: ${activeAlert?.formattedTime || 'Just now'}\n\n🚨 ACTION NEEDED: Flood water detected! Move your family and animals to safe high ground IMMEDIATELY!`;

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
      {/* Main Alert Card (Material 3 solid design, zero gradients) */}
      <div
        id="critical-alert-card"
        className={`w-full max-w-lg rounded-[28px] p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all text-white border-2 my-auto max-h-[95vh] overflow-y-auto ${
          isYellow
            ? 'bg-[#5C3000] border-[#FFDF9E]'
            : 'bg-[#8E1014] border-[#FFB4AB]'
        }`}
      >
        {/* 1. Header Bar: App Name & Club Branding on Top/Bottom + Severity Badge & Siren Mute */}
        <div className="flex items-start justify-between gap-3 relative z-10 mb-4 pb-3 border-b border-white/15">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon.svg"
              alt="App Icon"
              className="w-10 h-10 rounded-2xl object-cover shrink-0 shadow-xs"
            />
            <div className="min-w-0">
              <h2 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">
                Automatic Flood Alert App
              </h2>
              <p className="text-[11px] text-white/80 font-medium leading-tight mt-0.5 truncate">
                Dzenje CDSS ADDA STEM CLUB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-mute-siren-alarm"
              onClick={() => setIsMuted(!isMuted)}
              className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition text-white border border-white/20 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={isMuted ? 'Turn Sound On' : 'Silence Siren'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-amber-200" />
                  <span className="hidden xs:inline">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-white animate-bounce" />
                  <span className="hidden xs:inline">Siren On</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Main Alert Headline & Icon */}
        <div className="text-center relative z-10 space-y-2 mb-4">
          <div className="inline-block">
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs ${
                isYellow
                  ? 'bg-[#FFDF9E] text-[#261600]'
                  : 'bg-white text-[#BA1A1A]'
              }`}
            >
              {isYellow ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flood Warning: Water Rising</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5 animate-pulse" />
                  <span>Flood Danger! Water Detected</span>
                </>
              )}
            </span>
          </div>

          <h1
            id="critical-alert-title"
            className="text-lg sm:text-xl font-bold font-sans tracking-tight uppercase leading-tight text-white"
          >
            {isYellow ? 'River Water Level Rising' : 'Move to Safe High Ground Now!'}
          </h1>

          <p className="text-xs sm:text-sm font-medium text-white/95 max-w-sm mx-auto leading-snug">
            {isYellow
              ? 'River sensor detected rising water. Get your family and emergency items ready.'
              : 'Rapid flood water detected in the river! Move your family and animals away from low areas immediately.'}
          </p>
        </div>

        {/* 3. River Location Box (Material 3 Solid Container) */}
        <div className="relative z-10 rounded-[20px] bg-black/40 p-3.5 border border-white/20 mb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFDF9E]">
              <MapPin className="w-4 h-4 text-[#FFB4AB] shrink-0" />
              <span>{activeAlert.riverName || 'Ruo River'} Sensor Station</span>
            </div>

            {(activeAlert.mapsUrl || (activeAlert.latitude && activeAlert.longitude)) && (
              <a
                href={
                  activeAlert.mapsUrl ||
                  `https://www.google.com/maps?q=${activeAlert.latitude || -16.0315},${activeAlert.longitude || 35.5000}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full inline-flex items-center gap-1 transition-colors shrink-0"
              >
                <span>View Map</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <p className="text-white text-xs font-medium leading-snug">
            {locationFullString}
          </p>

          <div className="flex items-center justify-between text-[11px] text-white/80 pt-1.5 border-t border-white/10">
            <span>Reported at: <strong>{activeAlert.formattedTime || 'Just now'}</strong></span>
            <span className="font-semibold text-[#81C995] flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Live Bell Sensor Signal
            </span>
          </div>
        </div>

        {/* 4. Quick 4-Step Action Guide (Simple English for Local Villagers) */}
        <div
          id="collapsible-what-to-do-in-floods"
          className="relative z-10 rounded-[20px] border mb-2.5 overflow-hidden transition-all bg-black/40 border-white/20"
        >
          <button
            type="button"
            id="btn-toggle-flood-actions"
            onClick={() => setShowFloodActions(!showFloodActions)}
            className="w-full p-3.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-white">
              <ShieldAlert className="w-4 h-4 text-[#FFDF9E] shrink-0" />
              <span>What to do right now (Safety Steps):</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-[#FFDF9E] bg-white/10 px-2.5 py-0.5 rounded-full">
              <span>{showFloodActions ? 'Hide' : 'Show'}</span>
              {showFloodActions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showFloodActions && (
            <div className="px-4 pb-4 pt-1 border-t border-white/10 animate-in fade-in duration-150">
              <ul className="space-y-2 text-xs text-white/95 leading-relaxed font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#FFDF9E] text-[#261600] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span><strong>Go to High Ground Immediately:</strong> Move to your safe village school or church hall right away.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#FFDF9E] text-[#261600] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span><strong>Never Cross Moving River Water:</strong> Fast river water can sweep people and cattle away.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#FFDF9E] text-[#261600] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span><strong>Help Elderly, Sick &amp; Children:</strong> Assist neighbors who need help walking to safety.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white text-[#8E1014] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span><strong>If Trapped:</strong> Climb to the highest place and tap Voice SOS to send your location to the rescue team.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 5. Collapsible: Preparation Steps */}
        <div
          id="collapsible-how-to-prepare"
          className="relative z-10 rounded-[20px] border mb-3.5 overflow-hidden transition-all bg-black/40 border-white/20"
        >
          <button
            type="button"
            id="btn-toggle-prepare-actions"
            onClick={() => setShowPrepareActions(!showPrepareActions)}
            className="w-full p-3.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-white">
              <Package className="w-4 h-4 text-[#81C995] shrink-0" />
              <span>How to prepare before floods:</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-[#81C995] bg-white/10 px-2.5 py-0.5 rounded-full">
              <span>{showPrepareActions ? 'Hide' : 'Show'}</span>
              {showPrepareActions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showPrepareActions && (
            <div className="px-4 pb-4 pt-1 border-t border-white/10 animate-in fade-in duration-150">
              <ul className="space-y-1.5 text-xs text-white/95 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#81C995] shrink-0">&bull;</span>
                  <span><strong>Pack important papers, torch &amp; medicine</strong> in a dry plastic bag.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#81C995] shrink-0">&bull;</span>
                  <span><strong>Store clean drinking water</strong> in closed buckets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#81C995] shrink-0">&bull;</span>
                  <span><strong>Keep phones charged</strong> to receive community safety alerts.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 6. Action Buttons Section (Material 3 Full Touch Targets) */}
        <div className="relative z-10 space-y-2.5">
          {/* Quick Mark Safe & Voice SOS Actions */}
          <div className="grid grid-cols-2 gap-2">
            {onOpenCheckIn && (
              <button
                type="button"
                onClick={() => {
                  handleStopAlertOnly();
                  onOpenCheckIn();
                }}
                className="py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark I Am Safe</span>
              </button>
            )}

            {onOpenVoiceSOS && (
              <button
                type="button"
                onClick={() => {
                  handleStopAlertOnly();
                  onOpenVoiceSOS();
                }}
                className="py-2.5 px-3 rounded-full bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition border border-white/20"
              >
                <Mic className="w-4 h-4" />
                <span>Record Voice SOS</span>
              </button>
            )}
          </div>

          {/* Main 1-Tap Button: Turn Off Sensor & Stop Alert */}
          <button
            type="button"
            id="btn-turn-off-sensor-and-stop"
            onClick={handleTurnOffSensorAndStop}
            className={`w-full py-3.5 px-6 rounded-full active:scale-98 font-bold text-xs sm:text-sm tracking-wide uppercase shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              isYellow
                ? 'bg-[#FFDF9E] text-[#261600] hover:bg-[#FFE7BA] border-[#FFDF9E]'
                : 'bg-white text-[#BA1A1A] hover:bg-zinc-100 border-white'
            }`}
          >
            <Power className="w-4 h-4 text-[#BA1A1A] shrink-0" />
            <span>Turn Off Sensor &amp; Stop Alarm</span>
          </button>

          {/* Secondary 1-Tap Button: Stop Siren Sound Only */}
          <button
            type="button"
            id="btn-stop-alert-only"
            onClick={handleStopAlertOnly}
            className="w-full py-2.5 px-5 rounded-full bg-black/40 hover:bg-black/60 active:scale-98 text-xs font-medium text-white/90 hover:text-white flex items-center justify-center gap-2 transition-all border border-white/20 cursor-pointer"
          >
            <BellOff className="w-4 h-4 text-white/80" />
            <span>Stop Loud Siren Only</span>
          </button>
        </div>

        {/* 7. Quick Share / WhatsApp / SMS button */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-white/15 flex items-center justify-center">
          <button
            type="button"
            id="btn-share-alert-action"
            onClick={handleShareOrCopy}
            className="w-full py-2.5 px-5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-medium text-white flex items-center justify-center gap-2 transition-all border border-white/20 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#81C995]" />
                <span className="text-[#81C995]">Alert Message Copied!</span>
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

