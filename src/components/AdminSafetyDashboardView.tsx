import React, { useState } from 'react';
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
} from 'lucide-react';
import { ResidentSafetyReport, FloodAlert, UserProfile } from '../types';

interface AdminSafetyDashboardViewProps {
  safetyReports: ResidentSafetyReport[];
  alerts: FloodAlert[];
  currentUser: UserProfile | null;
  isDarkMode: boolean;
  onOpenCheckInModal?: () => void;
}

export const AdminSafetyDashboardView: React.FC<AdminSafetyDashboardViewProps> = ({
  safetyReports,
  alerts,
  currentUser,
  isDarkMode,
  onOpenCheckInModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVillage, setFilterVillage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    const headers = ['Resident Name', 'Village', 'Status', 'Headcount', 'Phone', 'Message', 'GPS Location', 'Time'];
    const rows = safetyReports.map((r) => [
      `"${r.userName.replace(/"/g, '""')}"`,
      `"${r.village.replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.peopleCount || 1,
      `"${r.phone || ''}"`,
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
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDarkMode
            ? 'bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 border-indigo-500/30'
            : 'bg-gradient-to-r from-white via-indigo-50/50 to-indigo-100/40 border-indigo-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Admin Ops Center
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Roll-Call Sync
            </span>
          </div>
          <h1 className="text-lg font-bold">Community Safety & Rescue Dashboard</h1>
          <p className="text-xs text-zinc-400">
            Real-time status of residents marked Safe, Evacuated, or In Flooding across Ruo River villages.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            id="export-rollcall-csv-btn"
            onClick={exportCSV}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors ${
              isDarkMode
                ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                : 'bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onOpenCheckInModal && (
            <button
              id="admin-record-status-btn"
              onClick={onOpenCheckInModal}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 flex items-center gap-1.5 transition-all"
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
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-zinc-900/80 border-emerald-900/30' : 'bg-emerald-50/60 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-500">Marked Safe</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-400">{safeReports.length}</div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {safePeople} people accounted for
            </div>
          </div>
        </div>

        {/* Evacuated */}
        <div
          id="kpi-evacuated"
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-zinc-900/80 border-blue-900/30' : 'bg-blue-50/60 border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">Evacuated / Shelters</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
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
            {urgentQueue.map((item) => (
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

                  <span className="text-[10px] text-zinc-400 ml-auto whitespace-nowrap">
                    {item.formattedTime}
                  </span>
                </div>
              </div>
            ))}
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
            isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-100 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Resident Safety Roll-Call Records ({filteredReports.length})
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400">
            Total People: <strong className="text-zinc-200">{totalPeopleAccounted}</strong>
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            No safety reports found matching current filters.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filteredReports.map((report) => {
              const isSafe = report.status === 'safe';
              const isEvacuated = report.status === 'evacuated';
              const isInFlooding = report.status === 'in_flooding';
              const isNeedsHelp = report.status === 'needs_help';

              return (
                <div
                  key={report.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/20 transition-colors`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100">{report.userName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          isSafe
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isEvacuated
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : isInFlooding
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
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

                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {report.peopleCount || 1} {report.peopleCount === 1 ? 'person' : 'people'}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        <span>{report.village}</span>
                      </span>

                      {report.phone && (
                        <span className="flex items-center gap-1 font-mono text-zinc-300">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          <span>{report.phone}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{report.formattedTime}</span>
                      </span>
                    </div>

                    {report.message && (
                      <p className="text-xs text-zinc-300 pt-0.5 max-w-xl">
                        "{report.message}"
                      </p>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
