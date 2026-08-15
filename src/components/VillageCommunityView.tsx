import React, { useState } from 'react';
import {
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Building2,
  PhoneCall,
  BellRing,
  Sparkles,
  ExternalLink,
  Compass,
  LifeBuoy,
  Home,
  CheckCircle2,
  PlusCircle,
  Mic,
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
  const [autoStartVoice, setAutoStartVoice] = useState(false);

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

  const handleOpenCheckIn = (status: SafetyStatusType, startVoice = false) => {
    setSelectedInitialStatus(status);
    setAutoStartVoice(startVoice);
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
            <img
              src="/icon.svg"
              alt="App Icon"
              className="w-12 h-12 rounded-2xl shrink-0 shadow-xs border border-black/5"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] dark:text-[#8AB4F8]">
                  Community Safety Area
                </span>
                {activeVillageAlerts.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 animate-pulse">
                    ⚠️ Active Flood Warning
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    🟢 Normal River Level
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold font-sans tracking-tight mt-0.5">
                {currentVillage}
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3 h-3 text-[#D93025] inline shrink-0" />
                <span>Ruo River &bull; T/A Mabuka &bull; Mulanje District</span>
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

      {/* 2. Resident Safety Roll-Call Status Card */}
      <div
        id="safety-status-action-card"
        className={`rounded-[24px] border p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#137333] dark:text-[#81C995]" />
            <div>
              <h3 className="font-bold text-sm leading-tight">Village Safety Roll-Call</h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">Mark your safety status or request assistance</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenCheckIn('safe')}
            className="text-xs font-semibold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Update Status</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-4">
          <button
            id="quick-voice-sos-village-btn"
            onClick={() => handleOpenCheckIn('needs_help', true)}
            className="w-full p-3 rounded-2xl bg-[#D93025] hover:bg-[#B3261E] text-white flex items-center justify-between shadow-xs transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <span>Fast Voice SOS / Check-In</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/25 uppercase">Quick</span>
                </div>
                <div className="text-[11px] text-white/90 font-normal">
                  Tap to speak your safety status hands-free
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold bg-black/20 px-2.5 py-1 rounded-full">Speak Now &rarr;</span>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              id="quick-btn-mark-safe"
              onClick={() => handleOpenCheckIn('safe', false)}
              className="p-3 rounded-2xl border bg-[#E6F4EA] border-[#CEEAD6] dark:bg-[#137333]/30 dark:border-[#137333]/60 text-[#0D652D] dark:text-[#81C995] flex flex-col items-center text-center gap-1 transition-all shadow-2xs hover:scale-[1.02] active:scale-95"
            >
              <ShieldCheck className="w-5 h-5 text-[#0D652D] dark:text-[#81C995]" />
              <span className="text-xs font-bold leading-tight">Mark Myself Safe</span>
              <span className="text-[10px] text-[#0D652D] dark:text-[#81C995] font-semibold">Clear water</span>
            </button>

            <button
              id="quick-btn-evacuated"
              onClick={() => handleOpenCheckIn('evacuated', false)}
              className="p-3 rounded-2xl border bg-[#E8F0FE] border-[#D2E3FC] dark:bg-[#1A73E8]/30 dark:border-[#1A73E8]/60 text-[#1557B0] dark:text-[#8AB4F8] flex flex-col items-center text-center gap-1 transition-all shadow-2xs hover:scale-[1.02] active:scale-95"
            >
              <Home className="w-5 h-5 text-[#1557B0] dark:text-[#8AB4F8]" />
              <span className="text-xs font-bold leading-tight">Evacuated</span>
              <span className="text-[10px] text-[#1967D2] dark:text-[#8AB4F8] font-semibold">At shelter / school</span>
            </button>

            <button
              id="quick-btn-in-flooding"
              onClick={() => handleOpenCheckIn('in_flooding', false)}
              className="p-3 rounded-2xl border bg-[#FEF7E0] border-[#FEEFC3] dark:bg-[#B06000]/30 dark:border-[#B06000]/60 text-[#B06000] dark:text-[#FDE293] flex flex-col items-center text-center gap-1 transition-all shadow-2xs hover:scale-[1.02] active:scale-95"
            >
              <AlertTriangle className="w-5 h-5 text-[#B06000] dark:text-[#FDE293]" />
              <span className="text-xs font-bold leading-tight">In Flooding</span>
              <span className="text-[10px] text-[#B06000] dark:text-[#FDE293] font-semibold">Water rising</span>
            </button>

            <button
              id="quick-btn-needs-help"
              onClick={() => handleOpenCheckIn('needs_help', false)}
              className="p-3 rounded-2xl border bg-[#FCE8E6] border-[#FAD2CF] dark:bg-[#D93025]/30 dark:border-[#D93025]/60 text-[#C5221F] dark:text-[#F28B82] flex flex-col items-center text-center gap-1 transition-all shadow-2xs hover:scale-[1.02] active:scale-95"
            >
              <LifeBuoy className="w-5 h-5 text-[#C5221F] dark:text-[#F28B82]" />
              <span className="text-xs font-bold leading-tight">Need Rescue</span>
              <span className="text-[10px] text-[#C5221F] dark:text-[#F28B82] font-semibold">Emergency</span>
            </button>
          </div>
        </div>

        {/* Roll-call summary pills */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-around text-center ${
            isDarkMode ? 'bg-[#28292C] border-[#303134]' : 'bg-[#F1F3F4] border-[#E1E3E1]'
          }`}
        >
          <div>
            <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-semibold">Safe / Clear</div>
            <div className="text-base font-bold text-[#137333] dark:text-[#81C995]">{safeCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-[#E1E3E1] dark:bg-[#303134]" />
          <div>
            <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-semibold">In Flooding</div>
            <div className="text-base font-bold text-[#B06000] dark:text-amber-300">{inFloodingCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-[#E1E3E1] dark:bg-[#303134]" />
          <div>
            <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-semibold">Rescue SOS</div>
            <div className="text-base font-bold text-[#D93025] dark:text-red-400">{needsHelpCount}</div>
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
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
              Recent Roll-Call Check-Ins in {currentVillage}
            </h3>
            <span className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6]">{villageReports.length} recorded</span>
          </div>

          <div className="divide-y divide-[#E1E3E1] dark:divide-[#303134]">
            {villageReports.slice(0, 5).map((report) => (
              <div key={report.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">{report.userName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        report.status === 'safe'
                          ? 'bg-[#E6F4EA] text-[#0D652D]'
                          : report.status === 'evacuated'
                          ? 'bg-[#E8F0FE] text-[#1557B0]'
                          : report.status === 'in_flooding'
                          ? 'bg-[#FEF7E0] text-[#B06000]'
                          : 'bg-[#FCE8E6] text-[#C5221F] animate-pulse'
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
                    <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">
                      ({report.peopleCount || 1} {report.peopleCount === 1 ? 'person' : 'people'})
                    </span>
                  </div>
                  {report.message && (
                    <p className="text-xs text-[#3C4043] dark:text-[#9AA0A6] truncate max-w-xs">{report.message}</p>
                  )}
                </div>

                <span className="text-xs font-mono text-[#5F6368] dark:text-[#9AA0A6] shrink-0">{report.formattedTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Modal */}
      <SafetyCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        initialStatus={selectedInitialStatus}
        autoStartVoice={autoStartVoice}
      />
    </div>
  );
};

