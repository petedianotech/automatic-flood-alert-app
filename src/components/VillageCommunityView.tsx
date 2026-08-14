import React, { useState } from 'react';
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
  LifeBuoy,
  Home,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { UserProfile, FloodAlert, ResidentSafetyReport, SafetyStatusType } from '../types';
import { SafetyCheckInModal } from './SafetyCheckInModal';

interface VillageCommunityViewProps {
  currentUser: UserProfile | null;
  alerts: FloodAlert[];
  safetyReports?: ResidentSafetyReport[];
  isDarkMode: boolean;
  onOpenAuthModal: () => void;
}

export const VillageCommunityView: React.FC<VillageCommunityViewProps> = ({
  currentUser,
  alerts,
  safetyReports = [],
  isDarkMode,
  onOpenAuthModal,
}) => {
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedInitialStatus, setSelectedInitialStatus] = useState<SafetyStatusType>('safe');

  const currentVillage = currentUser?.village || 'Dzenje Village';
  const villageAlerts = alerts.filter(
    (a) => !a.village || a.village.toLowerCase().includes(currentVillage.toLowerCase()) || currentVillage.toLowerCase().includes(a.village.toLowerCase())
  );
  const activeVillageAlerts = villageAlerts.filter((a) => a.status === 'active');

  // Village specific safety roll-call
  const villageReports = safetyReports.filter(
    (r) => !r.village || r.village.toLowerCase().includes(currentVillage.toLowerCase()) || currentVillage.toLowerCase().includes(r.village.toLowerCase())
  );
  const safeCount = villageReports.filter((r) => r.status === 'safe' || r.status === 'evacuated').length;
  const inFloodingCount = villageReports.filter((r) => r.status === 'in_flooding').length;
  const needsHelpCount = villageReports.filter((r) => r.status === 'needs_help').length;

  const handleOpenCheckIn = (status: SafetyStatusType) => {
    setSelectedInitialStatus(status);
    setIsCheckInModalOpen(true);
  };

  return (
    <div id="village-community-view" className="space-y-4 pb-12">
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
                {currentVillage}
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

      {/* 2. Resident Safety & Roll-Call Status Card (NEW) */}
      <div
        id="safety-status-action-card"
        className={`rounded-3xl border p-5 transition-all shadow-sm ${
          isDarkMode
            ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-gradient-to-br from-white to-zinc-50 border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-bold text-sm leading-tight">Your Safety & Roll-Call Status</h3>
              <p className="text-xs text-zinc-400">Mark yourself safe or report if in flooding</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenCheckIn('safe')}
            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Update Status</span>
          </button>
        </div>

        {/* 4 Fast Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <button
            id="quick-btn-mark-safe"
            onClick={() => handleOpenCheckIn('safe')}
            className="p-3 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 flex flex-col items-center text-center gap-1 transition-all active:scale-98"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold leading-tight">Mark Myself Safe</span>
            <span className="text-[10px] text-zinc-400">Floods ended / clear</span>
          </button>

          <button
            id="quick-btn-evacuated"
            onClick={() => handleOpenCheckIn('evacuated')}
            className="p-3 rounded-2xl border bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400 flex flex-col items-center text-center gap-1 transition-all active:scale-98"
          >
            <Home className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold leading-tight">Evacuated</span>
            <span className="text-[10px] text-zinc-400">At shelter / school</span>
          </button>

          <button
            id="quick-btn-in-flooding"
            onClick={() => handleOpenCheckIn('in_flooding')}
            className="p-3 rounded-2xl border bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-400 flex flex-col items-center text-center gap-1 transition-all active:scale-98"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold leading-tight">In Flooding</span>
            <span className="text-[10px] text-zinc-400">Water rising in yard</span>
          </button>

          <button
            id="quick-btn-needs-help"
            onClick={() => handleOpenCheckIn('needs_help')}
            className="p-3 rounded-2xl border bg-red-500/15 border-red-500/40 hover:bg-red-500/25 text-red-400 flex flex-col items-center text-center gap-1 transition-all active:scale-98 animate-pulse"
          >
            <LifeBuoy className="w-5 h-5 text-red-400" />
            <span className="text-xs font-bold leading-tight">Need Rescue SOS</span>
            <span className="text-[10px] text-zinc-400">Emergency help</span>
          </button>
        </div>

        {/* Village Roll-call summary pills */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-around text-center ${
            isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100/60 border-zinc-200'
          }`}
        >
          <div>
            <div className="text-xs text-zinc-400 font-medium">Safe / Clear</div>
            <div className="text-base font-black text-emerald-400">{safeCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-zinc-700/50" />
          <div>
            <div className="text-xs text-zinc-400 font-medium">In Flooding</div>
            <div className="text-base font-black text-amber-400">{inFloodingCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-zinc-700/50" />
          <div>
            <div className="text-xs text-zinc-400 font-medium">Rescue SOS</div>
            <div className="text-base font-black text-red-400">{needsHelpCount}</div>
          </div>
        </div>
      </div>

      {/* 3. Recent Community Roll-Call Check-ins */}
      {villageReports.length > 0 && (
        <div
          className={`rounded-3xl border p-5 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400">
              Recent Roll-Call Check-Ins in {currentVillage}
            </h3>
            <span className="text-[11px] text-zinc-400">{villageReports.length} recorded</span>
          </div>

          <div className="divide-y divide-zinc-800/40">
            {villageReports.slice(0, 5).map((report) => (
              <div key={report.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">{report.userName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full font-bold flex items-center gap-1 ${
                        report.status === 'safe'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : report.status === 'evacuated'
                          ? 'bg-blue-500/15 text-blue-400'
                          : report.status === 'in_flooding'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/20 text-red-400 animate-pulse'
                      }`}
                    >
                      {report.status === 'safe' && <ShieldCheck className="w-3 h-3" />}
                      {report.status === 'evacuated' && <Home className="w-3 h-3" />}
                      {report.status === 'in_flooding' && <AlertTriangle className="w-3 h-3" />}
                      {report.status === 'needs_help' && <LifeBuoy className="w-3 h-3" />}
                      <span>
                        {report.status === 'safe'
                          ? 'Safe'
                          : report.status === 'evacuated'
                          ? 'Evacuated'
                          : report.status === 'in_flooding'
                          ? 'In Flooding'
                          : 'Need Rescue'}
                      </span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      ({report.peopleCount || 1} {report.peopleCount === 1 ? 'person' : 'people'})
                    </span>
                  </div>
                  {report.message && (
                    <p className="text-[11px] text-zinc-400 truncate max-w-xs">{report.message}</p>
                  )}
                </div>

                <span className="text-[10px] text-zinc-500 shrink-0">{report.formattedTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Community Key Vitals */}
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
            <span>River Stations</span>
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

      {/* 5. Emergency Actions & Siren Test */}
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

      {/* Safety Modal */}
      <SafetyCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        initialStatus={selectedInitialStatus}
      />
    </div>
  );
};

