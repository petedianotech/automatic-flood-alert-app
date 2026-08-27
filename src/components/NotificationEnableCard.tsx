import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Volume2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import { sirenService } from '../services/audioSiren';

interface NotificationEnableCardProps {
  isDarkMode?: boolean;
  className?: string;
}

export const NotificationEnableCard: React.FC<NotificationEnableCardProps> = ({
  isDarkMode,
  className = '',
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    NotificationService.getPermission()
  );
  const [isEnabling, setIsEnabling] = useState(false);
  const [nativeEnabled, setNativeEnabled] = useState<boolean>(false);

  useEffect(() => {
    NotificationService.checkNativeNotificationStatus().then((enabled) => {
      if (enabled) {
        setNativeEnabled(true);
      }
    });

    const unsubPerm = NotificationService.subscribePermission((perm) => {
      setPermission(perm);
    });
    return () => {
      unsubPerm();
    };
  }, []);

  const handleEnableAlerts = async () => {
    sirenService.unlockAudio();
    setIsEnabling(true);

    // Request notification permission and activate push
    const res = await NotificationService.requestPermission(true);
    setPermission(res);

    const isNativeOn = await NotificationService.checkNativeNotificationStatus();
    setNativeEnabled(isNativeOn);

    // Play audible confirmation chime
    sirenService.playWarningAlertSound();

    setTimeout(() => {
      setIsEnabling(false);
    }, 1200);
  };

  const handleOpenSettings = async () => {
    await NotificationService.openNativeNotificationSettings();
  };

  const isGranted = permission === 'granted' || nativeEnabled;
  const isDenied = permission === 'denied' && !nativeEnabled;

  // Once configured, automatically hide the card completely to keep UI clean and focused
  if (isGranted) {
    return null;
  }

  // Not Granted / Prompt State: Refined, accessible Material 3 Card
  return (
    <div
      id="card-enable-flood-alerts"
      className={`rounded-[24px] p-4 sm:p-5 border border-blue-200/80 bg-blue-50/40 text-[#1C1B1F] shadow-xs space-y-3.5 ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shrink-0 shadow-xs">
          <BellRing className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
              Turn On Flood Alerts &amp; Sirens
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              Required
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#49454F] mt-1 font-normal leading-relaxed">
            Allow loud siren warnings so your mobile phone alerts you immediately even when locked or in your pocket.
          </p>
        </div>
      </div>

      {isDenied && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
            <span className="truncate">Alerts are disabled in your system settings.</span>
          </div>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shrink-0 transition active:scale-98 cursor-pointer"
          >
            Fix in Settings
          </button>
        </div>
      )}

      <div className="pt-0.5">
        <button
          type="button"
          id="btn-turn-on-alerts-now"
          onClick={handleEnableAlerts}
          disabled={isEnabling}
          className="w-full py-3 px-5 rounded-full bg-[#1F71E8] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer transition min-h-[44px]"
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span>{isEnabling ? 'Enabling Loud Alerts...' : 'Turn On Loud Flood Alerts'}</span>
        </button>
      </div>
    </div>
  );
};

