import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, CheckCircle2, Smartphone } from 'lucide-react';

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
    // 1. Check if running inside native Android APK or standalone PWA
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.();
    const isStandalone =
      isCapacitor ||
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

    // Fallback: Show prompt after 3s on regular mobile/desktop if not standalone
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
      } catch {
        // cancelled
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      alert('To install: Open browser menu (3 dots or Share) and tap "Add to Home screen".');
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
      {/* Floating Bottom App Installation Notification (Material 3 Surface Card) */}
      <div
        id="auto-install-app-notification"
        className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300"
      >
        <div
          className={`p-4 rounded-[24px] border shadow-lg ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
              : 'bg-white border-slate-200 text-[#1C1B1F]'
          }`}
        >
          {installSuccess ? (
            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#1C1B1F] dark:text-[#E3E3E3]">App Installed</h4>
                <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium mt-0.5">
                  Flood Alert App is now on your phone home screen.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#1C1B1F] dark:text-[#E3E3E3] leading-snug">
                      Install Flood Alert App
                    </h4>
                    <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] mt-0.5 font-medium leading-relaxed">
                      Add this app to your phone screen to open it easily and get fast flood warning sirens.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-dismiss-install-prompt"
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#49454F] hover:text-[#1C1B1F] hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  id="btn-install-app-now"
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#1F71E8] hover:bg-[#1557B0] active:scale-98 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Install to Phone</span>
                </button>

                <button
                  type="button"
                  id="btn-install-app-later"
                  onClick={handleDismiss}
                  className="py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-98 text-xs font-bold text-[#49454F] dark:bg-[#28292A] dark:text-[#C4C7C5] dark:hover:bg-[#333537] transition cursor-pointer min-h-[42px]"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* iPhone / iPad 2-Step Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm p-5 rounded-[28px] border shadow-2xl space-y-4 ${
              isDarkMode
                ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
                : 'bg-white border-slate-200 text-[#1C1B1F]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C1B1F] dark:text-[#E3E3E3]">Install on iPhone</h3>
                  <p className="text-xs text-[#49454F] dark:text-[#C4C7C5] font-medium">Follow 2 simple steps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#49454F] hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs bg-[#F3F3FA] dark:bg-[#28292A] p-4 rounded-2xl border border-slate-200 dark:border-[#444746] text-[#1C1B1F] dark:text-[#C4C7C5]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1F71E8] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <p className="leading-relaxed">
                  Tap the <strong className="inline-flex items-center gap-1 font-bold text-[#1F71E8]"><Share className="w-3.5 h-3.5 inline" /> Share</strong> button at the bottom of your Safari browser.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1F71E8] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <p className="leading-relaxed">
                  Scroll down and tap <strong className="inline-flex items-center gap-1 font-bold text-[#1F71E8]"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                setIsVisible(false);
              }}
              className="w-full py-3 rounded-full bg-[#1F71E8] hover:bg-[#1557B0] text-white text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

