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
  ShieldCheck,
  Share2,
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
  const hasActiveDanger = alerts.some((a) => a.status === 'active' && a.severity !== 'yellow');
  const hasActiveWarning = alerts.some((a) => a.status === 'active' && a.severity === 'yellow');

  // Safety Guide Tab: user can switch between 'normal', 'yellow', and 'red'
  // If not explicitly selected by user, automatically reflects active danger (red) or warning (yellow) or normal
  const [userGuideTab, setUserGuideTab] = useState<'normal' | 'yellow' | 'red' | null>(null);
  const currentGuideTab: 'normal' | 'yellow' | 'red' =
    userGuideTab || (hasActiveDanger ? 'red' : hasActiveWarning ? 'yellow' : 'normal');

  const handleSendTestPush = async () => {
    setTestSent(true);
    await NotificationService.sendFloodPushNotification(
      'FLOOD WARNING TEST',
      'Alert system is ready. Your phone will ring loudly when flood danger occurs.',
      { isTest: true, village: 'Dzenje Village', peakDelta: 4.8 }
    );
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div id="receiver-node-view" className="space-y-4 pb-24">
      {/* 1. Header Card: Status & Loud Alert Controls */}
      <div
        id="alerts-header-card"
        className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                activeCount > 0
                  ? 'bg-[#D93025] text-white animate-bounce'
                  : 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
              }`}
            >
              {activeCount > 0 ? <ShieldAlert className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight">
                  Village Flood Alerts
                </h2>
                {activeCount > 0 ? (
                  <span
                    id="badge-active-flood-danger"
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82] border border-[#FAD2CF] dark:border-[#D93025]/40 flex items-center gap-1"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#D93025] animate-ping" />
                    {activeCount} Active {activeCount === 1 ? 'Alert' : 'Alerts'}
                  </span>
                ) : notificationPermission === 'granted' ? (
                  <span
                    id="badge-push-granted"
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Sirens Ready
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF7E0] text-[#B06000] dark:bg-[#B06000]/20 dark:text-[#FDD663]">
                    Enable Alerts
                  </span>
                )}
              </div>

              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                {activeCount > 0
                  ? 'Flood detected near the river. Follow safety steps below immediately.'
                  : 'Your phone will sound a loud siren and vibrate as soon as river sensors detect rising water.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                id="btn-enable-push-alerts"
                onClick={onRequestNotificationPermission}
                className="px-4 py-2 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Turn On Loud Sirens</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-test-fcm-alert"
                onClick={handleSendTestPush}
                disabled={testSent}
                className="px-3.5 py-2 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#28292C] dark:hover:bg-[#3C4043] text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-[#B06000] dark:text-[#FDD663] inline mr-1" />
                <span>{testSent ? 'Sound Tested!' : 'Test Loud Sound'}</span>
              </button>
            )}

            {canInstallPwa && (
              <button
                type="button"
                id="btn-install-pwa"
                onClick={handleInstallApp}
                className="px-3.5 py-2 rounded-full bg-[#1F1F1F] text-white dark:bg-white dark:text-[#1F1F1F] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Emergency Voice SOS Card */}
      {onOpenVoiceSOS && (
        <div
          id="fast-voice-sos-card"
          className={`shrink-0 rounded-3xl border p-4 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#D93025]/40 text-[#E3E3E3]'
              : 'bg-[#FCE8E6] border-[#FAD2CF] text-[#1F1F1F]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D93025] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#D93025] dark:text-[#F28B82]">
                    Quick Voice Safety Message
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D93025] text-white">
                    SOS
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  Record a fast voice note to let village leaders and rescue teams know if you need help.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-fast-voice-receiver"
              onClick={onOpenVoiceSOS}
              className="px-5 py-2.5 rounded-full bg-[#D93025] hover:bg-[#B3261E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all self-stretch sm:self-center shrink-0 active:scale-95"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Voice Status</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Safety Action Guide (Material 3 Segmented Navigation & Action Cards) */}
      <div
        id="card-what-to-do-right-now"
        className={`shrink-0 rounded-3xl border p-5 transition-all shadow-xs ${
          currentGuideTab === 'red'
            ? 'bg-[#FCE8E6] border-[#FAD2CF] text-[#1F1F1F] dark:bg-[#D93025]/20 dark:border-[#D93025]/40 dark:text-[#E3E3E3]'
            : currentGuideTab === 'yellow'
            ? 'bg-[#FEF7E0] border-[#FEEFC3] text-[#1F1F1F] dark:bg-[#B06000]/20 dark:border-[#B06000]/40 dark:text-[#E3E3E3]'
            : isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                currentGuideTab === 'red'
                  ? 'bg-[#D93025] text-white'
                  : currentGuideTab === 'yellow'
                  ? 'bg-[#B06000] text-white'
                  : 'bg-[#1A73E8] text-white'
              }`}
            >
              {currentGuideTab === 'red' ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : currentGuideTab === 'yellow' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <LifeBuoy className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base font-sans tracking-tight">
                  {currentGuideTab === 'red'
                    ? 'Red Alert: What to do right now'
                    : currentGuideTab === 'yellow'
                    ? 'Yellow Warning: What to do right now'
                    : 'How to Prepare Before Floods'}
                </h3>
              </div>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                {currentGuideTab === 'red'
                  ? 'Dangerous rushing water detected. Evacuate immediately!'
                  : currentGuideTab === 'yellow'
                  ? 'Water level is rising. Get ready before roads flood.'
                  : 'Simple steps to protect your family and home before floods start.'}
              </p>
            </div>
          </div>

          {/* Segmented Mode Selector Pills */}
          <div className="flex items-center gap-1 bg-[#F1F3F4] dark:bg-[#28292A] p-1 rounded-full self-start sm:self-center shrink-0">
            <button
              type="button"
              id="guide-tab-normal-btn"
              onClick={() => setUserGuideTab('normal')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentGuideTab === 'normal'
                  ? 'bg-white dark:bg-[#303134] text-[#137333] dark:text-[#81C995] shadow-xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#137333]" />
              <span>Normal</span>
            </button>

            <button
              type="button"
              id="guide-tab-yellow-btn"
              onClick={() => setUserGuideTab('yellow')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentGuideTab === 'yellow'
                  ? 'bg-[#B06000] text-white shadow-xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#B06000] dark:bg-[#FDD663]" />
              <span>Yellow Warning</span>
            </button>

            <button
              type="button"
              id="guide-tab-red-btn"
              onClick={() => setUserGuideTab('red')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentGuideTab === 'red'
                  ? 'bg-[#D93025] text-white shadow-xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D93025] dark:bg-[#F28B82]" />
              <span>Red Danger</span>
            </button>
          </div>
        </div>

        {/* Action Content according to state */}
        {currentGuideTab === 'red' && (
          /* RED DANGER: 4 Clear Urgent Actions */
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FAD2CF] dark:border-[#D93025]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#D93025] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-sm font-bold text-[#D93025] dark:text-[#F28B82] block">
                  Move to high ground immediately
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Walk or run quickly to the nearest village hill, church, or primary school shelter. Do not wait.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FAD2CF] dark:border-[#D93025]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#D93025] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-sm font-bold text-[#D93025] dark:text-[#F28B82] block">
                  Help children, elders, and neighbors
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Gather all family members together and assist older people and neighbors who need walking help.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FAD2CF] dark:border-[#D93025]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#D93025] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-sm font-bold text-[#D93025] dark:text-[#F28B82] block">
                  Do NOT walk or drive in flood water
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Fast moving river current can sweep away people and vehicles in seconds. Never cross submerged bridges.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FAD2CF] dark:border-[#D93025]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#D93025] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-sm font-bold text-[#D93025] dark:text-[#F28B82] block">
                  Keep phones in dry plastic bags
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Protect torches and mobile phones from getting wet so you can send SOS voice notes or call for rescue.
                </span>
              </div>
            </div>
          </div>
        )}

        {currentGuideTab === 'yellow' && (
          /* YELLOW WARNING: 4 Preparedness Steps */
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FEEFC3] dark:border-[#B06000]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#B06000] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-sm font-bold text-[#B06000] dark:text-[#FDD663] block">
                  Get emergency bags ready by the door
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Pack torch, dry clothes, clean drinking water, medicines, and ID cards in a plastic bag.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FEEFC3] dark:border-[#B06000]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#B06000] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-sm font-bold text-[#B06000] dark:text-[#FDD663] block">
                  Move animals away from the river bank
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Untie cows, goats, and chickens and guide them to high pens before paths become muddy.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FEEFC3] dark:border-[#B06000]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#B06000] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-sm font-bold text-[#B06000] dark:text-[#FDD663] block">
                  Charge mobile phones and torches
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Charge phone batteries now so you have light and communication if village power cuts off.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#28292A] border border-[#FEEFC3] dark:border-[#B06000]/40 flex items-start gap-3 shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-[#B06000] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-sm font-bold text-[#B06000] dark:text-[#FDD663] block">
                  Warn family members and neighbors
                </strong>
                <span className="text-xs text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">
                  Tell neighbors living in low ground to stay awake and listen for village warning sirens.
                </span>
              </div>
            </div>
          </div>
        )}

        {currentGuideTab === 'normal' && (
          /* NORMAL / PREPARATION BEFORE FLOODS */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#28292A] border border-[#E1E3E1] dark:border-[#303134] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">
                <span className="w-5 h-5 rounded-full bg-[#1A73E8] text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Know Your Safe Shelter</span>
              </div>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                Know the quickest walking route from your home to the nearest hill, church, or primary school.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#28292A] border border-[#E1E3E1] dark:border-[#303134] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">
                <span className="w-5 h-5 rounded-full bg-[#1A73E8] text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Keep Essentials Ready</span>
              </div>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                Store ID cards, medicines, torch batteries, clean water, and food in plastic bags.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#28292A] border border-[#E1E3E1] dark:border-[#303134] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">
                <span className="w-5 h-5 rounded-full bg-[#1A73E8] text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Keep Loud Sirens On</span>
              </div>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                Allow notifications on your phone so this app can sound loud alarms and vibrate at night.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Alert History & Live Alerts Card List */}
      <div
        id="alerts-history-container"
        className={`rounded-3xl border transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <button
          type="button"
          id="btn-toggle-alert-history"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[#F8F9FA] dark:hover:bg-[#28292A] transition-colors rounded-3xl"
        >
          <div className="text-left">
            <h3 className="text-base font-bold font-sans">Flood Alert Log</h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Real-time warnings and sensor history
            </p>
          </div>
          {showHistory ? (
            <ChevronUp className="w-5 h-5 text-[#5F6368] dark:text-[#9AA0A6]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#5F6368] dark:text-[#9AA0A6]" />
          )}
        </button>

        {showHistory && (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4">
            {/* Toolbar with Segmented Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E3E1] dark:border-[#303134]">
              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#F1F3F4] dark:bg-[#28292A]">
                <button
                  type="button"
                  id="filter-alerts-all-btn"
                  onClick={() => setFilterType('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-[#303134] text-[#1F1F1F] dark:text-white shadow-xs'
                      : 'text-[#5F6368] dark:text-[#9AA0A6]'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  type="button"
                  id="filter-alerts-active-btn"
                  onClick={() => setFilterType('active')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filterType === 'active'
                      ? 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82] shadow-xs'
                      : 'text-[#5F6368] dark:text-[#9AA0A6]'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  id="filter-alerts-dismissed-btn"
                  onClick={() => setFilterType('dismissed')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filterType === 'dismissed'
                      ? 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] shadow-xs'
                      : 'text-[#5F6368] dark:text-[#9AA0A6]'
                  }`}
                >
                  Cleared
                </button>
              </div>

              {/* Action Buttons */}
              {alerts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-export-alerts"
                    onClick={exportAlertsJson}
                    className="p-2 rounded-full border border-[#E1E3E1] dark:border-[#303134] hover:bg-[#F1F3F4] dark:hover:bg-[#28292A] text-xs font-semibold transition-colors text-[#5F6368] dark:text-[#9AA0A6]"
                    title="Download Alert Log"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    id="btn-clear-alerts-log"
                    onClick={onClearAlerts}
                    className="p-2 rounded-full border border-[#FAD2CF] dark:border-[#D93025]/40 text-[#D93025] hover:bg-[#FCE8E6] dark:hover:bg-[#D93025]/20 transition-colors"
                    title="Clear Log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* List of Alerts */}
            <div>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-3xl bg-[#F8F9FA] dark:bg-[#28292A] border border-[#E1E3E1] dark:border-[#303134]">
                  <CheckCircle className="w-10 h-10 text-[#137333] dark:text-[#81C995] mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">
                    No Active Flood Warnings
                  </h4>
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1 max-w-sm mx-auto">
                    The river is currently safe. When sensors detect rising water or bell ringing, alarms will appear here.
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
                        className={`rounded-3xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? isYellow
                              ? 'bg-[#FEF7E0] dark:bg-[#B06000]/20 border-[#FEEFC3] dark:border-[#B06000]/40 shadow-xs'
                              : 'bg-[#FCE8E6] dark:bg-[#D93025]/20 border-[#FAD2CF] dark:border-[#D93025]/40 shadow-xs'
                            : 'bg-[#F8F9FA] dark:bg-[#28292A] border-[#E1E3E1] dark:border-[#303134]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isActive
                                ? isYellow
                                  ? 'bg-[#B06000] text-white'
                                  : 'bg-[#D93025] text-white'
                                : 'bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995]'
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
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
                              <MapPin className="w-4 h-4 text-[#D93025] shrink-0" />
                              <span>{locationStr}</span>
                            </div>

                            {/* Date, Year & Time */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
                                <span>Date: {formattedDateAndYear}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
                                <span>Time: {formattedTimeStr}</span>
                              </div>
                              {isActive ? (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isYellow
                                      ? 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#B06000]/30 dark:text-[#FDD663]'
                                      : 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/30 dark:text-[#F28B82]'
                                  }`}
                                >
                                  {isYellow ? 'Warning: Water Rising' : 'Danger: Flood Detected'}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/30 dark:text-[#81C995]">
                                  Safe / Cleared
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <button
                            type="button"
                            id={`btn-dismiss-alert-${alert.id}`}
                            onClick={() => onDismissAlert(alert.id)}
                            className="px-4 py-2 rounded-full bg-white dark:bg-[#1E1F20] hover:bg-[#F1F3F4] dark:hover:bg-[#303134] text-xs font-bold text-[#1F1F1F] dark:text-[#E3E3E3] border border-[#E1E3E1] dark:border-[#303134] transition-all shadow-2xs shrink-0 self-start sm:self-center active:scale-95"
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
