import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  Zap,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Check,
  X,
} from 'lucide-react';
import {
  batteryOptimizationService,
  PHONE_BRAND_GUIDES,
  PhoneBrandGuide,
} from '../services/batteryOptimizationService';

interface BatteryOptimizationCardProps {
  className?: string;
}

export const BatteryOptimizationCard: React.FC<BatteryOptimizationCardProps> = ({
  className = '',
}) => {
  const [isConfirmed, setIsConfirmed] = useState<boolean>(() =>
    batteryOptimizationService.isExemptionConfirmed()
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    batteryOptimizationService.isPromptDismissed()
  );
  const [showBrandGuide, setShowBrandGuide] = useState<boolean>(false);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState<number>(0);

  useEffect(() => {
    batteryOptimizationService.checkNativeStatus().then((nativeExempt) => {
      if (nativeExempt) {
        setIsConfirmed(true);
      }
    });
  }, []);

  if (isDismissed && !isConfirmed) {
    return null;
  }

  const handleOpenSettings = async () => {
    await batteryOptimizationService.openAndroidBatterySettings();
    setShowBrandGuide(true);
  };

  const handleMarkDone = () => {
    batteryOptimizationService.setExemptionConfirmed(true);
    setIsConfirmed(true);
  };

  const handleUndo = () => {
    batteryOptimizationService.setExemptionConfirmed(false);
    setIsConfirmed(false);
  };

  const handleDismiss = () => {
    batteryOptimizationService.setPromptDismissed(true);
    setIsDismissed(true);
  };


  // State 1: Confirmed Unrestricted / Optimal State -> Automatically hidden to keep UI clean and setup complete
  if (isConfirmed) {
    return null;
  }

  // State 2: Unrestricted Setup Prompt (Material 3 Card)
  return (
    <div
      id="card-battery-optimization-prompt"
      className={`rounded-[24px] p-4 sm:p-5 bg-white border-2 border-amber-400 text-[#1C1B1F] shadow-sm space-y-4 ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BatteryCharging className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-base text-[#1C1B1F] leading-tight">
                Turn Off Battery Optimization
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Crucial for Siren
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#49454F] font-medium mt-1 leading-snug">
              Stop Android from sleeping this app so flood sirens wake you up immediately, even if your phone has been asleep all night.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
          title="Dismiss card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          id="btn-open-battery-settings"
          onClick={handleOpenSettings}
          className="h-11 px-4 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-98 transition cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Battery Settings</span>
        </button>

        <button
          type="button"
          id="btn-confirm-battery-unrestricted"
          onClick={handleMarkDone}
          className="h-11 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-98 transition cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>I Set to "Unrestricted"</span>
        </button>
      </div>

      {/* Expandable Phone Brand Instructions for Local Village Phones */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowBrandGuide(!showBrandGuide)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#1A73E8] hover:text-[#1557B0] cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" />
            <span>How to set Unrestricted on Samsung, Tecno, Itel, Xiaomi...</span>
          </span>
          {showBrandGuide ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {showBrandGuide && (
          <div className="mt-3 space-y-3 bg-[#F8F9FA] p-3.5 rounded-2xl border border-slate-200/80 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {PHONE_BRAND_GUIDES.map((guide, idx) => (
                <button
                  key={guide.brand}
                  type="button"
                  onClick={() => setSelectedBrandIndex(idx)}
                  className={`px-3 py-1.5 rounded-full font-bold transition text-xs cursor-pointer ${
                    selectedBrandIndex === idx
                      ? 'bg-[#1A73E8] text-white'
                      : 'bg-white text-[#49454F] border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {guide.brand.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-[#1C1B1F]">
                {PHONE_BRAND_GUIDES[selectedBrandIndex].brand} steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[#49454F] font-medium leading-relaxed">
                {PHONE_BRAND_GUIDES[selectedBrandIndex].steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
