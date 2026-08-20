import React from 'react';
import { Activity, Bell, MapPin, LayoutDashboard } from 'lucide-react';
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
  isAdmin = false,
}) => {
  // Villagers and guests only see Village and Alerts tabs.
  // Admins get full app access (Dashboard, Sensor, Alerts, Village).
  interface NavTab {
    id: NodeMode;
    label: string;
    icon: React.ForwardRefExoticComponent<any>;
    statusDot?: string | null;
    badge?: number | null;
  }

  const adminTabs: NavTab[] = [
    {
      id: 'admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'sensor',
      label: 'Sensor',
      icon: Activity,
      statusDot: isArmed
        ? isPaused
          ? 'bg-[#B06000]'
          : 'bg-[#137333]'
        : null,
    },
    {
      id: 'receiver',
      label: 'Alerts',
      icon: Bell,
      badge: activeAlertCount > 0 ? activeAlertCount : null,
    },
    {
      id: 'village',
      label: 'Village',
      icon: MapPin,
    },
  ];

  const villagerTabs: NavTab[] = [
    {
      id: 'village',
      label: 'Village',
      icon: MapPin,
    },
    {
      id: 'receiver',
      label: 'Alerts',
      icon: Bell,
      badge: activeAlertCount > 0 ? activeAlertCount : null,
    },
  ];

  const tabs = isAdmin ? adminTabs : villagerTabs;

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      className="shrink-0 sticky bottom-0 z-40 w-full bg-[#FEF7FF]/95 backdrop-blur-md border-t border-slate-100 select-none pb-safe shadow-xs"
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
              className="flex-1 py-0.5 flex flex-col items-center justify-center relative transition-all active:scale-95 cursor-pointer group"
            >
              {/* Material 3 Elliptical Tonal Indicator */}
              <div
                className={`w-16 h-8 rounded-full flex items-center justify-center mb-1 transition-all duration-200 relative ${
                  isActive
                    ? 'bg-[#E0EFFF] text-[#1F71E8]'
                    : 'bg-transparent text-[#49454F] group-hover:bg-black/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />

                {/* Status Dot */}
                {tab.statusDot && (
                  <span
                    className={`absolute top-1.5 right-3.5 w-2 h-2 rounded-full ${tab.statusDot}`}
                  />
                )}

                {/* Badge Number */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#BA1A1A] text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] tracking-tight truncate max-w-[80px] transition-colors ${
                  isActive
                    ? 'text-[#1F71E8] font-semibold'
                    : 'text-[#49454F] font-medium'
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


