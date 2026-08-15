import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  LifeBuoy,
  Home,
  Users,
  Phone,
  MapPin,
  ExternalLink,
  Search,
  Filter,
  Download,
  Activity,
  CheckCircle,
  RefreshCw,
  Clock,
  Radio,
  FileSpreadsheet,
  Mic,
  Play,
  Pause,
  Volume2,
  Trash2,
  BellRing,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { ResidentSafetyReport, FloodAlert, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface AdminSafetyDashboardViewProps {
  safetyReports: ResidentSafetyReport[];
  alerts: FloodAlert[];
  currentUser: UserProfile | null;
  isDarkMode: boolean;
  onOpenCheckInModal?: () => void;
  onGoToSensors?: () => void;
}

export const AdminSafetyDashboardView: React.FC<AdminSafetyDashboardViewProps> = ({
  safetyReports,
  alerts,
  currentUser,
  isDarkMode,
  onOpenCheckInModal,
  onGoToSensors,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVillage, setFilterVillage] = useState<string>('all');
  const [filterOnlyVoice, setFilterOnlyVoice] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingReportId, setPlayingReportId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleDeleteReport = async (reportId: string, userName: string) => {
    if (window.confirm(`Delete safety report for "${userName}" from Firebase Firestore?`)) {
      setDeletingId(reportId);
      try {
        if (playingReportId === reportId && activeAudioRef.current) {
          activeAudioRef.current.pause();
          setPlayingReportId(null);
        }
        await firebaseFloodService.deleteSafetyReport(reportId);
      } catch (err) {
        console.error('Failed to delete report:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleClearAllReports = async () => {
    if (window.confirm('Are you sure you want to clear ALL resident roll-call records from Firebase Firestore and local storage?')) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setPlayingReportId(null);
      }
      await firebaseFloodService.clearSafetyReports();
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (window.confirm('Delete this flood alert incident record from Firebase Firestore?')) {
      await firebaseFloodService.deleteAlert(alertId);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlayVoice = (reportId: string, audioBase64?: string) => {
    if (!audioBase64) return;

    if (playingReportId === reportId && activeAudioRef.current) {
      activeAudioRef.current.pause();
      setPlayingReportId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(audioBase64);
    activeAudioRef.current = audio;
    setPlayingReportId(reportId);

    audio.onended = () => {
      setPlayingReportId(null);
    };

    audio.onerror = () => {
      setPlayingReportId(null);
      alert('Could not play audio clip.');
    };

    audio.play().catch((err) => {
      console.warn('Audio play error:', err);
      setPlayingReportId(null);
    });
  };

  // Summary Metrics
  const totalReports = safetyReports.length;
  const totalPeopleAccounted = safetyReports.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  const safeReports = safetyReports.filter((r) => r.status === 'safe');
  const safePeople = safeReports.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  const evacuatedReports = safetyReports.filter((r) => r.status === 'evacuated');
  const evacuatedPeople = evacuatedReports.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  const inFloodingReports = safetyReports.filter((r) => r.status === 'in_flooding');
  const inFloodingPeople = inFloodingReports.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  const needsHelpReports = safetyReports.filter((r) => r.status === 'needs_help');
  const needsHelpPeople = needsHelpReports.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  const voiceReportsCount = safetyReports.filter((r) => r.voiceAudioBase64 || r.hasVoiceNote).length;

  // Urgent Rescue Queue
  const urgentQueue = safetyReports.filter(
    (r) => r.status === 'needs_help' || r.status === 'in_flooding'
  );

  // Distinct Villages
  const villages = Array.from(new Set(safetyReports.map((r) => r.village).filter(Boolean)));

  // Filtered Reports
  const filteredReports = safetyReports.filter((report) => {
    if (filterStatus !== 'all' && report.status !== filterStatus) return false;
    if (filterVillage !== 'all' && report.village !== filterVillage) return false;
    if (filterOnlyVoice && !report.voiceAudioBase64 && !report.hasVoiceNote) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = report.userName.toLowerCase().includes(q);
      const matchVillage = report.village.toLowerCase().includes(q);
      const matchMsg = report.message?.toLowerCase().includes(q);
      const matchPhone = report.phone?.includes(q);
      if (!matchName && !matchVillage && !matchMsg && !matchPhone) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Resident Name', 'Village', 'Status', 'Headcount', 'Phone', 'Has Voice Note', 'Message', 'GPS Location', 'Time'];
    const rows = safetyReports.map((r) => [
      `"${r.userName.replace(/"/g, '""')}"`,
      `"${r.village.replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.peopleCount || 1,
      `"${r.phone || ''}"`,
      `"${r.voiceAudioBase64 || r.hasVoiceNote ? 'Yes (Audio Recorded)' : 'No'}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${r.latitude && r.longitude ? `${r.latitude},${r.longitude}` : ''}"`,
      `"${new Date(r.timestamp).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flood_safety_rollcall_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-safety-dashboard" className="space-y-4 pb-12">
      {/* 1. Header & Emergency Mode Banner */}
      <div
        className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <img
            src="/icon.svg"
            alt="App Icon"
            className="w-12 h-12 rounded-2xl shrink-0 shadow-xs border border-black/5"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]">
                Admin Safety Center
              </span>
              <span className="flex items-center gap-1 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                <Radio className="w-3.5 h-3.5 text-[#137333] dark:text-[#81C995]" /> Live Roll-Call &amp; Voice SOS
              </span>
            </div>
            <h1 className="text-lg font-bold">Village Safety &amp; Rescue Dashboard</h1>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Real-time roll-call of residents marked Safe, Evacuated, or In Flooding with live voice notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {onGoToSensors && (
            <button
              type="button"
              id="admin-nav-goto-sensors-btn"
              onClick={onGoToSensors}
              className="px-3.5 py-2 text-xs font-bold rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>← Open Flood Sensors</span>
            </button>
          )}

          <button
            id="export-rollcall-csv-btn"
            onClick={exportCSV}
            className="px-3.5 py-2 text-xs font-semibold rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#28292C] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {safetyReports.length > 0 && (
            <button
              id="admin-clear-rollcall-btn"
              onClick={handleClearAllReports}
              className="px-3.5 py-2 text-xs font-semibold rounded-full bg-[#FCE8E6] text-[#D93025] dark:bg-red-950/40 dark:text-red-300 transition-colors flex items-center gap-1.5"
              title="Clear all resident safety records from database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Roll-Call</span>
            </button>
          )}

          {onOpenCheckInModal && (
            <button
              id="admin-record-status-btn"
              onClick={onOpenCheckInModal}
              className="px-4 py-2 text-xs font-bold rounded-full bg-[#137333] hover:bg-[#0F9D58] text-white flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Record Check-in</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Safe */}
        <div
          id="kpi-safe"
          className={`p-3.5 rounded-[20px] border flex flex-col justify-between ${
            isDarkMode ? 'bg-[#1E1F20] border-[#303134]' : 'bg-[#E6F4EA] border-[#CEEAD6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#137333] dark:text-[#81C995]">Marked Safe</span>
            <div className="w-7 h-7 rounded-lg bg-[#137333]/15 text-[#137333] dark:text-[#81C995] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#137333] dark:text-[#81C995]">{safeReports.length}</div>
            <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">
              {safePeople} people accounted for
            </div>
          </div>
        </div>

        {/* Evacuated */}
        <div
          id="kpi-evacuated"
          className={`p-3.5 rounded-[20px] border flex flex-col justify-between ${
            isDarkMode ? 'bg-[#1E1F20] border-[#303134]' : 'bg-[#E8F0FE] border-[#D2E3FC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1967D2] dark:text-[#8AB4F8]">Evacuated / Shelters</span>
            <div className="w-7 h-7 rounded-lg bg-[#1A73E8]/15 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-400">{evacuatedReports.length}</div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {evacuatedPeople} people in safe zones
            </div>
          </div>
        </div>

        {/* In Flooding */}
        <div
          id="kpi-in-flooding"
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-zinc-900/80 border-amber-900/30' : 'bg-amber-50/60 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">In Flooding</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-400">{inFloodingReports.length}</div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {inFloodingPeople} people under watch
            </div>
          </div>
        </div>

        {/* Urgent Help */}
        <div
          id="kpi-needs-help"
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            needsHelpReports.length > 0
              ? 'bg-red-950/40 border-red-500/50 animate-pulse ring-1 ring-red-500/30'
              : isDarkMode
              ? 'bg-zinc-900/80 border-zinc-800'
              : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400">Rescue Needed</span>
            <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-red-400">{needsHelpReports.length}</div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {needsHelpPeople} people in critical danger
            </div>
          </div>
        </div>
      </div>

      {/* 3. High Priority Emergency Rescue Queue */}
      {urgentQueue.length > 0 && (
        <div
          id="admin-urgent-rescue-queue"
          className={`p-4 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50/80 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-sm font-bold text-red-400">
                Priority Rescue & Flooding Queue ({urgentQueue.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">Requires Dispatch / Call</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentQueue.map((item) => {
              const isPlayingThis = playingReportId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                    item.status === 'needs_help'
                      ? 'bg-red-900/30 border-red-500/40 text-red-100'
                      : 'bg-amber-900/20 border-amber-500/40 text-amber-100'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-zinc-100">{item.userName}</div>
                        <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-400" />
                          <span>{item.village}</span>
                          <span>•</span>
                          <Users className="w-3 h-3 text-zinc-400" />
                          <span className="font-semibold">{item.peopleCount || 1} people</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'needs_help'
                            ? 'bg-red-500 text-white animate-bounce'
                            : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {item.status === 'needs_help' ? 'Rescue SOS' : 'In Flooding'}
                      </span>
                    </div>

                    {item.message && (
                      <p className="mt-2 text-xs text-zinc-200 bg-black/30 p-2 rounded-lg italic">
                        "{item.message}"
                      </p>
                    )}

                    {/* Voice Audio Player if Voice Note Attached */}
                    {item.voiceAudioBase64 && (
                      <div className="mt-2 p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayVoice(item.id, item.voiceAudioBase64)}
                            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
                          >
                            {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>
                          <div>
                            <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                              <Mic className="w-3 h-3 text-indigo-400" />
                              <span>{isPlayingThis ? 'Playing Voice Note...' : 'Resident Voice Clip'}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {item.voiceDurationSec ? `${item.voiceDurationSec}s audio duration` : 'Tap to listen to resident'}
                            </span>
                          </div>
                        </div>

                        {isPlayingThis && (
                          <div className="flex items-center gap-0.5 h-4">
                            <span className="w-1 bg-indigo-400 rounded-full h-3 animate-pulse" />
                            <span className="w-1 bg-indigo-400 rounded-full h-4 animate-bounce" />
                            <span className="w-1 bg-indigo-400 rounded-full h-2 animate-pulse" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call {item.phone}</span>
                      </a>
                    )}

                    {item.mapsUrl ? (
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>GPS Map</span>
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(item.id, item.userName)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs transition-colors"
                      title="Delete this rescue record from Firestore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[10px] text-zinc-400 ml-auto whitespace-nowrap">
                      {item.formattedTime}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Filter & Search Controls */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row gap-2.5 items-center justify-between ${
          isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search residents, village, note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
              isDarkMode
                ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-xl border outline-none font-medium ${
              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
            }`}
          >
            <option value="all">All Statuses ({totalReports})</option>
            <option value="safe">Safe Only ({safeReports.length})</option>
            <option value="evacuated">Evacuated Only ({evacuatedReports.length})</option>
            <option value="in_flooding">In Flooding ({inFloodingReports.length})</option>
            <option value="needs_help">Rescue SOS ({needsHelpReports.length})</option>
          </select>

          {/* Village Filter */}
          {villages.length > 0 && (
            <select
              value={filterVillage}
              onChange={(e) => setFilterVillage(e.target.value)}
              className={`px-3 py-1.5 text-xs rounded-xl border outline-none font-medium ${
                isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
              }`}
            >
              <option value="all">All Villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}

          {/* Voice Notes Filter Button */}
          <button
            type="button"
            onClick={() => setFilterOnlyVoice(!filterOnlyVoice)}
            className={`px-3 py-1.5 text-xs rounded-xl border flex items-center gap-1.5 font-medium transition-all ${
              filterOnlyVoice
                ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                : isDarkMode
                ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span>Voice Notes {voiceReportsCount > 0 && `(${voiceReportsCount})`}</span>
          </button>
        </div>
      </div>

      {/* 5. Complete Resident Roll-Call Table & Records List */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDarkMode ? 'border-[#303134] bg-[#1E1F20]' : 'border-[#E1E3E1] bg-[#F8F9FA]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
              Resident Safety Roll-Call Records ({filteredReports.length})
            </h3>
          </div>
          <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-medium">
            Total People: <strong className="text-[#1F1F1F] dark:text-white">{totalPeopleAccounted}</strong>
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-[#5F6368] dark:text-[#9AA0A6] text-xs">
            No safety reports found matching current filters.
          </div>
        ) : (
          <div className="divide-y divide-[#E1E3E1] dark:divide-[#303134]">
            {filteredReports.map((report) => {
              const isSafe = report.status === 'safe';
              const isEvacuated = report.status === 'evacuated';
              const isInFlooding = report.status === 'in_flooding';
              const isNeedsHelp = report.status === 'needs_help';
              const isPlayingThis = playingReportId === report.id;

              return (
                <div
                  key={report.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F1F3F4] dark:hover:bg-[#28292C] transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">{report.userName}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          isSafe
                            ? 'bg-[#E6F4EA] text-[#0D652D] border border-[#CEEAD6]'
                            : isEvacuated
                            ? 'bg-[#E8F0FE] text-[#1557B0] border border-[#D2E3FC]'
                            : isInFlooding
                            ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                            : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] animate-pulse'
                        }`}
                      >
                        {isSafe && <ShieldCheck className="w-3 h-3" />}
                        {isEvacuated && <Home className="w-3 h-3" />}
                        {isInFlooding && <AlertTriangle className="w-3 h-3" />}
                        {isNeedsHelp && <LifeBuoy className="w-3 h-3" />}
                        <span>
                          {isSafe
                            ? 'Safe'
                            : isEvacuated
                            ? 'Evacuated'
                            : isInFlooding
                            ? 'In Flooding'
                            : 'Needs Rescue'}
                        </span>
                      </span>

                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#F1F3F4] dark:bg-[#28292C] text-[#3C4043] dark:text-[#E3E3E3] font-mono font-medium">
                        {report.peopleCount || 1} {report.peopleCount === 1 ? 'person' : 'people'}
                      </span>

                      {report.voiceAudioBase64 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] dark:bg-indigo-950/40 dark:text-indigo-300 border border-[#D2E3FC] flex items-center gap-1 font-semibold">
                          <Mic className="w-3 h-3 text-[#1A73E8]" />
                          <span>Voice Note Attached</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D93025]" />
                        <span>{report.village}</span>
                      </span>

                      {report.phone && (
                        <span className="flex items-center gap-1 font-mono text-[#3C4043] dark:text-[#E3E3E3]">
                          <Phone className="w-3 h-3 text-[#1A73E8]" />
                          <span>{report.phone}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[#5F6368] dark:text-[#9AA0A6]">
                        <Clock className="w-3 h-3" />
                        <span>{report.formattedTime}</span>
                      </span>
                    </div>

                    {report.message && (
                      <p className="text-xs text-[#1F1F1F] dark:text-[#E3E3E3] pt-0.5 max-w-xl font-medium">
                        "{report.message}"
                      </p>
                    )}

                    {/* Inline Voice Player */}
                    {report.voiceAudioBase64 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePlayVoice(report.id, report.voiceAudioBase64)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                            isPlayingThis
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30'
                              : isDarkMode
                              ? 'bg-zinc-800/80 border-indigo-500/30 text-indigo-300 hover:bg-zinc-700'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span>{isPlayingThis ? 'Playing Resident Voice...' : 'Listen to Voice Message'}</span>
                          {report.voiceDurationSec ? (
                            <span className="text-[10px] opacity-75">({report.voiceDurationSec}s)</span>
                          ) : null}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {report.phone && (
                      <a
                        href={`tel:${report.phone}`}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 text-xs flex items-center gap-1 transition-colors"
                        title="Call Resident"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline font-medium">Call</span>
                      </a>
                    )}

                    {report.mapsUrl && (
                      <a
                        href={report.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs flex items-center gap-1 transition-colors"
                        title="View GPS Location"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span className="hidden sm:inline font-medium">Location</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id, report.userName)}
                      disabled={deletingId === report.id}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-800/40 text-xs flex items-center gap-1 transition-colors"
                      title="Delete record from Firestore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Flood Incident Telemetry & Log Management */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-100 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Flood Alarm Incidents in Database ({alerts.length})
            </h3>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all flood alert incidents from database?')) {
                  firebaseFloodService.clearAlerts();
                }
              }}
              className="text-[11px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Incidents</span>
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="p-6 text-center text-zinc-400 text-xs">
            No flood alarm incidents recorded. All clear.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50 max-h-60 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/20 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === 'yellow'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {alert.severity === 'yellow' ? 'Warning' : 'Critical'}
                    </span>
                    <span className="font-bold text-zinc-200 truncate">{alert.title || 'Flood Alert'}</span>
                    <span className="font-mono text-[10px] text-zinc-400">Δ {alert.peakDelta.toFixed(2)} m/s²</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {alert.locationLabel || alert.village || 'River Node'} • {alert.formattedTime} • Source: {alert.source}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-800/40 text-xs transition-colors shrink-0"
                  title="Delete incident from Firestore"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
