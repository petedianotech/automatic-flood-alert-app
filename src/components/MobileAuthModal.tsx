import React, { useState } from 'react';
import {
  User,
  MapPin,
  LogIn,
  LogOut,
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { UserProfile, ADMIN_EMAIL, isAppAdmin } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface MobileAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode: boolean;
}

const EXAMPLE_NAMES = ['Peter Damiano', 'Christina matipwiri', 'Mr Banda'];

const VILLAGE_PRESETS = [
  'Dzenje Village',
  'Mathambi',
  'Chinyama',
  'Nkhulambe',
  'Likabula',
  'Chitakale',
];

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isDarkMode,
}) => {
  const [authMethod, setAuthMethod] = useState<'village' | 'google'>('village');
  const [name, setName] = useState(currentUser?.name || '');
  const [village, setVillage] = useState(currentUser?.village || 'Dzenje Village');
  const [exampleNameIndex, setExampleNameIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Periodically cycle through example names (Peter Damiano, Christina matipwiri, Mr Banda)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setExampleNameIndex((prev) => (prev + 1) % EXAMPLE_NAMES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = isAppAdmin(currentUser);

  if (!isOpen) return null;

  const handleVillageSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!village.trim()) {
      setError('Please enter or select your village name');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await firebaseFloodService.signInWithNameAndVillage(name, village);
      setSuccessMsg(`Welcome, ${name}! Signed in to ${village}.`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
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
      const targetVillage = village.trim() || 'Dzenje Village';
      await firebaseFloodService.signInWithGoogle(targetVillage);
      setSuccessMsg('Successfully connected with Google!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
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
      setSuccessMsg('Signed out successfully');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 800);
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
        setTimeout(() => setSuccessMsg(null), 2500);
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <div
      id="mobile-auth-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="mobile-auth-sheet"
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl transition-all max-h-[92vh] overflow-y-auto ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        {/* Mobile Drag Pill */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="App Icon"
              className="w-9 h-9 rounded-xl shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-base font-sans tracking-tight">
                {currentUser ? 'Your Village Profile' : 'Sign In to Flood Alert'}
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                {currentUser ? 'Active Community Member' : 'Choose how you want to sign in'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-[#5F6368] dark:text-[#9AA0A6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner */}
        {currentUser ? (
          <div className="p-6 space-y-5">
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              isAdmin
                ? 'bg-[#FEF7E0] dark:bg-amber-950/20 border-[#FEEFC3] dark:border-amber-900/40'
                : 'bg-[#E8F0FE] dark:bg-[#1A73E8]/15 border-[#D2E3FC] dark:border-[#1A73E8]/30'
            }`}>
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className={`w-12 h-12 rounded-full border-2 object-cover ${
                    isAdmin ? 'border-amber-500' : 'border-[#1A73E8]'
                  }`}
                />
              ) : (
                <div className={`w-12 h-12 rounded-full text-white font-bold text-lg flex items-center justify-center shadow-xs ${
                  isAdmin ? 'bg-amber-600' : 'bg-[#1A73E8]'
                }`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-base text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                    {currentUser.name}
                  </h4>
                  {isAdmin ? (
                    <span className="text-[10px] font-bold tracking-tight px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold tracking-tight px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Community Member
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D93025]" />
                  <span className="truncate font-semibold">{currentUser.village}</span>
                  {currentUser.email && (
                    <span className="text-[11px] font-mono text-[#5F6368] dark:text-[#9AA0A6] truncate">
                      • {currentUser.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Village Switcher */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-2">
                Active Village / Sector
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VILLAGE_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleUpdateVillageOnly(v)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all flex items-center justify-between ${
                      currentUser.village === v
                        ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                        : 'bg-black/[0.02] dark:bg-white/[0.04] border-black/10 dark:border-white/10 hover:border-[#1A73E8]'
                    }`}
                  >
                    <span className="truncate">{v}</span>
                    {currentUser.village === v && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Sign Out Button */}
            <div className="pt-2 flex gap-2.5">
              <button
                id="btn-sign-out"
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#FCE8E6] text-[#C5221F] dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50 flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#F1F3F4] dark:bg-[#2D2E30] text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#E8EAED] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Form */
          <div className="p-6 space-y-5">
            {/* Auth Method Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
              <button
                type="button"
                id="tab-auth-village"
                onClick={() => {
                  setAuthMethod('village');
                  setError(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMethod === 'village'
                    ? 'bg-white dark:bg-[#28292A] text-[#1A73E8] shadow-xs'
                    : 'text-[#5F6368] dark:text-[#9AA0A6]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Name &amp; Village</span>
              </button>

              <button
                type="button"
                id="tab-auth-google"
                onClick={() => {
                  setAuthMethod('google');
                  setError(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMethod === 'google'
                    ? 'bg-white dark:bg-[#28292A] text-[#1A73E8] shadow-xs'
                    : 'text-[#5F6368] dark:text-[#9AA0A6]'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                <span>Google Sign-In</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#FCE8E6] text-[#C5221F] dark:bg-red-950/50 dark:text-red-300 text-xs font-semibold flex items-center gap-2 border border-[#FAD2CF] dark:border-red-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Option 1: Name & Village Form */}
            {authMethod === 'village' ? (
              <form onSubmit={handleVillageSignIn} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6]">
                      Your Full Name *
                    </label>
                    <span className="text-[10px] font-mono text-[#1A73E8] dark:text-[#8AB4F8] transition-opacity">
                      e.g. {EXAMPLE_NAMES[exampleNameIndex]}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5F6368] dark:text-[#9AA0A6]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`e.g. ${EXAMPLE_NAMES[exampleNameIndex]}`}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    />
                  </div>
                </div>

                {/* Village / Sector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6]">
                      Village / Community Name *
                    </label>
                    <span className="text-[10px] font-mono text-[#137333] dark:text-[#81C995]">
                      e.g. Dzenje
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5F6368] dark:text-[#9AA0A6]">
                      <MapPin className="w-4 h-4 text-[#D93025]" />
                    </div>
                    <input
                      id="input-auth-village"
                      type="text"
                      required
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Dzenje"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    />
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {VILLAGE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setVillage(p)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          village === p
                            ? 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
                            : 'bg-black/[0.02] dark:bg-white/[0.03] text-[#5F6368] dark:text-[#9AA0A6] border-transparent hover:border-black/10'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-submit-village-auth"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 rounded-2xl font-bold text-sm bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In &amp; Join Village Alert Network</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Option 2: Google Sign In Option */
              <div className="space-y-4 py-2">
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                  Sign in with Google to synchronize real-time river radar alerts, neighborhood updates, and siren notifications across all your devices.
                </p>

                {/* Village Selection for Google Account */}
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                    Your Village Community *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5F6368] dark:text-[#9AA0A6]">
                      <MapPin className="w-4 h-4 text-[#D93025]" />
                    </div>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Dzenje Village"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    />
                  </div>
                </div>

                <button
                  id="btn-google-sign-in"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-[#28292A] text-[#1F1F1F] dark:text-[#E3E3E3] border border-black/15 dark:border-white/15 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] shadow-sm flex items-center justify-center gap-3 transition-all active:scale-98"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1A73E8]" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          </div>
        )}
      </div>
    </div>
  );
};
