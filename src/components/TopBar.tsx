import React from 'react';
import { UserProfile } from '../types';

interface TopBarProps {
  currentUser: UserProfile | null;
  isAdmin?: boolean;
  onOpenAuthModal: () => void;
  onOpenVoiceSOS?: () => void;
  selectedVillage?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onOpenAuthModal,
}) => {
  // Get initials for user avatar badge
  const getInitials = () => {
    if (!currentUser?.name) return 'U';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return currentUser.name.slice(0, 2).toUpperCase();
  };

  return (
    <header
      id="app-top-bar"
      className="sticky top-0 z-30 bg-[#FEF7FF]/95 backdrop-blur-md px-3.5 py-3 flex items-center justify-between border-b border-slate-200/80 select-none shadow-xs"
    >
      {/* Left: App PWA Icon + App Name & Club Branding */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <img
          src="/icon.svg"
          alt="Automatic Flood Alert Icon"
          className="w-10 h-10 rounded-2xl shadow-xs shrink-0 object-cover border border-blue-200/70"
        />
        <div className="min-w-0 flex-1">
          {/* Top Line: App Name */}
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-[#1C1B1F] leading-snug">
            <span className="truncate">Automatic Flood Alert App</span>
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-2xs"
              title="System Live & Active"
            />
          </div>
          {/* Bottom Line: Dzenje CDSS ADDA STEM CLUB */}
          <p className="text-[11px] sm:text-xs text-[#49454F] font-semibold leading-tight mt-0.5 truncate">
            Dzenje CDSS ADDA STEM CLUB
          </p>
        </div>
      </div>

      {/* Right: Profile / Google Sign In Button */}
      <div className="flex items-center gap-2 shrink-0 pl-1">
        {/* Profile / Sign In */}
        <button
          type="button"
          id="btn-topbar-user-profile"
          onClick={onOpenAuthModal}
          className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer border ${
            currentUser
              ? 'bg-[#E8DEF8] text-[#1D192B] border-purple-200 hover:bg-[#DBCDEE]'
              : 'bg-white text-[#1F71E8] border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
          title={currentUser ? `Signed in as ${currentUser.name}` : 'Sign In'}
        >
          {currentUser ? (
            <>
              <div className="w-5 h-5 rounded-full bg-[#6750A4] text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                {getInitials()}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate text-xs font-bold">
                {currentUser.name.split(' ')[0]}
              </span>
            </>
          ) : (
            <>
              {/* Google G Multi-color Icon */}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign In</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

