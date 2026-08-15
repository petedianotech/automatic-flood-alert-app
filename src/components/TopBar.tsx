import React from 'react';
import {
  Activity,
  MapPin,
  User,
  Radio,
  Mic,
  Sun,
  Moon,
} from 'lucide-react';
import { NodeMode, MotionSensorState, WakeLockState, UserProfile, isAppAdmin } from '../types';

interface TopBarProps {
  currentMode: NodeMode;
  onSelectMode: (mode: NodeMode) => void;
  isDarkMode: boolean;
  onToggleTheme?: () => void;
  isArmed: boolean;
  isPaused?: boolean;
  sensorState: MotionSensorState;
  wakeLockState: WakeLockState;
  isFirebaseConnected: boolean;
  onOpenFirebaseModal: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onOpenVoiceSOS?: () => void;
  activeAlertCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  onSelectMode,
  isDarkMode,
  onToggleTheme,
  isArmed,
  isPaused = false,
  sensorState,
  wakeLockState,
  isFirebaseConnected,
  onOpenFirebaseModal,
  currentUser,
  onOpenAuthModal,
  onOpenVoiceSOS,
  activeAlertCount,
}) => {
  const isAdmin = isAppAdmin(currentUser);

  return (
    <header
      id="app-top-bar"
      className={`shrink-0 sticky top-0 z-40 transition-colors border-b select-none ${
        isDarkMode
          ? 'bg-[#1E1F20]/95 border-[#303134] text-[#E3E3E3]'
          : 'bg-white/95 border-[#E1E3E1] text-[#1F1F1F]'
      } backdrop-blur-md shadow-xs`}
    >
      <div className="max-w-md md:max-w-4xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Village Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon.svg"
              alt="Flood Alert App Icon"
              className="w-9 h-9 rounded-xl shrink-0 shadow-2xs object-cover"
              referrerPolicy="no-referrer"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-xs sm:text-sm tracking-tight font-sans text-[#1F1F1F] dark:text-white leading-snug">
                  Flood Alert App Dzenje CDSS
                </h1>
                {/* Cloud Connection Dot */}
                <span
                  id="firebase-cloud-dot"
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isFirebaseConnected ? 'bg-[#137333] dark:bg-[#81C995]' : 'bg-[#B06000]'
                  }`}
                  title={isFirebaseConnected ? 'Connected to Cloud' : 'Offline Mode'}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] leading-none mt-0.5">
                <span className="text-[#1A73E8] dark:text-[#8AB4F8]">ADDA STEM club</span>
                <span className="text-[#9AA0A6] dark:text-[#5F6368]">•</span>
                <button
                  id="btn-header-village-pill"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-0.5 hover:text-[#1A73E8] dark:hover:text-[#8AB4F8] transition-colors truncate"
                  title="Click to switch your village or sign in"
                >
                  <MapPin className="w-2.5 h-2.5 text-[#D93025] shrink-0" />
                  <span className="truncate">{currentUser?.village || 'Dzenje Village'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="btn-toggle-theme"
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-[#F1F3F4] dark:bg-[#28292C] text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#1A73E8] dark:hover:text-[#8AB4F8] active:scale-95"
                title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[#1F1F1F]" />
                )}
              </button>
            )}

            {/* Fast Voice SOS Button */}
            {onOpenVoiceSOS && (
              <button
                id="btn-header-voice-sos"
                onClick={onOpenVoiceSOS}
                className="px-3 py-1.5 rounded-full bg-[#D93025] hover:bg-[#B3261E] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                title="Voice SOS"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Voice SOS</span>
              </button>
            )}

            {/* User Profile Pill */}
            <button
              id="btn-user-profile-header"
              onClick={onOpenAuthModal}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                currentUser
                  ? isAppAdmin(currentUser)
                    ? 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40'
                    : 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] dark:border-[#1A73E8]/30'
                  : 'bg-[#F1F3F4] dark:bg-[#28292C] text-[#1F1F1F] dark:text-[#E3E3E3] border-transparent hover:border-black/10'
              }`}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : currentUser ? (
                <div className="w-5 h-5 rounded-full bg-[#1A73E8] text-white text-[10px] flex items-center justify-center font-bold">
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
