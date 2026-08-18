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
  LifeBuoy,
  Home,
  CheckCircle2,
  PlusCircle,
  Mic,
  Phone,
  Volume2,
  Clock,
  User,
} from 'lucide-react';
import { UserProfile, FloodAlert, ResidentSafetyReport, SafetyStatusType } from '../types';
import { SafetyCheckInModal } from './SafetyCheckInModal';

interface VillageCommunityViewProps {
  currentUser: UserProfile | null;
  alerts: FloodAlert[];
  safetyReports?: ResidentSafetyReport[];
  isDarkMode: boolean;
  onOpenAuthModal: () => void;
  onOpenDirectVoiceSOS?: () => void;
}

export const VillageCommunityView: React.FC<VillageCommunityViewProps> = ({
  currentUser,
  alerts,
  safetyReports = [],
  isDarkMode,
  onOpenAuthModal,
  onOpenDirectVoiceSOS,
}) => {
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedInitialStatus, setSelectedInitialStatus] = useState<SafetyStatusType>('safe');
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const currentVillage = currentUser?.village || 'Dzenje Village';
  const villageAlerts = alerts.filter(
    (a) =>
      !a.village ||
      a.village.toLowerCase().includes(currentVillage.toLowerCase()) ||
      currentVillage.toLowerCase().includes(a.village.toLowerCase())
  );
  const activeVillageAlerts = villageAlerts.filter((a) => a.status === 'active');

  // Village specific safety reports
  const villageReports = safetyReports.filter(
    (r) =>
      !r.village ||
      r.village.toLowerCase().includes(currentVillage.toLowerCase()) ||
      currentVillage.toLowerCase().includes(r.village.toLowerCase())
  );

  const safeCount = villageReports.filter((r) => r.status === 'safe').length;
  const evacuatedCount = villageReports.filter((r) => r.status === 'evacuated').length;
  const inFloodingCount = villageReports.filter((r) => r.status === 'in_flooding').length;
  const needsHelpCount = villageReports.filter((r) => r.status === 'needs_help').length;

  const handleOpenCheckIn = (status: SafetyStatusType, startVoice = false) => {
    setSelectedInitialStatus(status);
    setAutoStartVoice(startVoice);
    setIsCheckInModalOpen(true);
  };

  const handlePlayVoice = (reportId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    if (playingAudioId === reportId) {
      setPlayingAudioId(null);
      return;
    }
    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
    setPlayingAudioId(reportId);
    audio.play().catch(() => setPlayingAudioId(null));
  };

  return (
    <div id="village-community-view" className="space-y-4 pb-24">
      {/* 1. Village Location & River Status Banner */}
      <div
        id="village-header-card"
        className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-[#D93025]" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]">
                  Village Safety Hub
                </span>
                {activeVillageAlerts.length > 0 ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82] border border-[#FAD2CF] dark:border-[#D93025]/40 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D93025]" />
                    Flood Warning Active
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#137333] dark:bg-[#81C995]" />
                    River Normal
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold font-sans tracking-tight">
                {currentVillage}
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                Ruo River Area &bull; T/A Mabuka &bull; Mulanje District
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-switch-village"
            onClick={onOpenAuthModal}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#28292A] dark:hover:bg-[#303134] text-[#1F1F1F] dark:text-[#E3E3E3] transition-all self-start sm:self-auto flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5 text-[#D93025]" />
            <span>Change Village</span>
          </button>
        </div>
      </div>

      {/* 2. Fast Safety Status Check-In Card */}
      <div
        id="safety-status-action-card"
        className={`rounded-3xl border p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight font-sans">
                Tell Village Your Safety Status
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Tap a button below to let neighbors and rescue teams know if you are safe
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-custom-status-update"
            onClick={() => handleOpenCheckIn('safe')}
            className="text-xs font-bold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline flex items-center gap-1 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>

        {/* Emergency Voice SOS Button */}
        <div className="space-y-3 mb-4">
          <button
            type="button"
            id="quick-voice-sos-village-btn"
            onClick={() => {
              if (onOpenDirectVoiceSOS) {
                onOpenDirectVoiceSOS();
              } else {
                handleOpenCheckIn('needs_help', true);
              }
            }}
            className="w-full p-3.5 rounded-2xl bg-[#D93025] hover:bg-[#B3261E] text-white flex items-center justify-between shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <span>Fast Voice Note SOS</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white/25 uppercase">
                    SOS
                  </span>
                </div>
                <div className="text-[11px] text-white/90 font-normal">
                  Record a quick voice message for village rescue teams
                </div>
              </div>
            </div>
            <span className="text-xs font-bold bg-black/20 px-3 py-1.5 rounded-full shrink-0">
              Record SOS &rarr;
            </span>
          </button>

          {/* 4 1-Tap Status Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              id="quick-btn-mark-safe"
              onClick={() => handleOpenCheckIn('safe', false)}
              className="p-3.5 rounded-2xl border bg-[#E6F4EA] border-[#CEEAD6] dark:bg-[#137333]/20 dark:border-[#137333]/40 text-[#137333] dark:text-[#81C995] flex flex-col items-center text-center gap-1.5 transition-all shadow-2xs hover:bg-[#D7EEDF] active:scale-95 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#137333] text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold leading-tight">I Am Safe</span>
              <span className="text-[10px] text-[#137333] dark:text-[#81C995] font-medium">
                Safe at home
              </span>
            </button>

            <button
              type="button"
              id="quick-btn-evacuated"
              onClick={() => handleOpenCheckIn('evacuated', false)}
              className="p-3.5 rounded-2xl border bg-[#E8F0FE] border-[#D2E3FC] dark:bg-[#1A73E8]/20 dark:border-[#1A73E8]/40 text-[#1A73E8] dark:text-[#8AB4F8] flex flex-col items-center text-center gap-1.5 transition-all shadow-2xs hover:bg-[#D3E3FD] active:scale-95 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#1A73E8] text-white flex items-center justify-center">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold leading-tight">At Shelter</span>
              <span className="text-[10px] text-[#1A73E8] dark:text-[#8AB4F8] font-medium">
                At school / hill
              </span>
            </button>

            <button
              type="button"
              id="quick-btn-in-flooding"
              onClick={() => handleOpenCheckIn('in_flooding', false)}
              className="p-3.5 rounded-2xl border bg-[#FEF7E0] border-[#FEEFC3] dark:bg-[#B06000]/20 dark:border-[#B06000]/40 text-[#B06000] dark:text-[#FDD663] flex flex-col items-center text-center gap-1.5 transition-all shadow-2xs hover:bg-[#FCEBB8] active:scale-95 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#B06000] text-white flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold leading-tight">Water Rising</span>
              <span className="text-[10px] text-[#B06000] dark:text-[#FDD663] font-medium">
                Moving now
              </span>
            </button>

            <button
              type="button"
              id="quick-btn-needs-help"
              onClick={() => handleOpenCheckIn('needs_help', false)}
              className="p-3.5 rounded-2xl border bg-[#FCE8E6] border-[#FAD2CF] dark:bg-[#D93025]/20 dark:border-[#D93025]/40 text-[#D93025] dark:text-[#F28B82] flex flex-col items-center text-center gap-1.5 transition-all shadow-2xs hover:bg-[#FAD2CF] active:scale-95 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#D93025] text-white flex items-center justify-center">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold leading-tight">Need Help</span>
              <span className="text-[10px] text-[#D93025] dark:text-[#F28B82] font-medium">
                Rescue needed
              </span>
            </button>
          </div>
        </div>

        {/* Safety Counts Tonal Bar */}
        <div
          id="village-safety-summary-counts"
          className={`p-3.5 rounded-2xl border grid grid-cols-4 gap-2 text-center ${
            isDarkMode ? 'bg-[#28292A] border-[#303134]' : 'bg-[#F8F9FA] border-[#E1E3E1]'
          }`}
        >
          <div>
            <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">Safe</div>
            <div className="text-base font-bold text-[#137333] dark:text-[#81C995]">{safeCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">At Shelter</div>
            <div className="text-base font-bold text-[#1A73E8] dark:text-[#8AB4F8]">{evacuatedCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">Water Rising</div>
            <div className="text-base font-bold text-[#B06000] dark:text-[#FDD663]">{inFloodingCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">Need Help</div>
            <div className="text-base font-bold text-[#D93025] dark:text-[#F28B82]">{needsHelpCount}</div>
          </div>
        </div>
      </div>

      {/* 3. Community Safety Status List */}
      <div
        id="community-safety-list-card"
        className={`rounded-3xl border p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base font-sans">
              Recent Village Status Reports
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              {villageReports.length} {villageReports.length === 1 ? 'person has' : 'people have'} checked in
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F1F3F4] dark:bg-[#28292A] text-[#5F6368] dark:text-[#9AA0A6]">
            {currentVillage}
          </span>
        </div>

        {villageReports.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#28292A] border border-[#E1E3E1] dark:border-[#303134]">
            <Users className="w-8 h-8 text-[#5F6368] dark:text-[#9AA0A6] mx-auto mb-1.5 opacity-60" />
            <h4 className="font-bold text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">
              No Status Updates Yet
            </h4>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
              Be the first to tap "I Am Safe" or record a voice note for your village.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {villageReports.map((report) => {
              const isSafe = report.status === 'safe';
              const isEvacuated = report.status === 'evacuated';
              const isInFlooding = report.status === 'in_flooding';
              const isNeedsHelp = report.status === 'needs_help';

              return (
                <div
                  key={report.id}
                  id={`safety-report-${report.id}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isNeedsHelp
                      ? 'bg-[#FCE8E6] dark:bg-[#D93025]/20 border-[#FAD2CF] dark:border-[#D93025]/40'
                      : isInFlooding
                      ? 'bg-[#FEF7E0] dark:bg-[#B06000]/20 border-[#FEEFC3] dark:border-[#B06000]/40'
                      : isEvacuated
                      ? 'bg-[#E8F0FE] dark:bg-[#1A73E8]/20 border-[#D2E3FC] dark:border-[#1A73E8]/40'
                      : 'bg-[#F8F9FA] dark:bg-[#28292A] border-[#E1E3E1] dark:border-[#303134]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isNeedsHelp
                          ? 'bg-[#D93025] text-white'
                          : isInFlooding
                          ? 'bg-[#B06000] text-white'
                          : isEvacuated
                          ? 'bg-[#1A73E8] text-white'
                          : 'bg-[#137333] text-white'
                      }`}
                    >
                      {isNeedsHelp && <LifeBuoy className="w-4 h-4" />}
                      {isInFlooding && <AlertTriangle className="w-4 h-4" />}
                      {isEvacuated && <Home className="w-4 h-4" />}
                      {isSafe && <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">
                          {report.userName || 'Resident'}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isNeedsHelp
                              ? 'bg-[#D93025] text-white'
                              : isInFlooding
                              ? 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#B06000]/30 dark:text-[#FDD663]'
                              : isEvacuated
                              ? 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/30 dark:text-[#8AB4F8]'
                              : 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/30 dark:text-[#81C995]'
                          }`}
                        >
                          {isNeedsHelp
                            ? '🚨 Needs Rescue'
                            : isInFlooding
                            ? '⚠️ In Flooding'
                            : isEvacuated
                            ? '🏫 At Shelter'
                            : '✓ Safe'}
                        </span>

                        <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                          ({report.peopleCount || 1} {report.peopleCount === 1 ? 'person' : 'people'})
                        </span>
                      </div>

                      {report.message && (
                        <p className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-snug">
                          "{report.message}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#1A73E8] dark:text-[#8AB4F8]" />
                          {report.formattedTime || 'Recently'}
                        </span>
                        {report.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-[#137333] dark:text-[#81C995]" />
                            {report.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voice Note audio playback button if attached */}
                  {report.voiceAudioUrl && (
                    <button
                      type="button"
                      id={`btn-play-voice-${report.id}`}
                      onClick={() => handlePlayVoice(report.id, report.voiceAudioUrl)}
                      className="px-3 py-1.5 rounded-full bg-white dark:bg-[#1E1F20] hover:bg-[#F1F3F4] dark:hover:bg-[#303134] text-xs font-bold text-[#D93025] dark:text-[#F28B82] border border-[#FAD2CF] dark:border-[#D93025]/40 transition-all flex items-center gap-1.5 shadow-2xs self-start sm:self-center shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{playingAudioId === report.id ? 'Playing Voice...' : 'Play Voice Note'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety Check-In Modal */}
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
