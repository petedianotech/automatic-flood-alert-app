import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Bell,
  UserPlus,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Check,
} from 'lucide-react';
import {
  smsGatewayService,
  SmsGatewayConfig,
} from '../services/smsGatewayService';

interface SmsGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsGatewayModal: React.FC<SmsGatewayModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<SmsGatewayConfig>(() =>
    smsGatewayService.getConfig()
  );

  const [testMessage, setTestMessage] = useState(
    '[EVACUATE] Ruo Flood Alert!'
  );
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    error?: string;
  } | null>(null);

  // New recipient form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newVillage, setNewVillage] = useState('Dzenje Village');

  if (!isOpen) return null;

  const handleToggleAutoSend = () => {
    const newValue = !config.autoSendOnCriticalAlert;
    const updated = { ...config, autoSendOnCriticalAlert: newValue };
    setConfig(updated);
    smsGatewayService.saveConfig({ autoSendOnCriticalAlert: newValue });
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    smsGatewayService.addRecipient({
      name: newName.trim() || 'Village Resident',
      phone: newPhone.trim(),
      role: 'Registered Contact',
      village: newVillage.trim() || 'Dzenje Village',
      enabled: true,
    });

    setConfig(smsGatewayService.getConfig());
    setNewName('');
    setNewPhone('');
  };

  const handleRemoveRecipient = (id: string) => {
    smsGatewayService.removeRecipient(id);
    setConfig(smsGatewayService.getConfig());
  };

  const handleToggleRecipient = (id: string, enabled: boolean) => {
    smsGatewayService.toggleRecipient(id, enabled);
    setConfig(smsGatewayService.getConfig());
  };

  const handleSendTestBroadcast = async () => {
    setIsSending(true);
    setSendResult(null);

    const result = await smsGatewayService.sendBroadcastSms(testMessage);
    setIsSending(false);
    setSendResult(result);
  };

  const activeRecipients = smsGatewayService.getActiveRecipients();

  return (
    <div
      id="modal-sms-gateway"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#F3F3FA] rounded-[28px] max-w-lg w-full p-4 sm:p-6 text-[#1C1B1F] shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Material 3 Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#006A4E] text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1B1F] leading-tight">
                SMS Flood Warning Gateway
              </h2>
              <p className="text-xs text-[#49454F] mt-0.5">
                Send automatic text alerts to village phones via Textbee
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300/80 flex items-center justify-center text-[#49454F] transition active:scale-95 cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Connected Gateway Phone Card (Textbee) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#006A4E]" />
              <span className="text-xs font-bold text-[#1C1B1F]">
                Gateway Phone Connected
              </span>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Online (SM-A105F)</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-[#49454F] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Phone Model:</span>
              <span className="font-mono text-[#1C1B1F]">Samsung SM-A105F</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Textbee Device ID:</span>
              <span className="font-mono text-[#1C1B1F]">6a8fc290f3...</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">API Key Status:</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Connected & Ready</span>
              </span>
            </div>
          </div>

          {/* Auto-Send Switch */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#006A4E]" />
              <div>
                <span className="text-xs font-bold text-[#1C1B1F] block">
                  Automatic Flood Warning SMS
                </span>
                <span className="text-[11px] text-[#49454F]">
                  Send SMS immediately when water level turns RED critical
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoSend}
              className="text-[#006A4E] hover:opacity-90 transition cursor-pointer"
              title="Toggle automatic flood SMS"
            >
              {config.autoSendOnCriticalAlert ? (
                <ToggleRight className="w-8 h-8 text-[#006A4E]" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* 2. Village Phone Numbers List */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#1C1B1F] block">
                Emergency Contact Numbers
              </span>
              <span className="text-[11px] text-[#49454F]">
                {activeRecipients.length} phone number{activeRecipients.length === 1 ? '' : 's'} active to receive text alerts
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-[#006A4E] border border-slate-200">
              {config.recipients.length} Saved
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {config.recipients.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1">
                <p className="text-xs font-bold text-[#1C1B1F]">No Saved Numbers Yet</p>
                <p className="text-[11px] text-[#49454F]">
                  Add village numbers below. Residents can also register their phone numbers in the app.
                </p>
              </div>
            ) : (
              config.recipients.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                    rec.enabled
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-100/50 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={rec.enabled}
                      onChange={(e) => handleToggleRecipient(rec.id, e.target.checked)}
                      className="w-4 h-4 rounded-md accent-[#006A4E] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#1C1B1F] block truncate">
                        {rec.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#49454F]">
                        {rec.phone} • {rec.village}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(rec.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Delete number"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Phone Number Form */}
          <form onSubmit={handleAddRecipient} className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-[#49454F] flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>Add Village Phone Number</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Full Name (e.g., Chief Dzenje)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
              />
              <input
                type="tel"
                placeholder="Phone (e.g., +265999123456)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#1C1B1F] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 border border-slate-200"
            >
              <Plus className="w-4 h-4 text-[#006A4E]" />
              <span>Save Phone Number to App</span>
            </button>
          </form>
        </div>

        {/* 3. Send Warning Text Message Card */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 block">
              Send Emergency Text Message Now
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                testMessage.length <= 26
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {testMessage.length}/26 letters (Textbee limit)
            </span>
          </div>

          <textarea
            rows={2}
            value={testMessage}
            maxLength={26}
            onChange={(e) => setTestMessage(e.target.value.slice(0, 26))}
            className="w-full p-3 rounded-xl bg-white border border-emerald-300 text-xs text-[#1C1B1F] font-bold focus:outline-none focus:ring-2 focus:ring-[#006A4E] resize-none"
            placeholder="[EVACUATE] Ruo Flood Alert!"
          />

          <p className="text-[11px] text-emerald-900 leading-snug">
            Textbee sends short messages (up to 26 letters) fast to all village numbers.
          </p>

          <div className="space-y-2 pt-1">
            {/* Action 1: Textbee Gateway Dispatch */}
            <button
              type="button"
              onClick={handleSendTestBroadcast}
              disabled={isSending || activeRecipients.length === 0}
              className="w-full py-3 px-4 rounded-full bg-[#006A4E] hover:bg-emerald-800 active:scale-98 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <span>Sending via Samsung SM-A105F...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 fill-current" />
                  <span>Send SMS via Textbee ({activeRecipients.length} Phones)</span>
                </>
              )}
            </button>

            {/* Action 2: Direct Phone App Link */}
            <a
              href={smsGatewayService.getNativeSmsUrl(testMessage)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-emerald-100/50 border border-emerald-300 active:scale-98 text-emerald-900 text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer text-center"
            >
              <Phone className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>Open Phone SMS App</span>
            </a>
          </div>

          {/* Result Alert */}
          {sendResult && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                sendResult.success
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border border-red-200 text-red-950'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="leading-snug">
                {sendResult.success
                  ? `Success! Text warning sent via Textbee to ${sendResult.sentCount} village phone${sendResult.sentCount === 1 ? '' : 's'}.`
                  : sendResult.error || 'Failed to send text message.'}
              </span>
            </div>
          )}
        </div>

        {/* Modal Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-full bg-slate-200 hover:bg-slate-300 text-xs font-bold text-[#1C1B1F] transition cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4 text-[#006A4E]" />
          <span>Done</span>
        </button>

      </div>
    </div>
  );
};
