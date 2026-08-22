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

  // Not Granted / Prompt State: High contrast, prominent M3 Card
  return (
    <div
      id="card-enable-flood-alerts"
      className={`rounded-2xl p-4 sm:p-5 border-2 border-[#1D4ED8] bg-white text-black shadow-md space-y-3.5 ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 shadow-md">
          <BellRing className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-base sm:text-lg text-black leading-tight">
              Turn On Flood Alerts &amp; Sirens
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-300 text-black border border-amber-500">
              Required
            </span>
          </div>
          <p className="text-xs sm:text-sm text-black mt-1.5 font-bold leading-snug">
            Tap the blue button below to allow sirens so your phone warns you even when the screen is locked or in your pocket.
          </p>
        </div>
      </div>

      {isDenied && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-100 border-2 border-amber-500 text-black text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-900" />
            <span className="text-black">Alerts are disabled in system settings.</span>
          </div>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="px-3 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-black shrink-0 hover:bg-black transition cursor-pointer"
          >
            Fix in Settings
          </button>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          id="btn-turn-on-alerts-now"
          onClick={handleEnableAlerts}
          disabled={isEnabling}
          className="w-full py-3.5 px-5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 active:bg-blue-900 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition min-h-[48px]"
        >
          <Bell className="w-5 h-5 shrink-0" />
          <span>{isEnabling ? 'Enabling Siren Alerts...' : 'Turn On Loud Flood Alerts'}</span>
        </button>
      </div>
    </div>
  );
};

