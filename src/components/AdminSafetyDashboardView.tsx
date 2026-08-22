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
  Navigation,
  ExternalLink,
  Copy,
  X,
  Map as MapIcon,
  Compass,
  MessageSquare,
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
  onOpenSmsModal?: () => void;
}

export const AdminSafetyDashboardView: React.FC<AdminSafetyDashboardViewProps> = ({
  safetyReports,
  currentUser,
  selectedVillage = 'Dzenje Village',
  onSelectVillage,
  onOpenCheckInModal,
  onOpenDirectVoiceSOS,
  onOpenSmsModal,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'safe' | 'shelters' | 'help'>('all');
  const [villageFilter, setVillageFilter] = useState<string>('all');
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [selectedReportForMap, setSelectedReportForMap] = useState<ResidentSafetyReport | null>(null);
  const [showOverviewMap, setShowOverviewMap] = useState(false);
  const [copiedGps, setCopiedGps] = useState(false);

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
      if (selectedReportForMap?.id === id) {
        setSelectedReportForMap(null);
      }
      await firebaseFloodService.deleteSafetyReport(id);
    }
  };

  const handleCopyCoordinates = (lat: number, lng: number) => {
    try {
      navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setCopiedGps(true);
      setTimeout(() => setCopiedGps(false), 2000);
    } catch {
      // fallback
    }
  };

  const activeReportsList = safetyReports;

  // Counts for summary metrics and filter pills
  const safeCount = activeReportsList.filter((r) => r.status === 'safe').length;
  const shelterCount = activeReportsList.filter((r) => r.status === 'evacuated' || r.message?.toLowerCase().includes('shelter')).length;
  const helpCount = activeReportsList.filter((r) => r.status === 'needs_help' || r.status === 'in_flooding').length;
  const reportsWithGps = activeReportsList.filter((r) => r.latitude !== undefined && r.longitude !== undefined);

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

        {/* Admin Overview Footer Indicator + View All on Map Button & SMS Broadcast */}
        <div className="flex items-center justify-between text-xs text-[#49454F] pt-1 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-medium">Admin Monitoring View</span>
            <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Live Firestore Data
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSmsModal && (
              <button
                type="button"
                id="btn-admin-sms-broadcast"
                onClick={onOpenSmsModal}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Africa's Talking SMS</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowOverviewMap(true)}
              className="flex items-center gap-1.5 bg-[#1F71E8] hover:bg-blue-700 active:scale-95 text-white px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Village Map ({reportsWithGps.length} GPS)</span>
            </button>
          </div>
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

                  {/* GPS Attached Badge if present */}
                  {rec.latitude !== undefined && rec.longitude !== undefined && (
                    <div className="flex items-center justify-between gap-2 bg-blue-50/80 px-3 py-2 rounded-xl border border-blue-200/70 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="font-bold text-[#1C1B1F] truncate">
                          GPS Attached: {rec.latitude.toFixed(4)}, {rec.longitude.toFixed(4)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedReportForMap(rec)}
                        className="px-2.5 py-1 rounded-lg bg-[#1F71E8] hover:bg-blue-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition cursor-pointer shadow-2xs"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>View Map</span>
                      </button>
                    </div>
                  )}

                  {/* Action Buttons: Voice Player + Call Resident + View Map + Delete */}
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
                          <span>Call</span>
                        </a>
                      )}

                      {rec.latitude !== undefined && rec.longitude !== undefined && (
                        <button
                          type="button"
                          onClick={() => setSelectedReportForMap(rec)}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Map Location</span>
                        </button>
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

      {/* ================= 4. SINGLE RESIDENT LOCATION MAP MODAL ================= */}
      {selectedReportForMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-[#F3F3FA]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shadow-xs shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
                    {selectedReportForMap.userName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#49454F] font-medium mt-0.5">
                    <span>{selectedReportForMap.village}</span>
                    <span>•</span>
                    <span>{selectedReportForMap.formattedTime || 'Recent'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReportForMap(null)}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Status Badge & Headcount */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    selectedReportForMap.status === 'needs_help' || selectedReportForMap.status === 'in_flooding'
                      ? 'bg-red-100 text-red-900 border border-red-200'
                      : selectedReportForMap.status === 'evacuated' || selectedReportForMap.message?.toLowerCase().includes('shelter')
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {selectedReportForMap.status === 'needs_help'
                      ? 'Needs Rescue Help'
                      : selectedReportForMap.status === 'in_flooding'
                      ? 'In Flooding Area'
                      : selectedReportForMap.status === 'evacuated'
                      ? 'In Evacuation Shelter'
                      : 'Safe at Home'}
                  </span>
                </span>

                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  {selectedReportForMap.peopleCount || 1} {(selectedReportForMap.peopleCount || 1) === 1 ? 'Person' : 'People'}
                </span>
              </div>

              {/* Resident Note if present */}
              {selectedReportForMap.message && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-[#1C1B1F] font-medium leading-relaxed">
                  <span className="text-slate-500 font-bold block mb-0.5">Note from resident:</span>
                  {selectedReportForMap.message}
                </div>
              )}

              {/* Embedded Live Map */}
              {selectedReportForMap.latitude !== undefined && selectedReportForMap.longitude !== undefined ? (
                <div className="space-y-2">
                  <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner">
                    <iframe
                      title="Resident GPS Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedReportForMap.longitude - 0.012}%2C${selectedReportForMap.latitude - 0.009}%2C${selectedReportForMap.longitude + 0.012}%2C${selectedReportForMap.latitude + 0.009}&layer=mapnik&marker=${selectedReportForMap.latitude}%2C${selectedReportForMap.longitude}`}
                      className="w-full h-full"
                    />
                  </div>

                  {/* GPS Coordinates Bar & Quick Copy */}
                  <div className="bg-[#F3EDF7] rounded-2xl p-3 flex items-center justify-between gap-2 border border-slate-200">
                    <div className="min-w-0">
                      <span className="text-[11px] text-[#49454F] font-bold block uppercase tracking-wider">
                        GPS Coordinates
                      </span>
                      <span className="text-xs font-bold text-[#1C1B1F]">
                        {selectedReportForMap.latitude.toFixed(5)}, {selectedReportForMap.longitude.toFixed(5)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyCoordinates(
                          selectedReportForMap.latitude!,
                          selectedReportForMap.longitude!
                        )
                      }
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#1C1B1F] rounded-full text-xs font-bold flex items-center gap-1 border border-slate-300 transition cursor-pointer shadow-2xs"
                    >
                      {copiedGps ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy GPS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#1C1B1F]">No exact GPS attached</p>
                  <p className="text-xs text-[#49454F] mt-1">
                    Resident reported safety status without attaching GPS coordinates.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {selectedReportForMap.latitude !== undefined && selectedReportForMap.longitude !== undefined && (
                  <a
                    href={
                      selectedReportForMap.mapsUrl ||
                      `https://www.google.com/maps/search/?api=1&query=${selectedReportForMap.latitude},${selectedReportForMap.longitude}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-2xl bg-[#1F71E8] hover:bg-blue-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in Google Maps (Directions & Navigation)</span>
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {selectedReportForMap.phone && (
                    <a
                      href={`tel:${selectedReportForMap.phone.replace(/\s+/g, '')}`}
                      className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call ({selectedReportForMap.phone})</span>
                    </a>
                  )}

                  {selectedReportForMap.hasVoiceNote && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleAudio(
                          selectedReportForMap.id,
                          selectedReportForMap.voiceAudioBase64,
                          selectedReportForMap.voiceDurationSec || 3
                        )
                      }
                      className="py-2.5 px-3 rounded-2xl bg-[#1F71E8] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                      {isPlayingAudio === selectedReportForMap.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>
                        {isPlayingAudio === selectedReportForMap.id
                          ? 'Playing Voice...'
                          : 'Play Voice SOS'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. ALL VILLAGES OVERVIEW SAFETY MAP MODAL ================= */}
      {showOverviewMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[28px] overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-[#F3F3FA]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shadow-xs shrink-0">
                  <MapIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
                    Village Safety Map Overview
                  </h3>
                  <p className="text-xs text-[#49454F] font-medium mt-0.5">
                    {reportsWithGps.length} residents with active GPS locations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOverviewMap(false)}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Interactive Regional Map Embed */}
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner">
                <iframe
                  title="All Villages Safety Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=35.5100%2C-16.0300%2C35.5800%2C-15.9500&layer=mapnik`}
                  className="w-full h-full"
                />
              </div>

              {/* Residents with GPS List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#49454F] uppercase tracking-wider">
                  <span>Residents with GPS Pins</span>
                  <span>{reportsWithGps.length} Total</span>
                </div>

                {reportsWithGps.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <p className="text-xs text-[#49454F]">
                      No residents have attached GPS coordinates yet. When villagers check in with "Attach GPS", their pins appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {reportsWithGps.map((rep) => (
                      <div
                        key={rep.id}
                        onClick={() => {
                          setShowOverviewMap(false);
                          setSelectedReportForMap(rep);
                        }}
                        className="bg-[#F3F3FA] hover:bg-[#E7E0EC] p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                              rep.status === 'needs_help' || rep.status === 'in_flooding'
                                ? 'bg-red-600'
                                : rep.status === 'evacuated'
                                ? 'bg-blue-600'
                                : 'bg-emerald-600'
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#1C1B1F] block truncate">
                              {rep.userName}
                            </span>
                            <span className="text-[11px] text-[#49454F] block">
                              {rep.village} • {rep.latitude?.toFixed(4)}, {rep.longitude?.toFixed(4)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-white text-[#1F71E8] font-bold text-[11px] border border-slate-200 shrink-0">
                          View Pin
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
