import React from 'react';
import {
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Building2,
  Droplets,
  PhoneCall,
  BellRing,
  Sparkles,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { UserProfile, FloodAlert } from '../types';

interface VillageCommunityViewProps {
  currentUser: UserProfile | null;
  alerts: FloodAlert[];
  isDarkMode: boolean;
  onOpenAuthModal: () => void;
}

export const VillageCommunityView: React.FC<VillageCommunityViewProps> = ({
  currentUser,
  alerts,
  isDarkMode,
  onOpenAuthModal,
}) => {
  const currentVillage = currentUser?.village || 'Dzenje';
  const villageAlerts = alerts.filter(
    (a) => !a.village || a.village.toLowerCase().includes(currentVillage.toLowerCase()) || currentVillage.toLowerCase().includes(a.village.toLowerCase())
  );
  const activeVillageAlerts = villageAlerts.filter((a) => a.status === 'active');

  return (
    <div id="village-community-view" className="space-y-4">
      {/* 1. Village Header Banner */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] dark:text-[#8AB4F8]">
                  Community River Network
                </span>
                {activeVillageAlerts.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 animate-pulse">
                    ⚠️ Active Flood Alert
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    🟢 Normal River Flow
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold font-sans tracking-tight mt-0.5">
                {currentVillage} Village
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3 h-3 text-[#D93025] inline shrink-0" />
                <span>Ruo River &bull; T/A Mabuka &bull; Mulanje District, Southern Region</span>
              </p>
            </div>
          </div>

          <button
            id="btn-switch-village"
            onClick={onOpenAuthModal}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#D93025]" />
            <span>Change Village</span>
          </button>
        </div>
      </div>

      {/* 2. Community Key Vitals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-white border-[#E1E3E1]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            <Droplets className="w-4 h-4 text-[#1A73E8]" />
            <span>Monitored River Stations</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#1967D2] dark:text-[#8AB4F8]">
            3 Stations
          </div>
          <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
            Ruo River, Likhubula, Thuchila
          </span>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-white border-[#E1E3E1]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            <AlertTriangle className="w-4 h-4 text-[#D93025]" />
            <span>Active Flood Alerts</span>
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              activeVillageAlerts.length > 0 ? 'text-[#D93025] animate-pulse' : 'text-[#137333]'
            }`}
          >
            {activeVillageAlerts.length}
          </div>
          <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
            {activeVillageAlerts.length > 0 ? 'Action required' : 'All riverbanks safe'}
          </span>
        </div>

        <div
          className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-white border-[#E1E3E1]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Active Resident</span>
          </div>
          <div className="text-base sm:text-lg font-bold truncate">
            {currentUser?.name || 'Peter Damiano'}
          </div>
          <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
            {currentUser?.village ? `${currentUser.village} Resident` : 'Dzenje Community'}
          </span>
        </div>
      </div>

      {/* 3. Emergency Actions & Siren Test */}
      <div
        className={`rounded-3xl border p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-3">
          Village Emergency Protocol &bull; Mulanje
        </h3>

        <div className="flex flex-col">
          <a
            href="tel:999"
            className="p-3.5 rounded-2xl font-bold text-xs bg-[#E8F0FE] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] border border-[#D2E3FC] dark:border-[#1A73E8]/30 hover:bg-[#1A73E8]/30 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Malawi Emergency Rescue (999)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
