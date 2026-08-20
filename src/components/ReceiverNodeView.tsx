import React, { useState } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Bell,
  Trash2,
  Radio,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  MapPin,
  ExternalLink,
  Mic,
  Clock,
} from 'lucide-react';
import { FloodAlert } from '../types';
import { sirenService } from '../services/audioSiren';

interface ReceiverNodeViewProps {
  alerts: FloodAlert[];
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => void;
  onDismissAlert: (id: string) => void;
  onClearAlerts: () => void;
  isFirebaseConnected?: boolean;
  onOpenFirebaseModal?: () => void;
  isDarkMode?: boolean;
  isOnline?: boolean;
  onOpenVoiceSOS?: () => void;
  onTriggerSiren?: () => void;
}

export const ReceiverNodeView: React.FC<ReceiverNodeViewProps> = ({
  alerts,
  onDismissAlert,
  onClearAlerts,
  onOpenVoiceSOS,
}) => {
  const [isSirenActive, setIsSirenActive] = useState(false);

  const toggleEmergencySiren = () => {
    if (isSirenActive) {
      sirenService.stopAllAlarms();
      setIsSirenActive(false);
    } else {
      sirenService.startEmergencySiren();
      setIsSirenActive(true);
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* ================= 1. Emergency Siren Broadcast Card ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-red-700 shrink-0 shadow-2xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
                Village Emergency Siren
              </h3>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Dzenje CDSS ADDA STEM CLUB Warning System
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
            Live Link
          </span>
        </div>

        <p className="text-xs text-[#49454F] leading-relaxed">
          Tap below to sound the loud flood evacuation siren on all connected phones and speakers.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={toggleEmergencySiren}
            className={`flex-1 font-bold py-3 px-4 rounded-full text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer ${
              isSirenActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSirenActive ? 'Stop Emergency Siren' : 'Sound Emergency Siren'}</span>
          </button>

          {onOpenVoiceSOS && (
            <button
              type="button"
              onClick={onOpenVoiceSOS}
              className="py-3 px-4 rounded-full bg-[#1F71E8] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98 cursor-pointer shrink-0"
              title="Record Voice SOS"
            >
              <Mic className="w-4 h-4" />
              <span>Voice SOS</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= 2. Flood Detection Alerts Feed ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
              River Flood Alerts
            </span>
            <span className="text-[11px] font-bold bg-[#E7E0EC] text-[#1D192B] px-2 py-0.2 rounded-full">
              {alerts.length}
            </span>
          </div>

          {alerts.length > 0 && (
            <button
              type="button"
              onClick={onClearAlerts}
              className="text-xs font-bold text-red-600 hover:text-red-800 transition flex items-center gap-1 cursor-pointer bg-red-50 px-2.5 py-1 rounded-full border border-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear List</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert) => {
              const isRed = alert.severity === 'red';
              const isYellow = alert.severity === 'yellow';

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl p-4 border transition shadow-xs space-y-2.5 ${
                    isRed
                      ? 'bg-red-50 border-red-200'
                      : isYellow
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isRed
                            ? 'bg-red-600 text-white'
                            : isYellow
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isRed ? (
                          <AlertOctagon className="w-4 h-4 animate-bounce" />
                        ) : isYellow ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-[#1C1B1F] leading-tight">
                            {alert.headline || (isRed ? 'Flood Danger Detected!' : 'River Warning')}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                              isRed
                                ? 'bg-red-200 text-red-900'
                                : isYellow
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {isRed ? 'High Danger' : isYellow ? 'Warning' : 'Advisory'}
                          </span>
                        </div>
                        <p className="text-xs text-[#49454F] font-medium mt-1 leading-snug">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.id)}
                      className="text-slate-400 hover:text-slate-700 p-1 transition cursor-pointer shrink-0"
                      title="Dismiss Alert"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Location & Time Footer */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-[#49454F]">
                    <div className="flex items-center gap-1 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate max-w-[160px] sm:max-w-xs">
                        {alert.riverName || alert.village || 'Ruo River Station'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{alert.formattedTime || new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center space-y-2 border border-slate-100">
              <p className="text-xs font-bold text-[#1C1B1F]">No Active Flood Alerts</p>
              <p className="text-xs text-[#49454F]">
                The Ruo River and surrounding water channels are clear. River sensors will automatically broadcast alerts to Firestore when high water levels or bell tones are detected.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

