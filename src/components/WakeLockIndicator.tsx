import React, { useEffect, useState } from 'react';
import { Shield, Smartphone, Zap, AlertCircle, RefreshCw, BatteryCharging, Battery } from 'lucide-react';
import { WakeLockState, BatteryState } from '../types';

interface WakeLockIndicatorProps {
  wakeLockState: WakeLockState;
  onRequestWakeLock: () => void;
  isDarkMode: boolean;
}

export const WakeLockIndicator: React.FC<WakeLockIndicatorProps> = ({
  wakeLockState,
  onRequestWakeLock,
  isDarkMode,
}) => {
  const [battery, setBattery] = useState<BatteryState>({
    isSupported: false,
    charging: true,
    level: 1.0,
  });

  useEffect(() => {
    // Battery Status API (Chrome / Android)
    const nav = navigator as unknown as {
      getBattery?: () => Promise<{
        charging: boolean;
        level: number;
        addEventListener: (type: string, listener: () => void) => void;
      }>;
    };

    if (typeof nav.getBattery === 'function') {
      nav.getBattery().then((batt) => {
        const update = () => {
          setBattery({
            isSupported: true,
            charging: batt.charging,
            level: batt.level,
          });
        };
        update();
        batt.addEventListener('chargingchange', update);
        batt.addEventListener('levelchange', update);
      }).catch(() => {
        // ignore
      });
    }
  }, []);

  return (
    <div
      id="wake-lock-card"
      className={`rounded-3xl border p-5 transition-all shadow-xs ${
        isDarkMode
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Status & Details */}
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              wakeLockState.isActive
                ? 'bg-[#E6F4EA] text-[#137333]'
                : 'bg-[#FCE8E6] text-[#D93025]'
            }`}
          >
            {wakeLockState.isActive ? (
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            ) : (
              <Smartphone className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base font-sans">
                Screen Wake Lock
              </h3>
              {wakeLockState.isActive ? (
                <span
                  id="badge-wake-lock-active"
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E8E3E]" />
                  Screen Lock Active
                </span>
              ) : (
                <span
                  id="badge-wake-lock-inactive"
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  Screen Lock Inactive
                </span>
              )}
            </div>

            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 max-w-xl">
              {wakeLockState.isActive
                ? 'Device screen will remain continuously awake 24/7 while plugged into external water-sensor power.'
                : wakeLockState.error ||
                  'Screen lock is disabled or browser went to background. Click to force display awake.'}
            </p>
          </div>
        </div>

        {/* Right Actions & Power Status */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {/* Battery / Charging Info */}
          {battery.isSupported && (
            <div
              className={`px-3 py-1.5 rounded-2xl text-xs font-medium flex items-center gap-1.5 border ${
                battery.charging
                  ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                  : 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]'
              }`}
            >
              {battery.charging ? (
                <BatteryCharging className="w-4 h-4 text-[#1E8E3E]" />
              ) : (
                <Battery className="w-4 h-4" />
              )}
              <span>
                {Math.round(battery.level * 100)}% {battery.charging ? '(Plugged In)' : '(On Battery)'}
              </span>
            </div>
          )}

          {!wakeLockState.isActive && (
            <button
              id="btn-reactivate-wake-lock"
              onClick={onRequestWakeLock}
              className="px-4 py-2 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Lock Awake</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
