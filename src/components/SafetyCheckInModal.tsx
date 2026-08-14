import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  LifeBuoy,
  Home,
  Users,
  Phone,
  MapPin,
  X,
  CheckCircle2,
  Navigation,
  Loader2,
} from 'lucide-react';
import { ResidentSafetyReport, SafetyStatusType, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface SafetyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode: boolean;
  initialStatus?: SafetyStatusType;
  onSuccess?: (report: ResidentSafetyReport) => void;
}

export const SafetyCheckInModal: React.FC<SafetyCheckInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isDarkMode,
  initialStatus = 'safe',
  onSuccess,
}) => {
  const [status, setStatus] = useState<SafetyStatusType>(initialStatus);
  const [userName, setUserName] = useState(currentUser?.name || 'Resident');
  const [village, setVillage] = useState(currentUser?.village || 'Dzenje Village');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        alert('Could not acquire GPS position. Please check location permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    try {
      let statusLabel = 'Safe at Home';
      if (status === 'safe') statusLabel = 'Safe (Flood Waters Ended/Clear)';
      else if (status === 'evacuated') statusLabel = 'Evacuated to High Ground / Shelter';
      else if (status === 'in_flooding') statusLabel = 'In Flooding (Water Rising / At Risk)';
      else if (status === 'needs_help') statusLabel = 'Emergency Rescue Needed';

      const mapsUrl = latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : undefined;

      const report = await firebaseFloodService.submitSafetyReport({
        userId: currentUser?.uid || 'user_' + Math.random().toString(36).substring(2, 8),
        userName: userName.trim(),
        village: village.trim() || 'Dzenje Village',
        status,
        statusLabel,
        peopleCount: Number(peopleCount) || 1,
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        latitude,
        longitude,
        mapsUrl,
      });

      setSubmittedSuccess(true);
      if (onSuccess) onSuccess(report);

      setTimeout(() => {
        setSubmittedSuccess(false);
        setIsSubmitting(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Failed to submit status:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="safety-checkin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="safety-checkin-dialog"
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode
            ? 'bg-[#18181B] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                status === 'safe'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : status === 'evacuated'
                  ? 'bg-blue-500/20 text-blue-400'
                  : status === 'in_flooding'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400 animate-pulse'
              }`}
            >
              {status === 'safe' && <ShieldCheck className="w-5 h-5" />}
              {status === 'evacuated' && <Home className="w-5 h-5" />}
              {status === 'in_flooding' && <AlertTriangle className="w-5 h-5" />}
              {status === 'needs_help' && <LifeBuoy className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Mark Safety Status</h2>
              <p className="text-xs text-zinc-400">Recorded for Community & Admin Rescue Roll-Call</p>
            </div>
          </div>
          <button
            id="close-safety-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        {submittedSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold">Status Successfully Recorded</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Your status has been synced to the village roll-call and the Admin Rescue Dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Status Type Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Select Your Current Situation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="status-option-safe"
                  onClick={() => setStatus('safe')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'safe'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20'
                      : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>I Am Safe</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Floods ended / clear</span>
                </button>

                <button
                  type="button"
                  id="status-option-evacuated"
                  onClick={() => setStatus('evacuated')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'evacuated'
                      ? 'bg-blue-500/15 border-blue-500 text-blue-400 ring-2 ring-blue-500/20'
                      : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Home className="w-4 h-4 text-blue-400" />
                    <span>Evacuated</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">At shelter / high ground</span>
                </button>

                <button
                  type="button"
                  id="status-option-flooding"
                  onClick={() => setStatus('in_flooding')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'in_flooding'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 ring-2 ring-amber-500/20'
                      : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>In Flooding</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Water rising in yard/house</span>
                </button>

                <button
                  type="button"
                  id="status-option-needs-help"
                  onClick={() => setStatus('needs_help')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'needs_help'
                      ? 'bg-red-500/20 border-red-500 text-red-400 ring-2 ring-red-500/30 font-bold'
                      : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <LifeBuoy className="w-4 h-4 text-red-400" />
                    <span>Need Rescue</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Urgent rescue needed</span>
                </button>
              </div>
            </div>

            {/* Resident Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Your Full Name</label>
                <input
                  type="text"
                  id="safety-user-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Peter Damiano"
                  required
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Village / Location</label>
                <input
                  type="text"
                  id="safety-village-name"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Dzenje Village"
                  required
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Headcount & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Family Headcount
                  </span>
                </label>
                <input
                  type="number"
                  id="safety-people-count"
                  min="1"
                  max="50"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone / WhatsApp
                  </span>
                </label>
                <input
                  type="tel"
                  id="safety-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+265..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Optional Note / Message */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Situation Note / Description (Optional)
              </label>
              <textarea
                id="safety-message-input"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  status === 'safe'
                    ? 'e.g. Waters receded, all 4 family members safe at home.'
                    : status === 'evacuated'
                    ? 'e.g. Relocated to Dzenje Primary School classroom 3.'
                    : 'e.g. Water is knee high, on roof with 2 children, need boat.'
                }
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none resize-none ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* GPS Location Attachment */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                latitude && longitude
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  {latitude && longitude ? (
                    <span className="font-mono text-[11px]">
                      GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span>Add GPS coordinates for rescue dispatch</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                id="get-gps-coords-btn"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>{latitude ? 'Update GPS' : 'Attach GPS'}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                id="cancel-safety-btn"
                onClick={onClose}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isDarkMode
                    ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                id="confirm-safety-report-btn"
                disabled={isSubmitting || !userName.trim()}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                  status === 'safe'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                    : status === 'evacuated'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                    : status === 'in_flooding'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Submit Status</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
