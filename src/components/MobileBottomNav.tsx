import React from 'react';
import { Activity, BellRing, MapPin, Sliders, Lock } from 'lucide-react';
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
  const tabs = [
    {
      id: 'sensor' as NodeMode,
      label: isAdmin ? 'Sensor' : 'Sensor (Owner)',
      icon: Activity,
      statusDot: isAdmin
        ? isArmed
          ? isPaused
            ? 'bg-amber-500'
            : 'bg-emerald-500 animate-pulse'
          : null
        : null,
      isLocked: !isAdmin,
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
  ];

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      className={`sticky bottom-0 z-40 w-full border-t transition-colors select-none ${
        isDarkMode
          ? 'bg-[#1E1F20]/95 border-[#303134] text-[#E3E3E3]'
          : 'bg-white/95 border-[#E1E3E1] text-[#1F1F1F]'
      } backdrop-blur-md pb-safe`}
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentMode === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-nav-${tab.id}`}
              onClick={() => onSelectMode(tab.id)}
              className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                isActive
                  ? 'text-[#1A73E8] dark:text-[#8AB4F8] font-bold'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]'
              }`}
            >
              {/* Active Indicator Pill */}
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center mb-0.5 transition-colors relative ${
                  isActive
                    ? 'bg-[#E8F0FE] dark:bg-[#1A73E8]/20'
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

                {/* Lock icon for non-admin */}
                {tab.isLocked && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}

                {/* Badge Number */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#D93025] text-white font-mono text-[10px] font-black flex items-center justify-center animate-bounce shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] sm:text-[11px] font-medium tracking-tight truncate max-w-[70px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
