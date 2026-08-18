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
  Download,
  Activity,
  Radio,
  Mic,
  Play,
  Pause,
  Trash2,
  BellRing,
  X,
  Clock,
  Plus,
  ArrowUpRight,
  Filter,
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
    if (window.confirm(`Delete safety report for "${userName}"?`)) {
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
    if (
      window.confirm(
        'Are you sure you want to clear ALL resident safety records from the database?'
      )
    ) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setPlayingReportId(null);
      }
      await firebaseFloodService.clearSafetyReports();
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (window.confirm('Delete this flood alert record?')) {
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
      alert('Could not play voice clip.');
    };

    audio.play().catch((err) => {
      console.warn('Audio play error:', err);
      setPlayingReportId(null);
    });
  };

  // Summary Metrics
  const totalReports = safetyReports.length;
  const totalPeopleAccounted = safetyReports.reduce(
    (acc, r) => acc + (r.peopleCount || 1),
    0
  );

  const safeReports = safetyReports.filter((r) => r.status === 'safe');
  const safePeople = safeReports.reduce((acc, r) => acc + (r.peopleCount || 1), 0);

  const evacuatedReports = safetyReports.filter((r) => r.status === 'evacuated');
  const evacuatedPeople = evacuatedReports.reduce(
    (acc, r) => acc + (r.peopleCount || 1),
    0
  );

  const inFloodingReports = safetyReports.filter((r) => r.status === 'in_flooding');
  const inFloodingPeople = inFloodingReports.reduce(
    (acc, r) => acc + (r.peopleCount || 1),
    0
  );

  const needsHelpReports = safetyReports.filter((r) => r.status === 'needs_help');
  const needsHelpPeople = needsHelpReports.reduce(
    (acc, r) => acc + (r.peopleCount || 1),
    0
  );

  const voiceReportsCount = safetyReports.filter(
    (r) => r.voiceAudioBase64 || r.hasVoiceNote
  ).length;

  // Urgent Rescue Queue
  const urgentQueue = safetyReports.filter(
    (r) => r.status === 'needs_help' || r.status === 'in_flooding'
  );

  // Distinct Villages
  const villages = Array.from(
    new Set(safetyReports.map((r) => r.village).filter(Boolean))
  );

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
    const headers = [
      'Resident Name',
      'Village',
      'Status',
      'People Count',
      'Phone',
      'Has Voice Clip',
      'Message',
      'GPS Location',
      'Time',
    ];
    const rows = safetyReports.map((r) => [
      `"${r.userName.replace(/"/g, '""')}"`,
      `"${r.village.replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.peopleCount || 1,
      `"${r.phone || ''}"`,
      `"${r.voiceAudioBase64 || r.hasVoiceNote ? 'Yes' : 'No'}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${r.latitude && r.longitude ? `${r.latitude},${r.longitude}` : ''}"`,
      `"${new Date(r.timestamp).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `village_safety_records_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-safety-dashboard" className="space-y-4 pb-16">
      {/* 1. Google Material 3 Header Card */}
      <div
        id="dashboard-header-card"
        className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src="/icon.svg"
              alt="Flood Alert App Icon"
              className="w-12 h-12 rounded-2xl shrink-0 border border-black/5 shadow-2xs"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1A73E8] dark:bg-[#8AB4F8]" />
                  Village Safety Dashboard
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#137333] dark:text-[#81C995]" />
                  Live Network
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight">
                Village Safety &amp; Rescue Overview
              </h1>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                See which families are safe, who moved to shelters, and who needs help.
              </p>
            </div>
          </div>

          {/* Action Buttons (Google Material 3 Pills) */}
          <div className="flex items-center gap-2 flex-wrap">
            {onGoToSensors && (
              <button
                type="button"
                id="admin-nav-goto-sensors-btn"
                onClick={onGoToSensors}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <Activity className="w-3.5 h-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
                <span>Flood Sensors</span>
              </button>
            )}

            <button
              type="button"
              id="export-rollcall-csv-btn"
              onClick={exportCSV}
              className="px-4 py-2 text-xs font-semibold rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] transition-colors flex items-center gap-1.5 active:scale-95"
              title="Download safety list as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download List</span>
            </button>

            {safetyReports.length > 0 && (
              <button
                type="button"
                id="admin-clear-rollcall-btn"
                onClick={handleClearAllReports}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-[#FCE8E6] hover:bg-[#FAD2CF] text-[#D93025] dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:text-red-300 transition-colors flex items-center gap-1.5 active:scale-95"
                title="Clear all saved records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            {onOpenCheckInModal && (
              <button
                type="button"
                id="admin-record-status-btn"
                onClick={onOpenCheckInModal}
                className="px-4 py-2 text-xs font-bold rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Check-in</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Google Tonal Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Marked Safe (Google Green) */}
        <div
          id="kpi-safe"
          className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-[#E6F4EA] border-[#CEEAD6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#137333] dark:text-[#81C995]">
              Safe at Home
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#137333]/15 text-[#137333] dark:text-[#81C995] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#137333] dark:text-[#81C995]">
              {safeReports.length}
            </div>
            <p className="text-[11px] text-[#3C4043] dark:text-[#9AA0A6] font-medium mt-0.5">
              {safePeople} {safePeople === 1 ? 'person' : 'people'} safe
            </p>
          </div>
        </div>

        {/* KPI 2: Evacuated (Google Blue) */}
        <div
          id="kpi-evacuated"
          className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-[#E8F0FE] border-[#D2E3FC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1967D2] dark:text-[#8AB4F8]">
              At Safe Shelters
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#1A73E8]/15 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1967D2] dark:text-[#8AB4F8]">
              {evacuatedReports.length}
            </div>
            <p className="text-[11px] text-[#3C4043] dark:text-[#9AA0A6] font-medium mt-0.5">
              {evacuatedPeople} {evacuatedPeople === 1 ? 'person' : 'people'} moved
            </p>
          </div>
        </div>

        {/* KPI 3: In Flooding (Google Amber / Warning) */}
        <div
          id="kpi-in-flooding"
          className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-[#FEF7E0] border-[#FEEFC3]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#B06000] dark:text-[#FDD663]">
              Water Rising
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#B06000]/15 text-[#B06000] dark:text-[#FDD663] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#B06000] dark:text-[#FDD663]">
              {inFloodingReports.length}
            </div>
            <p className="text-[11px] text-[#3C4043] dark:text-[#9AA0A6] font-medium mt-0.5">
              {inFloodingPeople} {inFloodingPeople === 1 ? 'person' : 'people'} watching water
            </p>
          </div>
        </div>

        {/* KPI 4: Need Help (Google Red / Critical) */}
        <div
          id="kpi-needs-help"
          className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
            needsHelpReports.length > 0
              ? 'bg-[#FCE8E6] border-[#D93025] ring-2 ring-[#D93025]/30'
              : isDarkMode
              ? 'bg-[#1E1F20] border-[#303134]'
              : 'bg-white border-[#E1E3E1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D93025] dark:text-[#F28B82]">
              Need Help Now
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#D93025]/15 text-[#D93025] dark:text-[#F28B82] flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#D93025] dark:text-[#F28B82]">
              {needsHelpReports.length}
            </div>
            <p className="text-[11px] text-[#3C4043] dark:text-[#9AA0A6] font-medium mt-0.5">
              {needsHelpPeople} {needsHelpPeople === 1 ? 'person' : 'people'} need rescue
            </p>
          </div>
        </div>
      </div>

      {/* 3. Urgent Rescue & Flooding Queue (Google Crisis Action Cards) */}
      {urgentQueue.length > 0 && (
        <div
          id="admin-urgent-rescue-queue"
          className={`p-5 rounded-3xl border space-y-3 transition-all ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#D93025]/50'
              : 'bg-[#FCE8E6] border-[#FAD2CF]'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D93025] animate-ping shrink-0" />
              <h2 className="text-sm font-bold text-[#D93025] dark:text-[#F28B82]">
                Urgent Help Needed ({urgentQueue.length} {urgentQueue.length === 1 ? 'resident' : 'residents'})
              </h2>
            </div>
            <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Please call or send rescue teams to these locations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentQueue.map((item) => {
              const isPlayingThis = playingReportId === item.id;
              const isEmergency = item.status === 'needs_help';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                    isDarkMode
                      ? isEmergency
                        ? 'bg-[#2D1B1B] border-[#D93025]/60 text-white'
                        : 'bg-[#2A2318] border-[#B06000]/60 text-white'
                      : isEmergency
                      ? 'bg-white border-[#FAD2CF] text-[#1F1F1F] shadow-xs'
                      : 'bg-white border-[#FEEFC3] text-[#1F1F1F] shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base">{item.userName}</h3>
                        <div className="text-xs text-[#5F6368] dark:text-[#C4C7C5] flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-[#D93025] dark:text-[#F28B82]">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{item.village}</span>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Users className="w-3.5 h-3.5" />
                            <span>{item.peopleCount || 1} people</span>
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isEmergency
                            ? 'bg-[#D93025] text-white'
                            : 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#B06000]/30 dark:text-[#FDD663] border border-[#FEEFC3] dark:border-[#B06000]/50'
                        }`}
                      >
                        {isEmergency ? 'Need Rescue' : 'Water Rising'}
                      </span>
                    </div>

                    {item.message && (
                      <p className="text-xs text-[#3C4043] dark:text-[#E3E3E3] bg-[#F1F3F4] dark:bg-black/30 p-2.5 rounded-xl font-medium">
                        "{item.message}"
                      </p>
                    )}

                    {/* Google-style Voice Player Button */}
                    {item.voiceAudioBase64 && (
                      <div className="p-2.5 rounded-xl bg-[#E8F0FE] dark:bg-[#1A73E8]/20 border border-[#D2E3FC] dark:border-[#1A73E8]/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayVoice(item.id, item.voiceAudioBase64)}
                            className="w-8 h-8 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
                            title={isPlayingThis ? 'Pause voice message' : 'Play voice message'}
                          >
                            {isPlayingThis ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>

                          <div>
                            <div className="text-xs font-bold text-[#1A73E8] dark:text-[#8AB4F8] flex items-center gap-1">
                              <Mic className="w-3.5 h-3.5" />
                              <span>{isPlayingThis ? 'Playing Voice Clip...' : 'Listen to Voice Message'}</span>
                            </div>
                            <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                              {item.voiceDurationSec ? `${item.voiceDurationSec} seconds audio` : 'Tap play to listen'}
                            </span>
                          </div>
                        </div>

                        {isPlayingThis && (
                          <div className="flex items-center gap-1 h-4 pr-1">
                            <span className="w-1 bg-[#1A73E8] dark:bg-[#8AB4F8] rounded-full h-3 animate-pulse" />
                            <span className="w-1 bg-[#1A73E8] dark:bg-[#8AB4F8] rounded-full h-4 animate-bounce" />
                            <span className="w-1 bg-[#1A73E8] dark:bg-[#8AB4F8] rounded-full h-2 animate-pulse" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions: Call & Map Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#E1E3E1] dark:border-white/10 flex-wrap">
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="py-2 px-3.5 rounded-xl bg-[#137333] hover:bg-[#0D652D] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
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
                        className="py-2 px-3.5 rounded-xl bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
                        <span>View on Map</span>
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(item.id, item.userName)}
                      disabled={deletingId === item.id}
                      className="p-2 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#5F6368] hover:text-[#D93025] dark:text-[#9AA0A6] dark:hover:text-[#F28B82] transition-colors ml-auto text-xs"
                      title="Remove record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Google Material 3 Search & Segmented Filter Bar */}
      <div
        id="dashboard-search-filter-card"
        className={`p-4 rounded-3xl border transition-all shadow-xs space-y-3 ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Google Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6368] dark:text-[#9AA0A6]" />
            <input
              type="text"
              id="search-safety-records-input"
              placeholder="Search by name, village, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-9 py-2.5 text-xs rounded-2xl border outline-none transition-all font-medium ${
                isDarkMode
                  ? 'bg-[#121316] border-[#303134] text-white placeholder:text-[#5F6368] focus:border-[#8AB4F8]'
                  : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] placeholder:text-[#5F6368] focus:border-[#1A73E8] focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#1F1F1F] dark:text-[#9AA0A6] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Village Filter Select */}
          {villages.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] shrink-0 hidden sm:block" />
              <select
                id="select-filter-village"
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
                className={`px-3.5 py-2 text-xs rounded-2xl border outline-none font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-[#121316] border-[#303134] text-white'
                    : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F]'
                }`}
              >
                <option value="all">All Villages ({totalReports})</option>
                {villages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Material 3 Segmented Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs select-none">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
              filterStatus === 'all'
                ? 'bg-[#1A73E8] text-white shadow-xs'
                : 'bg-[#F1F3F4] text-[#3C4043] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:text-[#C4C7C5] dark:hover:bg-[#3C4043]'
            }`}
          >
            All Records ({totalReports})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('safe')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'safe'
                ? 'bg-[#137333] text-white shadow-xs'
                : 'bg-[#E6F4EA] text-[#0D652D] hover:bg-[#CEEAD6] dark:bg-[#137333]/20 dark:text-[#81C995]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safe ({safeReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('evacuated')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'evacuated'
                ? 'bg-[#1A73E8] text-white shadow-xs'
                : 'bg-[#E8F0FE] text-[#1557B0] hover:bg-[#D2E3FC] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Shelters ({evacuatedReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('in_flooding')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'in_flooding'
                ? 'bg-[#B06000] text-white shadow-xs'
                : 'bg-[#FEF7E0] text-[#B06000] hover:bg-[#FEEFC3] dark:bg-[#B06000]/20 dark:text-[#FDD663]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Water Rising ({inFloodingReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('needs_help')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'needs_help'
                ? 'bg-[#D93025] text-white shadow-xs'
                : 'bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF] dark:bg-[#D93025]/20 dark:text-[#F28B82]'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Need Help ({needsHelpReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterOnlyVoice(!filterOnlyVoice)}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ml-auto ${
              filterOnlyVoice
                ? 'bg-[#1A73E8] text-white shadow-xs'
                : 'bg-[#F1F3F4] text-[#3C4043] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:text-[#C4C7C5]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
            <span>Voice Notes {voiceReportsCount > 0 && `(${voiceReportsCount})`}</span>
          </button>
        </div>
      </div>

      {/* 5. Complete Resident Safety Checks List & Table */}
      <div
        id="dashboard-records-table-card"
        className={`rounded-3xl border overflow-hidden transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134]'
            : 'bg-white border-[#E1E3E1]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDarkMode ? 'border-[#303134] bg-[#28292A]' : 'border-[#E1E3E1] bg-[#F8F9FA]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
              Resident Safety Records ({filteredReports.length})
            </h2>
          </div>
          <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-medium">
            Total Accounted: <strong className="text-[#1F1F1F] dark:text-white">{totalPeopleAccounted} people</strong>
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-10 text-center text-[#5F6368] dark:text-[#9AA0A6] text-xs space-y-1">
            <p className="font-semibold text-sm">No records found.</p>
            <p>Try changing your filter or search words.</p>
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
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#28292A] transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-[#1F1F1F] dark:text-[#E3E3E3]">
                        {report.userName}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                          isSafe
                            ? 'bg-[#E6F4EA] text-[#0D652D] border border-[#CEEAD6]'
                            : isEvacuated
                            ? 'bg-[#E8F0FE] text-[#1557B0] border border-[#D2E3FC]'
                            : isInFlooding
                            ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                            : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                        }`}
                      >
                        {isSafe && <ShieldCheck className="w-3.5 h-3.5" />}
                        {isEvacuated && <Home className="w-3.5 h-3.5" />}
                        {isInFlooding && <AlertTriangle className="w-3.5 h-3.5" />}
                        {isNeedsHelp && <LifeBuoy className="w-3.5 h-3.5" />}
                        <span>
                          {isSafe
                            ? 'Safe'
                            : isEvacuated
                            ? 'Evacuated'
                            : isInFlooding
                            ? 'In Flooding'
                            : 'Needs Help'}
                        </span>
                      </span>

                      {/* Headcount */}
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F1F3F4] dark:bg-[#2D2E30] text-[#3C4043] dark:text-[#E3E3E3] font-medium">
                        {report.peopleCount || 1} {report.peopleCount === 1 ? 'person' : 'people'}
                      </span>

                      {report.voiceAudioBase64 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] border border-[#D2E3FC] dark:border-[#1A73E8]/40 flex items-center gap-1 font-semibold">
                          <Mic className="w-3 h-3" />
                          <span>Voice Attached</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#D93025]" />
                        <span>{report.village}</span>
                      </span>

                      {report.phone && (
                        <span className="flex items-center gap-1 text-[#3C4043] dark:text-[#E3E3E3]">
                          <Phone className="w-3.5 h-3.5 text-[#1A73E8]" />
                          <span>{report.phone}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[#5F6368] dark:text-[#9AA0A6]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{report.formattedTime}</span>
                      </span>
                    </div>

                    {report.message && (
                      <p className="text-xs text-[#1F1F1F] dark:text-[#E3E3E3] pt-0.5 max-w-xl font-medium">
                        "{report.message}"
                      </p>
                    )}

                    {/* Voice Note Play Button */}
                    {report.voiceAudioBase64 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePlayVoice(report.id, report.voiceAudioBase64)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            isPlayingThis
                              ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                              : isDarkMode
                              ? 'bg-[#2D2E30] border-[#303134] text-[#8AB4F8] hover:bg-[#3C4043]'
                              : 'bg-[#E8F0FE] border-[#D2E3FC] text-[#1A73E8] hover:bg-[#D2E3FC]'
                          }`}
                        >
                          {isPlayingThis ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>{isPlayingThis ? 'Playing Voice Clip...' : 'Listen to Voice Message'}</span>
                          {report.voiceDurationSec ? (
                            <span className="text-[10px] opacity-80">({report.voiceDurationSec}s)</span>
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
                        className="py-1.5 px-3 rounded-xl bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#137333] dark:text-[#81C995] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Call Resident"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}

                    {report.mapsUrl && (
                      <a
                        href={report.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-xl bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1A73E8] dark:text-[#8AB4F8] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="View Location on Map"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#D93025]" />
                        <span>Location</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id, report.userName)}
                      disabled={deletingId === report.id}
                      className="p-1.5 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#5F6368] hover:text-[#D93025] dark:text-[#9AA0A6] dark:hover:text-[#F28B82] text-xs transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Flood Alarm Incidents Database Log (Google-style Flat Card) */}
      <div
        id="dashboard-incidents-log-card"
        className={`rounded-3xl border overflow-hidden transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134]'
            : 'bg-white border-[#E1E3E1]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDarkMode ? 'border-[#303134] bg-[#28292A]' : 'border-[#E1E3E1] bg-[#F8F9FA]'
          }`}
        >
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
              Flood Alarm Incidents ({alerts.length})
            </h2>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all flood alert incidents from database?')) {
                  firebaseFloodService.clearAlerts();
                }
              }}
              className="text-xs font-semibold text-[#D93025] hover:underline flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Incidents</span>
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-[#5F6368] dark:text-[#9AA0A6] text-xs">
            No flood alarm incidents recorded. All rivers clear.
          </div>
        ) : (
          <div className="divide-y divide-[#E1E3E1] dark:divide-[#303134] max-h-60 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] dark:hover:bg-[#28292A] text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        alert.severity === 'yellow'
                          ? 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#B06000]/20 dark:text-[#FDD663] border border-[#FEEFC3]'
                          : 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82] border border-[#FAD2CF]'
                      }`}
                    >
                      {alert.severity === 'yellow' ? 'Warning' : 'Critical'}
                    </span>
                    <span className="font-bold text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                      {alert.title || 'Flood Alert'}
                    </span>
                    <span className="font-mono text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                      &Delta; {alert.peakDelta.toFixed(2)} m/s&sup2;
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] truncate">
                    {alert.locationLabel || alert.village || 'River Node'} &bull; {alert.formattedTime} &bull; Source: {alert.source}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-1.5 rounded-xl text-[#5F6368] hover:text-[#D93025] dark:text-[#9AA0A6] dark:hover:text-[#F28B82] hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                  title="Delete incident"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
