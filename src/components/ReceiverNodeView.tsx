import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle,
  AlertTriangle,
  Clock,
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
} from 'lucide-react';
import { FloodAlert } from '../types';
import { NotificationService } from '../services/notificationService';

interface ReceiverNodeViewProps {
  alerts: FloodAlert[];
  notificationPermission: NotificationPermission;
  onRequestNotificationPermission: () => void;
  onDismissAlert: (id: string) => void;
  onClearAlerts: () => void;
  onTestSiren: () => void;
  isFirebaseConnected: boolean;
  onOpenFirebaseModal: () => void;
  isDarkMode: boolean;
  isOnline?: boolean;
}

export const ReceiverNodeView: React.FC<ReceiverNodeViewProps> = ({
  alerts,
  notificationPermission,
  onRequestNotificationPermission,
  onDismissAlert,
  onClearAlerts,
  onTestSiren,
  isFirebaseConnected,
  onOpenFirebaseModal,
  isDarkMode,
  isOnline = true,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'active' | 'dismissed'>('all');
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(() => NotificationService.canInstallPwa());
  const [testSent, setTestSent] = useState<boolean>(false);

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

  const handleTestBackgroundPush = async () => {
    setTestSent(true);
    // Send offline-compatible background notification
    await NotificationService.sendFloodPushNotification(
      '🚨 [TEST] CRITICAL FLOOD ALARM',
      'This is a simulated background flood alert test. Haptics and siren verified.',
      {
        village: 'Riverbank East',
        peakDelta: 3.42,
        isTest: true,
      }
    );
    // Trigger siren sound too
    onTestSiren();
    setTimeout(() => setTestSent(false), 3000);
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

  return (
    <div id="receiver-node-view" className="space-y-5">
      {/* 1. Offline & Background Push Notification Center */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                notificationPermission === 'granted'
                  ? 'bg-[#E6F4EA] text-[#137333] dark:bg-[#1E8E3E]/20 dark:text-[#81C995]'
                  : 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
              }`}
            >
              {notificationPermission === 'granted' ? (
                <BellRing className="w-6 h-6 animate-pulse" />
              ) : notificationPermission === 'denied' ? (
                <BellOff className="w-6 h-6 text-red-500" />
              ) : (
                <Bell className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight">
                  Offline &amp; Background Notification Engine
                </h2>
                {notificationPermission === 'granted' ? (
                  <span
                    id="badge-push-granted"
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    OS Alerts Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">
                    Action Required
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6] mt-1 max-w-2xl leading-relaxed">
                Powered by modern Service Worker background architecture. Sends loud audible sirens,
                continuous device vibration, and high-priority push notifications even when the screen is locked,
                the browser is in the background, or when internet connectivity is completely offline.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {notificationPermission !== 'granted' ? (
              <button
                id="btn-enable-push-alerts"
                onClick={onRequestNotificationPermission}
                className="px-5 py-3 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                <span>Allow Flood Notifications</span>
              </button>
            ) : (
              <button
                id="btn-test-background-notification"
                onClick={handleTestBackgroundPush}
                className="px-4 py-2.5 rounded-2xl bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] text-xs font-bold flex items-center gap-2 transition-all active:scale-98 border border-[#D2E3FC] dark:border-[#1A73E8]/30"
              >
                <Zap className="w-4 h-4" />
                <span>{testSent ? 'Notification Triggered!' : 'Test Background Alert'}</span>
              </button>
            )}

            {canInstallPwa && (
              <button
                id="btn-install-pwa"
                onClick={handleInstallApp}
                className="px-4 py-2.5 rounded-2xl bg-[#1F1F1F] hover:bg-[#303134] text-white dark:bg-white dark:text-[#1F1F1F] text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                <span>Install Mobile App</span>
              </button>
            )}
          </div>
        </div>

        {/* How Offline Notifications Work Breakdown */}
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <div className="font-bold flex items-center gap-1.5 text-[#1A73E8] dark:text-[#8AB4F8] mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Service Worker Cache</span>
            </div>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              Web App Shell is cached offline for instant startup without an internet connection.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <div className="font-bold flex items-center gap-1.5 text-[#D93025] mb-0.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Hardware Haptics &amp; Audio</span>
            </div>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              Synthesizes 900Hz emergency sirens and multi-pulse phone vibrations natively on-device.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-0.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Auto Cloud Sync</span>
            </div>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              Incidents recorded while offline sync to Firebase community database upon reconnection.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Overview Stats & Connection Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <div
          className={`rounded-2xl border p-4 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
            Network Sync Mode
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs sm:text-sm font-bold text-[#1F1F1F] dark:text-[#E3E3E3] block">
                {isOnline ? 'Firestore Cloud Synced' : 'Offline Mode (Local SW)'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                {isOnline ? 'Community cloud live' : 'Alarm siren active without internet'}
              </span>
            </div>
            <button
              onClick={onOpenFirebaseModal}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors"
            >
              <Database className="w-5 h-5 text-[#EA4335]" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Recent Alerts Log (Material 3 Card List) */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        {/* Log Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-sans">Recent Flood Alerts Log</h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Real-time Firestore stream &amp; local offline incident log
            </p>
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
              return (
                <div
                  key={alert.id}
                  id={`alert-card-${alert.id}`}
                  className={`rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-[#FCE8E6]/70 dark:bg-red-950/30 border-[#FAD2CF] dark:border-red-900/60 shadow-xs'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-[#D93025] text-white animate-pulse'
                          : 'bg-[#E6F4EA] text-[#137333]'
                      }`}
                    >
                      {isActive ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">
                          {alert.nodeName || 'Flood Sensor Node'}
                        </span>
                        {alert.village && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] dark:text-[#8AB4F8]">
                            {alert.village}
                          </span>
                        )}
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D93025] text-white">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333]">
                            RESOLVED
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1 font-mono">
                        <span>🕒 {alert.formattedTime}</span>
                        <span>⚡ Peak: {alert.peakDelta.toFixed(2)} m/s²</span>
                        <span>⏱️ {alert.durationSeconds.toFixed(1)}s</span>
                      </div>

                      {alert.dismissedAt && (
                        <div className="text-[10px] text-[#137333] dark:text-[#81C995] mt-1 font-medium">
                          Dismissed by {alert.dismissedBy} at{' '}
                          {new Date(alert.dismissedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <button
                      id={`btn-dismiss-alert-${alert.id}`}
                      onClick={() => onDismissAlert(alert.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#2D2E30] hover:bg-gray-100 text-xs font-bold text-[#D93025] border border-[#FAD2CF] dark:border-red-900 shrink-0 self-start sm:self-center transition-colors shadow-xs"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
