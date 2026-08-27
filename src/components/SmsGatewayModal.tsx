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
  Radio,
  Wifi,
  Cloud,
  Check,
  Phone,
} from 'lucide-react';
import {
  smsGatewayService,
  SmsGatewayConfig,
  SmsRecipient,
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

  // New recipient state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('Village Resident');
  const [newVillage, setNewVillage] = useState('Dzenje Village');

  if (!isOpen) return null;

  const handleSaveConfig = (updates: Partial<SmsGatewayConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    smsGatewayService.saveConfig(updates);
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    smsGatewayService.addRecipient({
      name: newName.trim() || 'Village Contact',
      phone: newPhone.trim(),
      role: newRole.trim(),
      village: newVillage.trim(),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#F3F3FA] rounded-[28px] max-w-lg w-full p-5 sm:p-6 text-[#1C1B1F] shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006A4E] text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1B1F] leading-tight">
                Textbee SMS Alert Broadcast
              </h2>
              <p className="text-xs text-[#49454F]">
                Automatic flood alerts sent via your Samsung SM-A105F gateway phone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#49454F] transition active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Textbee Device Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1C1B1F] flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#006A4E]" />
              <span>samsung SM-A105F Connected</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Online Gateway</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-[#49454F]">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-700 break-all space-y-1">
              <div>
                <span className="font-sans font-bold text-slate-500 block text-[10px] uppercase">
                  Textbee Device ID:
                </span>
                {config.textbeeDeviceId || '6a8fc290f3dc6f0f7b175829'}
              </div>
              <div className="pt-1 border-t border-slate-200/60">
                <span className="font-sans font-bold text-slate-500 block text-[10px] uppercase">
                  Textbee API Key:
                </span>
                txb_qFXRYTTd...
              </div>
            </div>
          </div>
        </div>

        {/* Sending Method Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#49454F] px-1 uppercase tracking-wide">
            Sending Method
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSaveConfig({ gatewayType: 'textbee' })}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                config.gatewayType === 'textbee' || !config.gatewayType
                  ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Cloud className={`w-4 h-4 ${config.gatewayType === 'textbee' ? 'text-emerald-700' : 'text-slate-500'}`} />
                {(config.gatewayType === 'textbee' || !config.gatewayType) && <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />}
              </div>
              <span className="text-xs font-bold text-[#1C1B1F]">Textbee Gateway</span>
              <span className="text-[11px] text-[#49454F]">samsung SM-A105F</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveConfig({ gatewayType: 'traccar_cloud' })}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                config.gatewayType === 'traccar_cloud'
                  ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Wifi className={`w-4 h-4 ${config.gatewayType === 'traccar_cloud' ? 'text-emerald-700' : 'text-slate-500'}`} />
                {config.gatewayType === 'traccar_cloud' && <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />}
              </div>
              <span className="text-xs font-bold text-[#1C1B1F]">Traccar Cloud</span>
              <span className="text-[11px] text-[#49454F]">FCM relay token</span>
            </button>
          </div>
        </div>

        {/* Recipients List in App */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#1C1B1F] block">
                Emergency Contact List ({activeRecipients.length} Active)
              </span>
              <span className="text-[11px] text-[#49454F]">
                Residents from your database receiving automatic SMS
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {config.recipients.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1">
                <p className="text-xs font-bold text-[#1C1B1F]">No Phone Numbers in Database Yet</p>
                <p className="text-[11px] text-[#49454F]">
                  Add phone numbers below or ask residents to save their number during sign-in.
                </p>
              </div>
            ) : (
              config.recipients.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={rec.enabled}
                      onChange={(e) => handleToggleRecipient(rec.id, e.target.checked)}
                      className="w-4 h-4 rounded-md accent-[#006A4E] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#1C1B1F] block truncate">
                        {rec.name} ({rec.village})
                      </span>
                      <span className="text-[11px] font-mono text-[#49454F]">
                        {rec.phone} • {rec.role}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(rec.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition cursor-pointer"
                    title="Remove number"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Recipient Form */}
          <form onSubmit={handleAddRecipient} className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-[#49454F] block">
              Add Phone Number to App
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Phone Number to App</span>
            </button>
          </form>
        </div>

        {/* Test Broadcast Actions */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 block">
              Send Emergency Warning SMS
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                testMessage.length <= 26
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {testMessage.length}/26 chars (Max 26 limit)
            </span>
          </div>

          <textarea
            rows={2}
            value={testMessage}
            maxLength={26}
            onChange={(e) => setTestMessage(e.target.value.slice(0, 26))}
            className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-xs text-[#1C1B1F] font-medium focus:outline-none focus:ring-2 focus:ring-[#006A4E] resize-none"
            placeholder="[EVACUATE] Ruo Flood Alert!"
          />

          <div className="space-y-2">
            {/* Method 1: Textbee Automated Device Dispatch */}
            <button
              type="button"
              onClick={handleSendTestBroadcast}
              disabled={isSending || activeRecipients.length === 0}
              className="w-full py-3 px-4 rounded-full bg-[#006A4E] hover:bg-emerald-800 active:scale-98 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <span>Sending via samsung SM-A105F...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-current" />
                  <span>Send via Textbee to {activeRecipients.length} Contacts</span>
                </>
              )}
            </button>

            {/* Method 2: Direct Phone SIM */}
            <a
              href={smsGatewayService.getNativeSmsUrl(testMessage)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-emerald-100/50 border border-emerald-300 active:scale-98 text-emerald-900 text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer text-center"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Open Phone SMS App directly</span>
            </a>
          </div>

          {sendResult && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                sendResult.success
                  ? 'bg-emerald-100/80 border border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border border-red-200 text-red-950'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="leading-snug">
                {sendResult.success
                  ? `SMS sent via Textbee Gateway! Sent to ${sendResult.sentCount} contacts.`
                  : sendResult.error || 'Textbee dispatch failed.'}
              </span>
            </div>
          )}
        </div>

        {/* Footer Done */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-full bg-[#1C1B1F] hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer transition active:scale-98"
        >
          Done
        </button>
      </div>
    </div>
  );
};
