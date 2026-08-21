import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Home,
  Check,
  ChevronDown,
  MapPin,
  Play,
  Pause,
  Trash2,
  Mic,
  Plus,
  Phone,
  CheckCircle2,
  Clock,
  Volume2,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { ResidentSafetyReport, FloodAlert, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface AdminSafetyDashboardViewProps {
  safetyReports: ResidentSafetyReport[];
  alerts: FloodAlert[];
  currentUser: UserProfile | null;
  isDarkMode: boolean;
  selectedVillage?: string;
  onSelectVillage?: (village: string) => void;
  onOpenCheckInModal?: () => void;
  onOpenDirectVoiceSOS?: () => void;
}

export const AdminSafetyDashboardView: React.FC<AdminSafetyDashboardViewProps> = ({
  safetyReports,
  currentUser,
  selectedVillage = 'Dzenje Village',
  onSelectVillage,
  onOpenCheckInModal,
  onOpenDirectVoiceSOS,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'safe' | 'shelters' | 'help'>('all');
  const [villageFilter, setVillageFilter] = useState<string>('all');
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // Audio tone generator for voice simulation if real base64 not available
  const playSimulatedAudio = (id: string, durationSec: number = 3) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSec);

      setTimeout(() => {
        setIsPlayingAudio(null);
        ctx.close();
      }, durationSec * 1000);
    } catch {
      setIsPlayingAudio(null);
    }
  };

  const toggleAudio = (id: string, audioBase64?: string, durationSec: number = 3) => {
    if (isPlayingAudio === id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setIsPlayingAudio(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    if (audioBase64 && audioBase64.startsWith('data:audio')) {
      const audio = new Audio(audioBase64);
      activeAudioRef.current = audio;
      setIsPlayingAudio(id);

      audio.onended = () => {
        setIsPlayingAudio(null);
      };
      audio.onerror = () => {
        setIsPlayingAudio(null);
      };

      audio.play().catch(() => {
        setIsPlayingAudio(null);
      });
    } else {
      setIsPlayingAudio(id);
      playSimulatedAudio(id, durationSec);
    }
  };

  const handleDeleteRecord = async (id: string, name: string) => {
    if (window.confirm(`Delete safety record for "${name}"?`)) {
      if (isPlayingAudio === id && activeAudioRef.current) {
        activeAudioRef.current.pause();
        setIsPlayingAudio(null);
      }
      await firebaseFloodService.deleteSafetyReport(id);
    }
  };

  const activeReportsList = safetyReports;

  // Counts for summary metrics and filter pills
  const safeCount = activeReportsList.filter((r) => r.status === 'safe').length;
  const shelterCount = activeReportsList.filter((r) => r.status === 'evacuated' || r.message?.toLowerCase().includes('shelter')).length;
  const helpCount = activeReportsList.filter((r) => r.status === 'needs_help' || r.status === 'in_flooding').length;
  const totalPeopleCount = activeReportsList.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  // Filter list
  const filteredRecords = activeReportsList.filter((rec) => {
    // Village filter
    if (villageFilter !== 'all' && rec.village.toLowerCase() !== villageFilter.toLowerCase()) {
      return false;
    }
    // Category filter
    if (filterCategory === 'safe' && rec.status !== 'safe') return false;
    if (filterCategory === 'shelters' && rec.status !== 'evacuated' && !rec.message?.toLowerCase().includes('shelter')) return false;
    if (filterCategory === 'help' && rec.status !== 'needs_help' && rec.status !== 'in_flooding') return false;
    return true;
  });

  const villagesList = [
    'All Villages',
    'Dzenje Village',
    'Machokola',
    'Mathambi',
  ];

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* ================= 1. SAFETY STATUS OVERVIEW BANNER ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shadow-xs shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base sm:text-lg text-[#1C1B1F] leading-snug">
              Village Safety Status
            </h3>
            <p className="text-xs text-[#49454F] font-medium mt-0.5">
              People roll-call and rescue status
            </p>
          </div>
        </div>

        {/* 3 Status Counters */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
          <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[11px] text-[#49454F] font-medium block">Safe at Home</span>
            <span className="text-base font-bold text-emerald-700">
              {safeCount}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[11px] text-[#49454F] font-medium block">In Shelters</span>
            <span className="text-base font-bold text-blue-700">
              {shelterCount}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[11px] text-[#49454F] font-medium block">Needs Help</span>
            <span className={`text-base font-bold ${helpCount > 0 ? 'text-red-700' : 'text-[#1C1B1F]'}`}>
              {helpCount}
            </span>
          </div>
        </div>

        {/* Admin Overview Footer Indicator */}
        <div className="flex items-center justify-between text-xs text-[#49454F] pt-1">
          <span className="font-medium">Admin Monitoring View</span>
          <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
            Live Firestore Data
          </span>
        </div>
      </div>

      {/* ================= 2. FILTER CHIPS ================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* Village Dropdown */}
        <div className="relative inline-block text-left shrink-0">
          <button
            type="button"
            onClick={() => setIsVillageDropdownOpen(!isVillageDropdownOpen)}
            className="flex items-center gap-1 bg-[#F3EDF7] hover:bg-[#E7E0EC] px-3.5 py-2 rounded-full text-xs font-bold text-[#1C1B1F] transition cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>
              {villageFilter === 'all' ? 'All Villages' : villageFilter}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#49454F]" />
          </button>

          {isVillageDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 py-1.5 text-xs text-[#1C1B1F] animate-in fade-in zoom-in-95">
              {villagesList.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setVillageFilter(v === 'All Villages' ? 'all' : v);
                    if (onSelectVillage && v !== 'All Villages') {
                      onSelectVillage(v);
                    }
                    setIsVillageDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#F3EDF7] flex items-center justify-between transition cursor-pointer font-medium"
                >
                  <span>{v}</span>
                  {(villageFilter === 'all' && v === 'All Villages') || villageFilter === v ? (
                    <Check className="w-4 h-4 text-[#1F71E8]" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* All Records Chip */}
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-[#1F71E8] text-white shadow-xs'
              : 'bg-[#F3EDF7] text-[#49454F] hover:bg-[#E7E0EC]'
          }`}
        >
          {filterCategory === 'all' && <Check className="w-3.5 h-3.5" />}
          <span>All ({activeReportsList.length})</span>
        </button>

        {/* Safe Chip */}
        <button
          type="button"
          onClick={() => setFilterCategory('safe')}
          className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
            filterCategory === 'safe'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-[#F3EDF7] text-emerald-800 hover:bg-[#E7E0EC]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Safe ({safeCount})</span>
        </button>

        {/* Shelters Chip */}
        <button
          type="button"
          onClick={() => setFilterCategory('shelters')}
          className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
            filterCategory === 'shelters'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-[#F3EDF7] text-blue-800 hover:bg-[#E7E0EC]'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>In Shelter ({shelterCount})</span>
        </button>

        {/* Needs Help Chip */}
        <button
          type="button"
          onClick={() => setFilterCategory('help')}
          className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
            filterCategory === 'help'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Needs Help ({helpCount})</span>
        </button>
      </div>

      {/* ================= 3. SAFETY RECORDS LIST ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
            Resident Check-In Reports
          </span>
          <span className="text-xs font-semibold text-slate-600">
            Showing {filteredRecords.length} records
          </span>
        </div>

        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center space-y-2 border border-slate-100">
              <p className="text-xs font-bold text-[#1C1B1F]">No Check-In Reports in Database</p>
              <p className="text-xs text-[#49454F]">
                When villagers or members tap "Mark I Am Safe" or "Voice SOS", their real-time reports are saved in Firestore and appear here automatically.
              </p>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const isNeedsHelp = rec.status === 'needs_help' || rec.status === 'in_flooding';
              const isSafe = rec.status === 'safe';
              const isShelter = rec.status === 'evacuated' || rec.message?.toLowerCase().includes('shelter');
              const hasVoice = rec.hasVoiceNote || !!rec.voiceAudioBase64 || rec.voiceDurationSec;
              const durationLabel = rec.voiceDurationSec ? `${rec.voiceDurationSec}s` : '11s';

              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl p-4 border transition shadow-xs space-y-2.5 ${
                    isNeedsHelp
                      ? 'bg-red-50 border-red-200'
                      : isShelter
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  {/* Top Bar: Resident Name + Status Badge + Family Size */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isNeedsHelp
                            ? 'bg-red-600 text-white'
                            : isShelter
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isNeedsHelp ? (
                          <AlertTriangle className="w-5 h-5 animate-pulse" />
                        ) : isShelter ? (
                          <Home className="w-5 h-5" />
                        ) : (
                          <UserCheck className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-[#1C1B1F] leading-tight">
                          {rec.userName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#49454F] font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            <span>{rec.village}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>{rec.formattedTime || 'Recent'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {isNeedsHelp && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-red-200 text-red-900">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          <span>Needs Help</span>
                        </span>
                      )}

                      {isSafe && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-emerald-100 text-emerald-900">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>Safe</span>
                        </span>
                      )}

                      {isShelter && !isNeedsHelp && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-blue-100 text-blue-900">
                          <Home className="w-3 h-3 shrink-0" />
                          <span>In Shelter</span>
                        </span>
                      )}

                      <span className="text-[11px] bg-[#F3EDF7] text-[#1D192B] px-2.5 py-0.5 rounded-full font-bold">
                        {rec.peopleCount || 1} {(rec.peopleCount || 1) === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>

                  {/* Message body */}
                  {rec.message && (
                    <p className="text-xs text-[#1C1B1F] bg-white/80 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed font-medium">
                      {rec.message}
                    </p>
                  )}

                  {/* Action Buttons: Voice Player + Call Resident + Delete */}
                  <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-200/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasVoice && (
                        <button
                          type="button"
                          onClick={() => toggleAudio(rec.id, rec.voiceAudioBase64, rec.voiceDurationSec || 3)}
                          className="flex items-center gap-1.5 bg-[#1F71E8] hover:bg-blue-700 active:scale-95 text-white px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                          {isPlayingAudio === rec.id ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>
                            {isPlayingAudio === rec.id
                              ? 'Playing Voice...'
                              : `Play Voice SOS (${durationLabel})`}
                          </span>
                        </button>
                      )}

                      {rec.phone && (
                        <a
                          href={`tel:${rec.phone.replace(/\s+/g, '')}`}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Resident</span>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id, rec.userName)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
