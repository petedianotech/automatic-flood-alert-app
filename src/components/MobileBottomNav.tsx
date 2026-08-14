import React from 'react';
import { Activity, BellRing, MapPin, Sliders, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { NodeMode } from '../types';

interface MobileBottomNavProps {
  currentMode: NodeMode;
  onSelectMode: (mode: NodeMode) => void;
  activeAlertCount: number;
  isArmed: boolean;
  isPaused: boolean;
  isDarkMode: boolean;
  isAdmin?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentMode,
  onSelectMode,
  activeAlertCount,
  isArmed,
  isPaused,
  isDarkMode,
  isAdmin = false,
}) => {
  // If admin, show all 5 tabs (Dashboard, Sensor, Alerts, Village, Tools). If villager, only show Alerts & Village.
  const tabs = isAdmin
    ? [
        {
          id: 'admin' as NodeMode,
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'sensor' as NodeMode,
          label: 'Sensor',
          icon: Activity,
          statusDot: isArmed
            ? isPaused
              ? 'bg-amber-500'
              : 'bg-emerald-500 animate-pulse'
            : null,
        },
        {
          id: 'receiver' as NodeMode,
          label: 'Alerts',
          icon: BellRing,
          badge: activeAlertCount > 0 ? activeAlertCount : null,
        },
        {
          id: 'village' as NodeMode,
          label: 'Village',
          icon: MapPin,
        },
        {
          id: 'diagnostics' as NodeMode,
          label: 'Tools',
          icon: Sliders,
        },
      ]
    : [
        {
          id: 'receiver' as NodeMode,
          label: 'Alerts',
          icon: BellRing,
          badge: activeAlertCount > 0 ? activeAlertCount : null,
        },
        {
          id: 'village' as NodeMode,
          label: 'Village',
          icon: MapPin,
        },
      ];

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      className={`shrink-0 z-40 w-full border-t transition-colors select-none ${
        isDarkMode
          ? 'bg-[#121316] border-[#27272A] text-[#EDEDED]'
          : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
      } backdrop-blur-md pb-safe shadow-lg`}
    >
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentMode === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-nav-${tab.id}`}
              onClick={() => onSelectMode(tab.id)}
              className={`flex-1 py-1 px-2 rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                isActive
                  ? 'text-[#38BDF8] dark:text-[#38BDF8] font-bold'
                  : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#1F1F1F] dark:hover:text-[#EDEDED]'
              }`}
            >
              {/* Active Indicator Pill */}
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center mb-0.5 transition-colors relative ${
                  isActive
                    ? 'bg-[#0284C7]/20 text-[#38BDF8]'
                    : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />

                {/* Status Dot */}
                {tab.statusDot && (
                  <span
                    className={`absolute top-1 right-2.5 w-2 h-2 rounded-full ${tab.statusDot}`}
                  />
                )}

                {/* Badge Number */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#EF4444] text-white font-mono text-[10px] font-black flex items-center justify-center animate-bounce shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] font-semibold tracking-tight truncate max-w-[80px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
