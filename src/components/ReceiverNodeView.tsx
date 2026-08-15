import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Trash2,
  Download,
  Filter,
  Volume2,
  Radio,
  ShieldAlert,
  Database,
  Smartphone,
  WifiOff,
  Sparkles,
  Zap,
  MapPin,
  ExternalLink,
  Compass,
  Navigation,
  ChevronDown,
  ChevronUp,
  Mic,
  LifeBuoy,
} from 'lucide-react';
import { FloodAlert } from '../types';
import { NotificationService } from '../services/notificationService';

interface ReceiverNodeViewProps {
  alerts: FloodAlert[];
  notificationPermission: NotificationPermission;
  onRequestNotificationPermission: () => void;
  onDismissAlert: (id: string) => void;
  onClearAlerts: () => void;
  isFirebaseConnected: boolean;
  onOpenFirebaseModal: () => void;
  isDarkMode: boolean;
  isOnline?: boolean;
  onOpenVoiceSOS?: () => void;
}

export const ReceiverNodeView: React.FC<ReceiverNodeViewProps> = ({
  alerts,
  notificationPermission,
  onRequestNotificationPermission,
  onDismissAlert,
  onClearAlerts,
  isFirebaseConnected,
  onOpenFirebaseModal,
  isDarkMode,
  isOnline = true,
  onOpenVoiceSOS,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'active' | 'dismissed'>('all');
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(() => NotificationService.canInstallPwa());
  const [testSent, setTestSent] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    const unsub = NotificationService.subscribeInstallPrompt((canInstall) => {
      setCanInstallPwa(canInstall);
    });
    return () => unsub();
  }, []);

  const handleInstallApp = async () => {
    const installed = await NotificationService.promptPwaInstall();
    if (installed) {
      setCanInstallPwa(false);
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    if (filterType === 'active') return item.status === 'active';
    if (filterType === 'dismissed') return item.status === 'dismissed';
    return true;
  });

  const exportAlertsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(alerts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `flood_alerts_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const activeCount = alerts.filter((a) => a.status === 'active').length;

  const handleSendTestPush = async () => {
    setTestSent(true);
    await NotificationService.sendFloodPushNotification(
      '🚨 FLOOD WARNING TEST',
      'Alert system is ready. Your phone will ring and vibrate when a flood warning happens.',
      { isTest: true, village: 'Dzenje Village', peakDelta: 4.8 }
    );
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div id="receiver-node-view" className="space-y-4 pb-24">
      {/* 1. App Welcome & Notification Status Card */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/icon.svg"
              alt="Flood Alert App Icon"
              className="w-12 h-12 rounded-2xl shrink-0 shadow-xs border border-black/5"
              referrerPolicy="no-referrer"
            />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold font-sans tracking-tight">
                  Flood Alert Receiver
                </h2>
                {notificationPermission === 'granted' ? (
                  <span
                    id="badge-push-granted"
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Alerts Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF7E0] text-[#B06000] dark:bg-amber-950/40 dark:text-amber-300">
                    Turn On Alerts
                  </span>
                )}
              </div>

              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1 leading-relaxed">
                You will hear loud warning sirens as soon as flood sensors detect water danger.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {notificationPermission !== 'granted' ? (
              <button
                id="btn-enable-push-alerts"
                onClick={onRequestNotificationPermission}
                className="px-4 py-2 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold text-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Turn On Loud Alerts</span>
              </button>
            ) : (
              <button
                id="btn-test-fcm-alert"
                onClick={handleSendTestPush}
                disabled={testSent}
                className="px-3.5 py-2 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#28292C] dark:hover:bg-[#3C4043] text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-[#B06000] inline mr-1" />
                <span>{testSent ? 'Alarm Tested!' : 'Test Siren Sound'}</span>
              </button>
            )}

            {canInstallPwa && (
              <button
                id="btn-install-pwa"
                onClick={handleInstallApp}
                className="px-3.5 py-2 rounded-full bg-[#1F1F1F] text-white dark:bg-white dark:text-[#1F1F1F] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Voice SOS Card */}
      {onOpenVoiceSOS && (
        <div
          id="fast-voice-sos-card"
          className={`shrink-0 rounded-[24px] border p-4 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-red-900/40 text-[#E3E3E3]'
              : 'bg-[#FCE8E6] border-red-200 text-[#1F1F1F]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D93025] text-white flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#D93025] dark:text-red-400">
                    Emergency Voice Report
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/40 text-[#D93025] dark:text-red-300">
                    SOS
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  Record a quick voice status or message for village rescue teams.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-fast-voice-receiver"
              onClick={onOpenVoiceSOS}
              className="px-4 py-2 rounded-full bg-[#D93025] hover:bg-[#B3261E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all self-stretch sm:self-center shrink-0"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Voice Status</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Overview Stats & Connection Banner */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`rounded-2xl border p-4 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            Active Alerts
          </div>
          <div className="flex items-center justify-between">
            <span
              id="stat-active-alerts"
              className={`text-2xl sm:text-3xl font-black font-mono ${
                activeCount > 0 ? 'text-[#D93025]' : 'text-[#1E8E3E]'
              }`}
            >
              {activeCount}
            </span>
            {activeCount > 0 ? (
              <ShieldAlert className="w-6 h-6 text-[#D93025] animate-bounce" />
            ) : (
              <CheckCircle className="w-6 h-6 text-[#1E8E3E]" />
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            Total Historic Events
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#1F1F1F] dark:text-[#E3E3E3]">
              {alerts.length}
            </span>
            <Clock className="w-6 h-6 text-[#5F6368] dark:text-[#9AA0A6]" />
          </div>
        </div>
      </div>

      {/* 3. Recent Alerts Log (Material 3 Card List) */}
      <div
        className={`rounded-3xl border transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-bold font-sans">Recent Flood Alerts</h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Live flood warning list and history
            </p>
          </div>
          {showHistory ? (
            <ChevronUp className="w-5 h-5 text-[#5F6368]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#5F6368]" />
          )}
        </button>

        {showHistory && (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4">
            {/* Log Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
              <div className="hidden sm:block">
                {/* Empty spacer */}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Chips */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-[#303134] text-[#1F1F1F] dark:text-white shadow-xs'
                        : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  >
                    All ({alerts.length})
                  </button>
                  <button
                    onClick={() => setFilterType('active')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      filterType === 'active'
                        ? 'bg-white dark:bg-[#303134] text-[#D93025] shadow-xs'
                        : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    onClick={() => setFilterType('dismissed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      filterType === 'dismissed'
                        ? 'bg-white dark:bg-[#303134] text-[#137333] shadow-xs'
                        : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  >
                    Dismissed
                  </button>
                </div>

                {alerts.length > 0 && (
                  <>
                    <button
                      id="btn-export-alerts"
                      onClick={exportAlertsJson}
                      className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-colors"
                      title="Export JSON Log"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      id="btn-clear-alerts-log"
                      onClick={onClearAlerts}
                      className="p-2 rounded-xl border border-red-200 dark:border-red-950/80 text-[#D93025] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Clear Alert History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Card List */}
            <div>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] border border-dashed border-black/10 dark:border-white/10">
                  <CheckCircle className="w-9 h-9 text-[#1E8E3E] mx-auto mb-2 opacity-80" />
                  <h4 className="font-bold text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">
                    No Flood Incidents in Log
                  </h4>
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1 max-w-sm mx-auto">
                    Standing guard. When water sensor vibrations trip the threshold,
                    incidents will appear here and notify all subscribers.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredAlerts.map((alert) => {
                    const isActive = alert.status === 'active';
                    const isYellow = alert.severity === 'yellow';

                    const alertDateObj = new Date(alert.timestamp || Date.now());
                    const formattedDateAndYear = alertDateObj.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                    const formattedTimeStr = alertDateObj.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const locationStr =
                      alert.location?.fullAddress ||
                      alert.locationLabel ||
                      `${alert.riverName || 'Ruo River'}, ${alert.village || 'Dzenje Village'}, ${
                        alert.traditionalAuthority || 'T/A Mabuka'
                      }, ${alert.district || 'Mulanje'}`;

                    return (
                      <div
                        key={alert.id}
                        id={`alert-card-${alert.id}`}
                        className={`rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? isYellow
                              ? 'bg-[#FEF7E0] dark:bg-amber-950/30 border-[#FEEFC3] dark:border-amber-700/60 shadow-xs'
                              : 'bg-[#FCE8E6] dark:bg-red-950/30 border-[#FAD2CF] dark:border-red-900/60 shadow-xs'
                            : 'bg-[#F8F9FA] dark:bg-[#28292C] border-[#E1E3E1] dark:border-[#303134]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isActive
                                ? isYellow
                                  ? 'bg-[#B06000] text-white animate-pulse'
                                  : 'bg-[#D93025] text-white animate-pulse'
                                : 'bg-[#E6F4EA] text-[#0D652D]'
                            }`}
                          >
                            {isActive ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : (
                              <CheckCircle className="w-5 h-5" />
                            )}
                          </div>

                          <div className="space-y-1">
                            {/* Location */}
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] dark:text-white">
                              <MapPin className="w-4 h-4 text-[#D93025] shrink-0" />
                              <span>{locationStr}</span>
                            </div>

                            {/* Date, Year & Time */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5F6368] dark:text-[#9AA0A6] font-medium">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#1A73E8]" />
                                <span>Date: {formattedDateAndYear}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#1A73E8]" />
                                <span>Time: {formattedTimeStr}</span>
                              </div>
                              {isActive ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isYellow
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                                  }`}
                                >
                                  {isYellow ? '⚠️ Warning' : '🚨 Active Alert'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  ✓ Safe / Clear
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <button
                            id={`btn-dismiss-alert-${alert.id}`}
                            onClick={() => onDismissAlert(alert.id)}
                            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2D2E30] hover:bg-gray-100 dark:hover:bg-[#3C4043] text-xs font-bold text-[#1F1F1F] dark:text-white border border-[#E1E3E1] dark:border-[#303134] transition-colors shrink-0 self-start sm:self-center"
                          >
                            Clear Alert
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
