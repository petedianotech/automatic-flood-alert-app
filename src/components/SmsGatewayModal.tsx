import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  Send,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Check,
  Search,
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

  const [activeTab, setActiveTab] = useState<'all' | 'chichewa' | 'english' | 'marked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    chichewaCount?: number;
    englishCount?: number;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleRemoveRecipient = (id: string) => {
    smsGatewayService.removeRecipient(id);
    setConfig(smsGatewayService.getConfig());
  };

  const handleToggleRecipient = (id: string, enabled: boolean) => {
    smsGatewayService.toggleRecipient(id, enabled);
    setConfig(smsGatewayService.getConfig());
  };

  const handleChangeLanguage = (id: string, language: 'en' | 'ny') => {
    smsGatewayService.updateRecipientLanguage(id, language);
    setConfig(smsGatewayService.getConfig());
  };

  const handleMarkAll = (enabled: boolean, langFilter?: 'en' | 'ny') => {
    smsGatewayService.setAllRecipientsEnabled(enabled, langFilter);
    setConfig(smsGatewayService.getConfig());
  };

  const handleSendBroadcast = async () => {
    setIsSending(true);
    setSendResult(null);

    const result = await smsGatewayService.sendLanguageAwareBroadcastSms();
    setIsSending(false);
    setSendResult(result);
  };

  const recipients = config.recipients || [];
  const activeRecipients = recipients.filter((r) => r.enabled && r.phone.trim().length >= 6);

  // Chichewa vs English breakdowns
  const chichewaAll = recipients.filter((r) => (r.language || 'ny') === 'ny');
  const chichewaMarked = chichewaAll.filter((r) => r.enabled);

  const englishAll = recipients.filter((r) => r.language === 'en');
  const englishMarked = englishAll.filter((r) => r.enabled);

  // Filtered recipients according to search query and active tab
  const filteredRecipients = recipients.filter((rec) => {
    const recLang = rec.language || 'ny';
    if (activeTab === 'chichewa' && recLang !== 'ny') return false;
    if (activeTab === 'english' && recLang !== 'en') return false;
    if (activeTab === 'marked' && !rec.enabled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = rec.name.toLowerCase().includes(q);
      const matchPhone = rec.phone.toLowerCase().includes(q);
      const matchVillage = rec.village.toLowerCase().includes(q);
      return matchName || matchPhone || matchVillage;
    }
    return true;
  });

  return (
    <div
      id="modal-sms-gateway"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#F3F3FA] rounded-[28px] max-w-lg w-full p-4 sm:p-6 text-[#1C1B1F] shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006A4E] text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1B1F] leading-tight">
                SMS Flood Alert Gateway
              </h2>
              <p className="text-xs text-[#49454F]">
                Mark numbers to receive Chichewa or English SMS warnings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-[#49454F] transition active:scale-95 cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gateway Phone Status Only */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#006A4E]" />
            <div>
              <span className="text-xs font-bold text-[#1C1B1F] block">
                Gateway Phone
              </span>
              <span className="text-[11px] text-[#49454F]">
                Sends flood alerts directly to local SIMs
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Online & Ready</span>
          </span>
        </div>

        {/* Language Summary & Mark Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1C1B1F]">
              Marked Numbers: {activeRecipients.length} of {recipients.length}
            </span>
            <span className="text-[11px] text-[#49454F] font-medium">
              Tap checkbox to mark
            </span>
          </div>

          {/* Chichewa & English Status Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Chichewa Card */}
            <div
              onClick={() => setActiveTab(activeTab === 'chichewa' ? 'all' : 'chichewa')}
              className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                activeTab === 'chichewa'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                  <span>🇲🇼</span>
                  <span>Chichewa SMS</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  {chichewaMarked.length} marked
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-emerald-900">
                {chichewaMarked.length} of {chichewaAll.length} accounts marked
              </p>
            </div>

            {/* English Card */}
            <div
              onClick={() => setActiveTab(activeTab === 'english' ? 'all' : 'english')}
              className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                activeTab === 'english'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                  <span>🇬🇧</span>
                  <span>English SMS</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  {englishMarked.length} marked
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-blue-900">
                {englishMarked.length} of {englishAll.length} accounts marked
              </p>
            </div>
          </div>

          {/* Quick Mark Buttons */}
          <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-slate-100">
            <span className="font-bold text-[#49454F]">Quick:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleMarkAll(true, 'ny')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold transition cursor-pointer"
              >
                Mark All Chichewa (🇲🇼)
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition cursor-pointer"
              >
                Mark All
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition cursor-pointer"
              >
                Unmark All
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, village, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Numbers List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
            {filteredRecipients.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-[#49454F]">
                No registered numbers match this view.
              </div>
            ) : (
              filteredRecipients.map((rec) => {
                const isChichewa = (rec.language || 'ny') === 'ny';
                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-2xl border transition flex flex-col gap-2 ${
                      rec.enabled
                        ? 'bg-white border-emerald-300 shadow-2xs ring-1 ring-emerald-200/50'
                        : 'bg-slate-50/70 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Checkbox and Contact info */}
                      <button
                        type="button"
                        onClick={() => handleToggleRecipient(rec.id, !rec.enabled)}
                        className="flex items-center gap-2.5 text-left cursor-pointer grow min-w-0"
                      >
                        <div className="shrink-0">
                          {rec.enabled ? (
                            <div className="w-5 h-5 rounded-md bg-[#006A4E] text-white flex items-center justify-center shadow-2xs">
                              <Check className="w-3.5 h-3.5 stroke-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#1C1B1F] truncate">
                              {rec.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                              {rec.village}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#49454F] block">
                            {rec.phone}
                          </span>
                        </div>
                      </button>

                      {/* Delete Contact */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(rec.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-600 flex items-center justify-center transition cursor-pointer shrink-0"
                        title="Remove number"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Language Badge & Status */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[10px]">Gets:</span>
                        <button
                          type="button"
                          onClick={() => handleChangeLanguage(rec.id, isChichewa ? 'en' : 'ny')}
                          className={`px-2 py-0.5 rounded-full font-bold border transition cursor-pointer flex items-center gap-1 ${
                            isChichewa
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                          }`}
                          title="Click to switch language"
                        >
                          <span>{isChichewa ? '🇲🇼 Chichewa SMS' : '🇬🇧 English SMS'}</span>
                          <span className="text-[9px] text-slate-400 underline">switch</span>
                        </button>
                      </div>

                      <div>
                        {rec.enabled ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            ✓ Ready to Receive
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                            Unmarked (No SMS)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Send Emergency Warning Action */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={isSending || activeRecipients.length === 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#006A4E] hover:bg-emerald-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <span>Sending SMS Warning...</span>
            ) : (
              <>
                <Send className="w-4 h-4 fill-current" />
                <span>
                  Send Flood Warning to {activeRecipients.length} Marked Phone{activeRecipients.length === 1 ? '' : 's'}
                </span>
              </>
            )}
          </button>

          {/* Feedback message */}
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
                  ? `Success! Emergency text sent to ${sendResult.sentCount} marked phone${sendResult.sentCount === 1 ? '' : 's'} (${sendResult.chichewaCount || 0} Chichewa, ${sendResult.englishCount || 0} English).`
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
