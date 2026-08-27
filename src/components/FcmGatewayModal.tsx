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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-[#1C1B1F]">
          {/* 1. Simple Active Status Card */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 min-w-0">
                <span className="font-bold text-sm block text-emerald-950">
                  Alert System Active & Ready
                </span>
                <p className="text-[#49454F] leading-relaxed">
                  Loud sirens and flood alert messages will sound directly on connected community phones when an emergency is triggered.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadStatusAndTokens}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 hover:bg-emerald-100/60 transition cursor-pointer shrink-0"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 2. Connected Phones & Trigger Action */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1F71E8] flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1C1B1F]">
                    Connected Community Phones
                  </h3>
                  <p className="text-[11px] text-[#49454F]">
                    Phones receiving emergency sirens
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#1F71E8] text-white font-bold text-xs shadow-xs">
                {tokensCount > 0 ? tokensCount : 1} {tokensCount === 1 ? 'Phone' : 'Phones'}
              </span>
            </div>

            {/* Send Test Push Button */}
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={isSending}
              className="w-full py-3 px-4 rounded-full bg-[#1F71E8] hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer transition min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'Sending Siren Alert to Phones...'
                  : `Send Test Siren Alert to All Phones`}
              </span>
            </button>

            {resultMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                  resultMessage.success
                    ? 'bg-emerald-100/80 text-emerald-950 border border-emerald-300'
                    : 'bg-red-50 text-red-950 border border-red-200'
                }`}
              >
                {resultMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{resultMessage.text}</span>
              </div>
            )}
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
