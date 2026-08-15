import React from 'react';
import { Activity, BellRing, MapPin, LayoutDashboard } from 'lucide-react';
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
              ? 'bg-[#B06000]'
              : 'bg-[#137333] dark:bg-[#81C995]'
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
          ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
          : 'bg-[#F0F4F9] border-[#E1E3E1] text-[#1F1F1F]'
      } backdrop-blur-md pb-safe shadow-md`}
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
              className="flex-1 py-1 flex flex-col items-center justify-center relative transition-all active:scale-95"
            >
              {/* Active Pill Container */}
              <div
                className={`w-14 h-8 rounded-full flex items-center justify-center mb-1 transition-all relative ${
                  isActive
                    ? isDarkMode
                      ? 'bg-[#004A77] text-[#C2E7FF]'
                      : 'bg-[#D3E3FD] text-[#041E49]'
                    : 'bg-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />

                {/* Status Dot */}
                {tab.statusDot && (
                  <span
                    className={`absolute top-1.5 right-3 w-2 h-2 rounded-full ${tab.statusDot}`}
                  />
                )}

                {/* Badge Number */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#D93025] text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-xs font-medium tracking-tight truncate max-w-[80px] ${
                  isActive
                    ? isDarkMode
                      ? 'text-[#E3E3E3] font-semibold'
                      : 'text-[#041E49] font-bold'
                    : 'text-[#5F6368] dark:text-[#9AA0A6]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

