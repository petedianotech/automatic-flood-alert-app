import React from 'react';
import {
  Activity,
  BellRing,
  Moon,
  Sun,
  Database,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Zap,
  MapPin,
  User,
  Sparkles,
  Radio,
} from 'lucide-react';
import { NodeMode, MotionSensorState, WakeLockState, UserProfile, isAppAdmin } from '../types';

interface TopBarProps {
  currentMode: NodeMode;
  onSelectMode: (mode: NodeMode) => void;
  isDarkMode: boolean;
  isArmed: boolean;
  isPaused?: boolean;
  sensorState: MotionSensorState;
  wakeLockState: WakeLockState;
  isFirebaseConnected: boolean;
  onOpenFirebaseModal: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  activeAlertCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  onSelectMode,
  isDarkMode,
  isArmed,
  isPaused = false,
  sensorState,
  wakeLockState,
  isFirebaseConnected,
  onOpenFirebaseModal,
  currentUser,
  onOpenAuthModal,
  activeAlertCount,
}) => {
  const isAdmin = isAppAdmin(currentUser);
  const isOnlineAndAwake = isArmed && !isPaused && wakeLockState.isActive;

  return (
    <header
      id="app-top-bar"
      className={`shrink-0 sticky top-0 z-40 transition-colors border-b select-none ${
        isDarkMode
          ? 'bg-[#121316]/95 border-[#27272A] text-[#EDEDED]'
          : 'bg-white/95 border-[#E1E3E1] text-[#1F1F1F]'
      } backdrop-blur-md shadow-xs`}
    >
      <div className="max-w-md md:max-w-4xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Village Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform shrink-0 shadow-xs ${
                isAdmin && isArmed
                  ? 'bg-[#0284C7] text-white shadow-[#0284C7]/30'
                  : !isAdmin
                  ? 'bg-[#0284C7] text-white'
                  : isDarkMode
                  ? 'bg-[#27272A] text-[#A1A1AA]'
                  : 'bg-[#F1F3F4] text-[#5F6368]'
              }`}
            >
              {isAdmin ? (
                <Activity className={`w-5 h-5 ${isArmed ? 'animate-pulse' : ''}`} />
              ) : (
                <Radio className="w-5 h-5 animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base tracking-tight font-sans truncate">
                  Flood Alert
                </h1>
                {/* Firebase Connection Pill */}
                <span
                  id="firebase-cloud-dot"
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                  title={isFirebaseConnected ? 'Firebase Cloud Connected' : 'Local Fallback Sync'}
                />
              </div>

              {/* Village Pill Button */}
              <button
                id="btn-header-village-pill"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#38BDF8] dark:hover:text-[#38BDF8] transition-colors truncate"
              >
                <MapPin className="w-3 h-3 text-[#EF4444] shrink-0" />
                <span className="truncate">{currentUser?.village || 'Dzenje Village'}</span>
              </button>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* User Profile Pill / Sign In Trigger */}
            <button
              id="btn-user-profile-header"
              onClick={onOpenAuthModal}
              className={`px-2.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                currentUser
                  ? isAppAdmin(currentUser)
                    ? 'bg-[#FEF7E0] text-amber-900 border-[#FEEFC3] dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40 shadow-xs'
                    : 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] dark:border-[#1A73E8]/30'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#1F1F1F] dark:text-[#E3E3E3] border-transparent hover:border-black/10'
              }`}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className={`w-5 h-5 rounded-full object-cover ${
                    isAppAdmin(currentUser) ? 'ring-2 ring-amber-500' : ''
                  }`}
                />
              ) : currentUser ? (
                <div
                  className={`w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold ${
                    isAppAdmin(currentUser) ? 'bg-[#1A73E8]' : 'bg-[#1A73E8]'
                  }`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <User className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6]" />
              )}
              <span className="hidden sm:inline max-w-[90px] truncate">
                {currentUser
                  ? isAppAdmin(currentUser)
                    ? 'Admin'
                    : currentUser.name.split(' ')[0]
                  : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
