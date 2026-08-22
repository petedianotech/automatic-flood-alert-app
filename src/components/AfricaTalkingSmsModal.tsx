import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  ShieldCheck,
  Info,
  Radio,
  ExternalLink,
  Users,
  Copy
} from 'lucide-react';
import { SmsService, SmsStatus, EmergencyContact } from '../services/smsService';
import { UserProfile } from '../types';

interface AfricaTalkingSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isAdmin: boolean;
}

export const AfricaTalkingSmsModal: React.FC<AfricaTalkingSmsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdmin,
}) => {
  const [smsStatus, setSmsStatus] = useState<SmsStatus | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => SmsService.getContacts());
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('Community Member');

  const [broadcastMessage, setBroadcastMessage] = useState(
    '🚨 CHENJEZO LA CHIGUMULA: Madzi a m\'tsinje wa Dzenje akukwera. Samukani ku malo okwera msanga! / FLOOD ALERT: Dzenje River water is rising. Evacuate to high ground immediately! - Dzenje CDSS STEM Station'
  );
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      SmsService.checkStatus().then(setSmsStatus);
      setContacts(SmsService.getContacts());
      setSendResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const created = SmsService.addContact({
      name: newName.trim(),
      phone: newPhone.trim(),
      role: newRole,
      village: currentUser?.village || 'Dzenje Village',
    });

    setContacts(SmsService.getContacts());
    setNewName('');
    setNewPhone('');
  };

  const handleDeleteContact = (id: string) => {
    SmsService.deleteContact(id);
    setContacts(SmsService.getContacts());
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setIsSending(true);
    setSendResult(null);

    const validPhones = contacts.map((c) => c.phone).filter((p) => p && p.trim() !== '');

    if (validPhones.length === 0) {
      setSendResult({
        success: false,
        message: 'No contact phone numbers found in the list. Please add at least one phone number below.',
      });
      setIsSending(false);
      return;
    }

    const res = await SmsService.sendSms(validPhones, broadcastMessage.trim());

    setIsSending(false);
    if (res.success) {
      setSendResult({
        success: true,
        message: `SMS successfully dispatched to ${res.recipientsCount || validPhones.length} emergency contacts via Africa's Talking!`,
      });
    } else {
      setSendResult({
        success: false,
        message: res.error || 'Failed to send SMS. Please check your credentials.',
      });
    }
  };

  return (
    <div
      id="modal-africastalking-sms"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1D4ED8] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Africa's Talking SMS Broadcast
              </h2>
              <p className="text-xs text-blue-100 font-semibold">
                Send emergency SMS alerts directly to phones across Dzenje Village
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
          {/* 1. Connection Status Banner */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
              smsStatus?.configured
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                : 'bg-amber-50 border-amber-500 text-amber-950'
            }`}
          >
            {smsStatus?.configured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">
                  {smsStatus?.configured
                    ? "Africa's Talking SMS API Connected"
                    : "Africa's Talking Credentials Needed"}
                </span>
                {smsStatus?.isSandbox && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-[10px]">
                    Sandbox Mode
                  </span>
                )}
              </div>
              <p className="font-medium text-slate-800 leading-relaxed">
                {smsStatus?.configured
                  ? `Connected with username ${smsStatus.username || 'active'}. You can send real emergency SMS messages to village contacts.`
                  : "To send live SMS alerts, add AFRICAS_TALKING_API_KEY and AFRICAS_TALKING_USERNAME to your environment settings."}
              </p>
            </div>
          </div>

          {/* 2. Broadcast Message Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Radio className="w-4 h-4 text-red-600" />
                Emergency SMS Message (Chichewa &amp; English)
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                {broadcastMessage.length} chars
              </span>
            </div>

            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={3}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Enter flood emergency warning message..."
            />

            {sendResult && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  sendResult.success
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-red-100 text-red-900 border border-red-300'
                }`}
              >
                {sendResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                )}
                <span>{sendResult.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSendBroadcast}
              disabled={isSending || contacts.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'Sending SMS to Community...'
                  : `Send Emergency SMS Broadcast (${contacts.length} Phones)`}
              </span>
            </button>
          </div>

          {/* 3. Emergency Contacts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Registered Village Emergency Contacts ({contacts.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden max-h-48 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">
                  No emergency contacts registered yet. Add local numbers below.
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {contact.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                          {contact.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{contact.phone}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800">Add New Village Contact</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Full Name (e.g. Chief Banda)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g. +265991234567 or 0991234567)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none flex-1"
                >
                  <option value="Village Head">Village Leader / Chief</option>
                  <option value="Rescue Warden">Community Rescue Warden</option>
                  <option value="CDSS STEM Station">Dzenje CDSS STEM Station</option>
                  <option value="Health Clinic">Local Health Clinic</option>
                  <option value="Family Member">Family / Resident</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Phone</span>
                </button>
              </div>
            </form>
          </div>

          {/* 4. Help / Setup Instructions */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-2 text-slate-800">
            <div className="flex items-center gap-1.5 font-black text-blue-950">
              <Info className="w-4 h-4 text-blue-700" />
              <span>How to setup Africa's Talking API Credentials:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
              <li>
                Sign in to your account at{' '}
                <a
                  href="https://africastalking.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-700 underline inline-flex items-center gap-0.5"
                >
                  africastalking.com <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                In the Africa's Talking dashboard, click <strong>Settings → API Key</strong> and copy your key.
              </li>
              <li>
                In Google AI Studio, open <strong>Settings / Environment</strong> and add:
                <div className="font-mono text-[11px] bg-white p-2 rounded-lg border border-blue-200 mt-1 space-y-0.5 text-blue-900">
                  <div>AFRICAS_TALKING_API_KEY = your_api_key</div>
                  <div>AFRICAS_TALKING_USERNAME = your_username (or sandbox)</div>
                  <div>AFRICAS_TALKING_SENDER_ID = optional_sender_id</div>
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
