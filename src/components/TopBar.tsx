import React from 'react';
import {
  AlertTriangle,
  MapPin,
  Mic,
  ChevronDown,
  LogIn,
} from 'lucide-react';
import { NodeMode, MotionSensorState, WakeLockState, UserProfile } from '../types';

interface TopBarProps {
  currentMode: NodeMode;
  onSelectMode: (mode: NodeMode) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  isArmed: boolean;
  isPaused?: boolean;
  sensorState: MotionSensorState;
  wakeLockState: WakeLockState;
  isFirebaseConnected: boolean;
  onOpenFirebaseModal: () => void;
  currentUser: UserProfile | null;
  isAdmin?: boolean;
  onOpenAuthModal: () => void;
  onOpenVoiceSOS?: () => void;
  activeAlertCount: number;
  selectedVillage?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  currentUser,
  isAdmin = false,
  onOpenAuthModal,
  onOpenVoiceSOS,
  selectedVillage = 'Dzenje Village',
}) => {
  // Get initials for user avatar badge
  const getInitials = () => {
    if (!currentUser?.name) return 'AS';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return currentUser.name.slice(0, 2).toUpperCase();
  };

  const villageName = currentUser?.village || selectedVillage || 'Dzenje Village';

  // Voice Mic button is ONLY for villagers/users (not admins) on 'village' or 'receiver' (Alerts) screens
  const showMicButton = !isAdmin && (currentMode === 'village' || currentMode === 'receiver');

  return (
    <header
      id="app-top-bar"
      className="sticky top-0 z-20 bg-[#FEF7FF]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 select-none shadow-xs"
    >
      {/* Left: App PWA Icon + App Name & Club Branding */}
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/icon.svg"
          alt="Automatic Flood Alert Icon"
          className="w-9 h-9 rounded-xl shadow-2xs shrink-0 object-cover border border-blue-100"
        />
        <div className="min-w-0">
          {/* Top Line: Automatic Flood Alert App */}
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#1C1B1F] leading-tight whitespace-nowrap">
            <span>Automatic Flood Alert App</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" title="System Live & Active" />
          </div>
          {/* Bottom Line: Dzenje CDSS ADDA STEM CLUB */}
          <p className="text-[11px] sm:text-xs text-[#49454F] font-medium leading-tight mt-0.5 whitespace-nowrap">
            Dzenje CDSS ADDA STEM CLUB
          </p>
        </div>
      </div>

      {/* Right: Voice Mic Button + User Profile Avatar */}
      <div className="flex items-center gap-2">
        {showMicButton && (
          <button
            type="button"
            id="btn-topbar-voice-mic"
            onClick={onOpenVoiceSOS}
            className="w-9 h-9 rounded-full bg-[#F3EDF7] flex items-center justify-center text-[#49454F] hover:bg-[#E7E0EC] active:scale-95 transition cursor-pointer"
            title="Open Voice SOS"
          >
            <Mic className="w-4.5 h-4.5 text-red-500" />
          </button>
        )}

        <button
          type="button"
          id="btn-topbar-user-avatar"
          onClick={onOpenAuthModal}
          className="w-9 h-9 rounded-full bg-[#E8DEF8] text-[#1D192B] flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-blue-400 active:scale-95 transition cursor-pointer"
          title={currentUser ? `Profile: ${currentUser.name}` : 'Sign In / Profile'}
        >
          {currentUser ? getInitials() : <LogIn className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

