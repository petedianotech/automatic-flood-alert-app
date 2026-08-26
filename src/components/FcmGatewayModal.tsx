import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  Radio,
  Smartphone,
  Info,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { FcmGatewayService, FcmPushStatus } from '../services/fcmGatewayService';
import { sirenService } from '../services/audioSiren';

interface FcmGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export const FcmGatewayModal: React.FC<FcmGatewayModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
}) => {
  const [fcmStatus, setFcmStatus] = useState<FcmPushStatus | null>(null);
  const [tokensCount, setTokensCount] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const loadStatusAndTokens = async () => {
    setIsRefreshing(true);
    try {
      const [status, tokens] = await Promise.all([
        FcmGatewayService.checkStatus(),
        FcmGatewayService.getAllRegisteredTokens(),
      ]);
      setFcmStatus(status);
      setTokensCount(tokens.length);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResultMessage(null);
      loadStatusAndTokens();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendTestPush = async () => {
    setIsSending(true);
    setResultMessage(null);

    // Audible local chime
    sirenService.playWarningAlertSound();

    const res = await FcmGatewayService.sendTestPushToAll();
    setIsSending(false);

    if (res.success) {
      setResultMessage({
        success: true,
        text: `High-priority push alert successfully sent to ${res.deliveredCount || tokensCount} registered phone(s)! Devices will ring with sirens even if closed.`,
      });
    } else if (res.notConfigured) {
      setResultMessage({
        success: false,
        text: 'FCM Server Key not added to settings yet. Follow the 3 setup steps below to activate remote closed-app wake-up.',
      });
    } else {
      setResultMessage({
        success: false,
        text: res.error || 'Failed to dispatch test push.',
      });
    }
  };

  return (
    <div
      id="modal-fcm-gateway"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#4F378B] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <BellRing className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Push Notification Gateway
              </h2>
              <p className="text-xs text-purple-200 font-semibold">
                Firebase Cloud Messaging (FCM) Closed-App Wake-Up
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. Status Card */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-start justify-between gap-3 ${
              fcmStatus?.configured
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                : 'bg-amber-50 border-amber-500 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              {fcmStatus?.configured ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">
                    {fcmStatus?.configured
                      ? 'FCM Gateway Connected & Active'
                      : 'FCM Server Key Needed'}
                  </span>
                </div>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {fcmStatus?.configured
                    ? 'High-priority push notifications are active. The cloud will wake up closed apps and play loud emergency sirens.'
                    : 'Add FIREBASE_FCM_SERVER_KEY to your environment settings to wake up phones when the app is completely closed.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadStatusAndTokens}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 2. Registered Devices Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Registered Village Phones
                  </h3>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Devices connected to emergency alarm channel
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-600 text-white font-black text-xs shadow-xs">
                {tokensCount} {tokensCount === 1 ? 'Phone' : 'Phones'}
              </span>
            </div>

            {/* Test Push Button */}
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={isSending || tokensCount === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4F378B] hover:bg-[#38236B] active:bg-[#2A1753] disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'Dispatching FCM Push to Phones...'
                  : `Send Test Push Alert (${tokensCount} Phones)`}
              </span>
            </button>

            {resultMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                  resultMessage.success
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-red-100 text-red-900 border border-red-300'
                }`}
              >
                {resultMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                )}
                <span>{resultMessage.text}</span>
              </div>
            )}
          </div>

          {/* 3. Setup Instructions */}
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-2 text-slate-800">
            <div className="flex items-center gap-1.5 font-black text-purple-950">
              <Info className="w-4 h-4 text-purple-700" />
              <span>How to get your Firebase FCM Server Key:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
              <li>
                Open the{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-purple-700 underline inline-flex items-center gap-0.5"
                >
                  Firebase Console <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Go to <strong>Project Settings (gear icon) → Cloud Messaging</strong>.
              </li>
              <li>
                Under <strong>Cloud Messaging API (Legacy)</strong>, copy the <strong>Server Key</strong>. (If disabled, tap the 3 dots and enable Cloud Messaging API in Google Cloud).
              </li>
              <li>
                In Google AI Studio, open <strong>Settings / Environment</strong> and add:
                <div className="font-mono text-[11px] bg-white p-2 rounded-lg border border-purple-200 mt-1 text-purple-950 font-bold">
                  FIREBASE_FCM_SERVER_KEY = your_server_key
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-xs text-slate-800 cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
