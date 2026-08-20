import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallAppPromptProps {
  isDarkMode: boolean;
}

export const InstallAppPrompt: React.FC<InstallAppPromptProps> = ({ isDarkMode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already installed as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if dismissed recently (24 hour cool-down)
    const dismissedAt = localStorage.getItem('flood_pwa_prompt_dismissed_at');
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return;
      }
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Auto-show prompt after 2 seconds on new devices
      setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari and not standalone, show after 2.5 seconds
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Fallback: If prompt event didn't fire in 3.5 seconds on desktop/mobile and not standalone, show standard prompt
    const fallbackTimer = setTimeout(() => {
      if (!isStandalone && !localStorage.getItem('flood_pwa_prompt_dismissed_at')) {
        setIsVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => {
            setIsVisible(false);
          }, 3000);
        }
        setDeferredPrompt(null);
      } catch (err) {
        // user or browser cancelled
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Direct user on desktop/android
      alert('To install this app on your device, tap your browser menu (⋮ or Share) and select "Add to Home screen" or "Install App".');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('flood_pwa_prompt_dismissed_at', Date.now().toString());
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom App Installation Notification */}
      <div
        id="auto-install-app-notification"
        className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300"
      >
        <div
          className={`p-4 rounded-[28px] border shadow-xl backdrop-blur-lg ${
            isDarkMode
              ? 'bg-[#1E1F20]/95 border-[#444746] text-[#E3E3E3]'
              : 'bg-white/95 border-[#E0E2EC] text-[#1C1B1F]'
          }`}
        >
          {installSuccess ? (
            <div className="flex items-center gap-3 py-1">
              <CheckCircle2 className="w-7 h-7 text-[#0D652D] dark:text-[#81C995] shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-[#1C1B1F] dark:text-[#E3E3E3]">App Installed Successfully</h4>
                <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">
                  Flood Alert App is now available on your home screen.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/icon.svg"
                    alt="App Icon"
                    className="w-11 h-11 rounded-2xl shrink-0 shadow-xs border border-[#E0E2EC] dark:border-[#444746]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm tracking-tight text-[#1C1B1F] dark:text-[#E3E3E3]">
                        Install Flood Alert App
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E0EFFF] text-[#0B57D0] dark:bg-[#1F71E8]/30 dark:text-[#A8C7FA]">
                        Dzenje STEM
                      </span>
                    </div>
                    <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] mt-0.5 leading-snug font-medium">
                      Add to your home screen for instant loud flood sirens and easy offline access.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-dismiss-install-prompt"
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full text-[#49454F] dark:text-[#C4C7C5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                  title="Dismiss for now"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="btn-install-app-now"
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#1F71E8] hover:bg-[#1557B0] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install to Home Screen</span>
                </button>

                <button
                  type="button"
                  id="btn-install-app-later"
                  onClick={handleDismiss}
                  className="py-2.5 px-4 rounded-full bg-[#F3F3FA] dark:bg-[#28292A] hover:bg-[#E0EFFF] text-xs font-bold text-[#49454F] dark:text-[#C4C7C5] transition-colors border border-[#E0E2EC] dark:border-[#444746] cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* iOS Step-by-Step Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm p-5 rounded-[28px] border shadow-2xl space-y-4 ${
              isDarkMode
                ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
                : 'bg-[#FEF7FF] border-[#E0E2EC] text-[#1C1B1F]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon.svg"
                  alt="App Icon"
                  className="w-9 h-9 rounded-xl shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-sm text-[#1C1B1F] dark:text-[#E3E3E3]">Install on iPhone or iPad</h3>
                  <p className="text-[11px] text-[#49454F] dark:text-[#C4C7C5] font-medium">2 quick steps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4 text-[#49454F] dark:text-[#C4C7C5]" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#F3F3FA] dark:bg-[#28292A] p-4 rounded-[20px] border border-[#E0E2EC] dark:border-[#444746] text-[#49454F] dark:text-[#C4C7C5]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1F71E8] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  1
                </span>
                <p>
                  Tap the <strong className="inline-flex items-center gap-1 font-bold text-[#1F71E8] dark:text-[#A8C7FA]"><Share className="w-3.5 h-3.5 inline" /> Share</strong> button at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1F71E8] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  2
                </span>
                <p>
                  Scroll down and tap <strong className="inline-flex items-center gap-1 font-bold text-[#1F71E8] dark:text-[#A8C7FA]"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                setIsVisible(false);
              }}
              className="w-full py-2.5 rounded-full bg-[#1F71E8] hover:bg-[#1557B0] text-white text-xs font-bold transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
