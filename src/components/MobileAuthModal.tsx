import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  LogIn,
  LogOut,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Radio,
  Check,
  Sparkles,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, isAppAdmin } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface MobileAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode?: boolean;
  onSignedIn?: (isAdmin: boolean) => void;
}

const EXAMPLE_NAMES = ['Peter Damiano', 'Hastings M Skinner'];

const POPULAR_VILLAGES = [
  'Dzenje Village',
  'Machokola',
  'Mathambi',
];

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignedIn,
}) => {
  const [authMethod, setAuthMethod] = useState<'village' | 'google'>('village');
  const [name, setName] = useState(currentUser?.name || '');
  const [village, setVillage] = useState(currentUser?.village || 'Dzenje Village');
  const [exampleNameIndex, setExampleNameIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setName(currentUser.name);
      if (currentUser.village) setVillage(currentUser.village);
    }
  }, [currentUser]);

  // Cycle example names every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setExampleNameIndex((prev) => (prev + 1) % EXAMPLE_NAMES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = isAppAdmin(currentUser);

  if (!isOpen) return null;

  const handleContinueAsGuest = () => {
    try {
      localStorage.setItem('flood_welcome_chosen', 'guest');
    } catch {
      // ignore
    }
    onSignedIn?.(false);
    onClose();
  };

  const handleVillageSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!village.trim()) {
      setError('Please enter or choose your village');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      try {
        localStorage.setItem('flood_welcome_chosen', 'signed_in');
      } catch {
        // ignore
      }
      const profile = await firebaseFloodService.signInWithNameAndVillage(name.trim(), village.trim());
      const isUserAdmin = isAppAdmin(profile);
      if (isUserAdmin) {
        setSuccessMsg(`Welcome Admin (${profile.name})! Opening Dashboard...`);
      } else {
        setSuccessMsg(`Welcome, ${profile.name}! Opening Village & Alerts...`);
      }
      setTimeout(() => {
        onClose();
        onSignedIn?.(isUserAdmin);
        setSuccessMsg(null);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      try {
        localStorage.setItem('flood_welcome_chosen', 'signed_in');
      } catch {
        // ignore
      }
      const targetVillage = village.trim() || 'Dzenje Village';
      const profile = await firebaseFloodService.signInWithGoogle(targetVillage);
      const isUserAdmin = isAppAdmin(profile);
      if (isUserAdmin) {
        setSuccessMsg(`Welcome Admin (${profile.name})! Opening Dashboard...`);
      } else {
        setSuccessMsg(`Welcome, ${profile.name}! Opening Village & Alerts...`);
      }
      setTimeout(() => {
        onClose();
        onSignedIn?.(isUserAdmin);
        setSuccessMsg(null);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await firebaseFloodService.signOutUser();
      setName('');
      setVillage('Dzenje Village');
      setSuccessMsg('Signed out. Returning to Village view...');
      setTimeout(() => {
        onClose();
        onSignedIn?.(false);
        setSuccessMsg(null);
      }, 600);
    } catch (err) {
      setError('Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVillageOnly = async (newVillage: string) => {
    setVillage(newVillage);
    if (currentUser) {
      try {
        await firebaseFloodService.updateProfileData({ village: newVillage });
        setSuccessMsg(`Village updated to ${newVillage}`);
        setTimeout(() => setSuccessMsg(null), 1800);
      } catch (err) {
        // ignore
      }
    }
  };

  const getInitials = (userName?: string) => {
    if (!userName) return 'AS';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  return (
    <div
      id="mobile-auth-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
    >
      <div
        id="mobile-auth-sheet"
        className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-200 bg-[#FEF7FF] text-[#1C1B1F] shadow-2xl transition-all max-h-[92vh] overflow-y-auto flex flex-col"
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="App Icon"
              className="w-9 h-9 rounded-xl object-cover shadow-2xs shrink-0"
            />
            <div>
              <h3 className="font-bold text-sm leading-tight text-[#1C1B1F]">
                {currentUser ? 'Your Village Profile' : 'Flood Alert App'}
              </h3>
              <p className="text-xs font-medium text-[#49454F] mt-0.5">
                {currentUser
                  ? 'Connected to Safety Network \u2022 Dzenje STEM club'
                  : 'Dzenje ADDA STEM club'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-auth-modal"
            type="button"
            onClick={handleContinueAsGuest}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F3EDF7] hover:bg-[#E7E0EC] text-[#49454F] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content Area */}
        {currentUser ? (
          /* =========================================================================
             VIEW 1: PROFILE MODAL
             ========================================================================= */
          <div className="p-5 space-y-4">
            {/* User Profile Card */}
            <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 flex items-center gap-3.5 shadow-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#E8DEF8] text-[#1D192B] font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                  {getInitials(currentUser.name)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-base text-[#1C1B1F] truncate">
                    {currentUser.name}
                  </h4>
                  {isAdmin ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Village Admin
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Resident
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#49454F] mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="truncate font-semibold text-[#1F71E8]">{currentUser.village}</span>
                </div>
              </div>
            </div>

            {/* Quick Village Switcher */}
            <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 space-y-2.5">
              <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                Choose Your Village
              </span>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_VILLAGES.map((v) => {
                  const isSelected = currentUser.village === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleUpdateVillageOnly(v)}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#1F71E8] text-white shadow-xs'
                          : 'bg-white text-[#1C1B1F] border border-slate-200 hover:border-[#1F71E8]'
                      }`}
                    >
                      <span className="truncate">{v}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Sign Out & Done Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                id="btn-sign-out"
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 py-3 rounded-full font-bold text-sm bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full font-bold text-sm bg-[#1F71E8] hover:bg-blue-700 text-white shadow-xs transition active:scale-98 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             VIEW 2: VILLAGE SIGN IN SHEET MODAL
             ========================================================================= */
          <div className="p-5 space-y-4">
            {/* Top Explanation Banner */}
            <div className="bg-[#F3F3FA] rounded-[24px] p-3.5 border border-slate-100 space-y-1.5">
              <p className="text-xs font-bold text-[#1C1B1F]">
                Dzenje Flood Warning Network
              </p>
              <p className="text-xs text-[#49454F] leading-relaxed">
                Sign in to send voice SOS alerts and check in. Admins with STEM Club credentials get full access to sensor controls and dashboard.
              </p>
            </div>

            {/* Segmented Mode Button (Name & Village vs Google) */}
            <div className="bg-[#E7E0EC] p-1 rounded-full flex gap-1">
              <button
                type="button"
                id="tab-auth-village"
                onClick={() => {
                  setAuthMethod('village');
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  authMethod === 'village'
                    ? 'bg-[#1F71E8] text-white shadow-xs'
                    : 'text-[#49454F]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Name &amp; Village</span>
              </button>

              <button
                type="button"
                id="tab-auth-google"
                onClick={() => {
                  setAuthMethod('google');
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  authMethod === 'google'
                    ? 'bg-[#1F71E8] text-white shadow-xs'
                    : 'text-[#49454F]'
                }`}
              >
                <span>Google Sign-In</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-red-100 text-red-700 text-sm font-medium flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {authMethod === 'village' ? (
              <form onSubmit={handleVillageSignIn} className="space-y-3.5">
                {/* Full Name Field */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#1C1B1F]">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#49454F]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`e.g. ${EXAMPLE_NAMES[exampleNameIndex]}`}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1C1B1F] outline-none focus:border-[#1F71E8]"
                    />
                  </div>
                </div>

                {/* Village Field & Presets */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1B1F]">
                    Your Village Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-red-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      id="input-auth-village"
                      type="text"
                      required
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Dzenje Village"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1C1B1F] outline-none focus:border-[#1F71E8]"
                    />
                  </div>

                  {/* Preset Pills */}
                  <div className="space-y-1 pt-1">
                    <span className="text-xs font-semibold text-[#49454F]">
                      Popular Villages:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_VILLAGES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setVillage(p)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition active:scale-95 cursor-pointer ${
                            village === p
                              ? 'bg-[#1F71E8] text-white border-[#1F71E8]'
                              : 'bg-white text-[#49454F] border-slate-200 hover:border-[#1F71E8]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-submit-village-auth"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full font-bold text-sm bg-[#1F71E8] hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Village Network</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Google Sign In Option */
              <div className="space-y-3.5 py-1">
                <p className="text-xs text-[#49454F] leading-relaxed font-medium">
                  Sign in with Google to sync river warnings and loud siren alerts across your devices.
                </p>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#1C1B1F]">
                    Your Village Community
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-red-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Dzenje Village"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1C1B1F] outline-none focus:border-[#1F71E8]"
                    />
                  </div>
                </div>

                <button
                  id="btn-google-sign-in"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 rounded-full font-bold text-sm bg-white text-[#1C1B1F] border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center justify-center gap-3 transition active:scale-98 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1F71E8]" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Guest Quick Access Link */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                id="btn-choice-continue-guest"
                onClick={handleContinueAsGuest}
                className="w-full py-3 px-4 rounded-full bg-[#F3EDF7] hover:bg-[#E7E0EC] text-xs font-bold text-[#49454F] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>Continue as Guest (No Sign-In Required)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

