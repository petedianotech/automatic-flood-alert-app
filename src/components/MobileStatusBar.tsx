import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, BatteryCharging, Battery, BatteryMedium, BatteryLow, Download } from 'lucide-react';
import { BatteryState } from '../types';
import { NotificationService } from '../services/notificationService';

interface MobileStatusBarProps {
  batteryState: BatteryState;
  isDarkMode: boolean;
  isOnline?: boolean;
}

export const MobileStatusBar: React.FC<MobileStatusBarProps> = ({
  batteryState,
  isDarkMode,
  isOnline = true,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const getBatteryIcon = () => {
    if (batteryState.charging) {
      return <BatteryCharging className="w-3.5 h-3.5 text-emerald-500 fill-current animate-pulse" />;
    }
    if (batteryState.level <= 0.2) {
      return <BatteryLow className="w-3.5 h-3.5 text-red-500" />;
    }
    if (batteryState.level <= 0.5) {
      return <BatteryMedium className="w-3.5 h-3.5 text-amber-500" />;
    }
    return <Battery className="w-3.5 h-3.5" />;
  };

  return (
    <div
      id="mobile-system-status-bar"
      className={`w-full px-4 sm:px-5 py-2 flex items-center justify-between text-[11px] font-semibold select-none border-b transition-colors ${
        isDarkMode
          ? 'bg-[#18191A] text-[#9AA0A6] border-white/5'
          : 'bg-[#F8F9FA] text-[#5F6368] border-black/5'
      }`}
    >
      {/* Left: Clock */}
      <div className="flex items-center gap-1.5 font-mono font-bold tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
        <span>{timeStr || '9:41 AM'}</span>
      </div>

      {/* Center: Mobile Notch / Island Status */}
      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[9px] uppercase tracking-widest font-bold">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        <span className={isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
          {isOnline ? 'Flood Guard Active' : 'Offline Guard (SW Ready)'}
        </span>
      </div>

      {/* Right: Cellular, WiFi / Offline, Battery */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <Signal className={`w-3 h-3 ${isOnline ? 'text-[#1A73E8]' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-bold">{isOnline ? '5G' : 'OFF'}</span>
        </div>
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
        )}
        <div className="flex items-center gap-1">
          {getBatteryIcon()}
          <span className="text-[10px] font-mono font-bold">
            {batteryState.isSupported ? `${Math.round(batteryState.level * 100)}%` : '100%'}
          </span>
        </div>
      </div>
    </div>
  );
};
