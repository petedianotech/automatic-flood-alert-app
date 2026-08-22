import React, { useState, useEffect } from 'react';
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
  Check,
} from 'lucide-react';
import { ResidentSafetyReport, SafetyStatusType, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface SafetyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode?: boolean;
  initialStatus?: SafetyStatusType;
  autoStartVoice?: boolean;
  onSuccess?: (report: ResidentSafetyReport) => void;
}

export const SafetyCheckInModal: React.FC<SafetyCheckInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialStatus = 'safe',
  onSuccess,
}) => {
  const [status, setStatus] = useState<SafetyStatusType>(initialStatus);
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [village, setVillage] = useState(currentUser?.village || 'Dzenje Village');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>();
  const [locationStatusText, setLocationStatusText] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (!userName) setUserName(currentUser.name);
      if (currentUser.village) setVillage(currentUser.village);
    }
  }, [currentUser]);

  // Village GPS default coordinate presets (Mulanje District, Malawi)
  const VILLAGE_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
    'Dzenje Village': { lat: -15.9867, lng: 35.5422, label: 'Dzenje Village, Ruo River Area' },
    'Machokola': { lat: -15.9715, lng: 35.5310, label: 'Machokola River Watch Post' },
    'Mathambi': { lat: -16.0120, lng: 35.5560, label: 'Mathambi Flood Basin' },
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      // Fallback to village preset
      const preset = VILLAGE_COORDS[village] || VILLAGE_COORDS['Dzenje Village'];
      setLatitude(preset.lat);
      setLongitude(preset.lng);
      setLocationStatusText(`Using ${preset.label} preset GPS`);
      return;
    }

    setIsLocating(true);
    setLocationStatusText('Getting GPS satellite location...');

    // Attempt high accuracy first with 8s timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAccuracyMeters(Math.round(position.coords.accuracy));
        setLocationStatusText(`GPS attached (±${Math.round(position.coords.accuracy)}m accuracy)`);
        setIsLocating(false);
      },
      (error) => {
        console.warn('High-accuracy GPS failed, trying standard accuracy:', error);
        // Fallback attempt with standard accuracy
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
            setAccuracyMeters(Math.round(position.coords.accuracy));
            setLocationStatusText(`GPS attached (±${Math.round(position.coords.accuracy)}m)`);
            setIsLocating(false);
          },
          () => {
            // If GPS permission blocked or unavailable, use village preset so the user can still attach location
            const preset = VILLAGE_COORDS[village] || VILLAGE_COORDS['Dzenje Village'];
            setLatitude(preset.lat);
            setLongitude(preset.lng);
            setLocationStatusText(`GPS access blocked. Set to ${village} center point.`);
            setIsLocating(false);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const handleClearLocation = () => {
    setLatitude(undefined);
    setLongitude(undefined);
    setAccuracyMeters(undefined);
    setLocationStatusText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    try {
      let statusLabel = 'Safe at Home';
      if (status === 'safe') statusLabel = 'Safe (Flood Waters Clear)';
      else if (status === 'evacuated') statusLabel = 'In Safe Shelter';
      else if (status === 'in_flooding') statusLabel = 'Water Rising Near House';
      else if (status === 'needs_help') statusLabel = 'Rescue Needed';

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
      }, 1000);
    } catch (err) {
      console.error('Failed to submit status:', err);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="safety-checkin-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 select-none"
    >
      <div
        id="safety-checkin-dialog"
        className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-200 bg-[#FEF7FF] text-[#1C1B1F] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Mobile Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Top Bar Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="App Icon"
              className="w-9 h-9 rounded-xl object-cover shadow-2xs shrink-0"
            />
            <div>
              <h2 className="text-sm font-bold leading-tight text-[#1C1B1F]">
                Automatic Flood Alert App
              </h2>
              <p className="text-xs font-medium text-[#49454F] mt-0.5">
                Dzenje CDSS ADDA STEM CLUB • Safety Check-In
              </p>
            </div>
          </div>
          <button
            id="close-safety-modal-btn"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F3EDF7] hover:bg-[#E7E0EC] text-[#1C1B1F] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body Content */}
        {submittedSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1B1F]">Status Saved!</h3>
            <p className="text-sm text-[#49454F] max-w-xs font-medium">
              Your safety status has been recorded on the community dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Status Type Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                Select Your Safety Status
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Safe */}
                <button
                  type="button"
                  id="status-option-safe"
                  onClick={() => setStatus('safe')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    status === 'safe'
                      ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-xs'
                      : 'bg-[#F3F3FA] border border-slate-200 text-[#1C1B1F] hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>I Am Safe</span>
                    </div>
                    {status === 'safe' && <Check className="w-4 h-4 text-emerald-700" />}
                  </div>
                  <span className="text-xs text-emerald-700 font-medium">No flood near me</span>
                </button>

                {/* 2. Evacuated to Shelter */}
                <button
                  type="button"
                  id="status-option-evacuated"
                  onClick={() => setStatus('evacuated')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    status === 'evacuated'
                      ? 'bg-blue-50 border-2 border-[#1F71E8] text-blue-950 shadow-xs'
                      : 'bg-[#F3F3FA] border border-slate-200 text-[#1C1B1F] hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-blue-800">
                    <div className="flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-[#1F71E8] shrink-0" />
                      <span>At Shelter</span>
                    </div>
                    {status === 'evacuated' && <Check className="w-4 h-4 text-[#1F71E8]" />}
                  </div>
                  <span className="text-xs text-blue-700 font-medium">At school / hall</span>
                </button>

                {/* 3. Water Rising */}
                <button
                  type="button"
                  id="status-option-flooding"
                  onClick={() => setStatus('in_flooding')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    status === 'in_flooding'
                      ? 'bg-amber-50 border-2 border-amber-600 text-amber-950 shadow-xs'
                      : 'bg-[#F3F3FA] border border-slate-200 text-[#1C1B1F] hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-amber-800">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Water Rising</span>
                    </div>
                    {status === 'in_flooding' && <Check className="w-4 h-4 text-amber-700" />}
                  </div>
                  <span className="text-xs text-amber-700 font-medium">Water near house</span>
                </button>

                {/* 4. Need Help / Rescue */}
                <button
                  type="button"
                  id="status-option-needs-help"
                  onClick={() => setStatus('needs_help')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    status === 'needs_help'
                      ? 'bg-red-50 border-2 border-red-600 text-red-950 shadow-xs'
                      : 'bg-[#F3F3FA] border border-slate-200 text-[#1C1B1F] hover:border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-red-800">
                    <div className="flex items-center gap-1.5">
                      <LifeBuoy className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Need Help</span>
                    </div>
                    {status === 'needs_help' && <Check className="w-4 h-4 text-red-700" />}
                  </div>
                  <span className="text-xs text-red-700 font-medium">Help needed urgently</span>
                </button>
              </div>
            </div>

            {/* Resident Name & Village */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1C1B1F]">
                  Your Full Name
                </label>
                <input
                  type="text"
                  id="safety-user-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Peter Damiano"
                  required
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-2xl border border-slate-200 bg-white text-[#1C1B1F] placeholder-slate-400 outline-none focus:border-[#1F71E8] focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1C1B1F]">
                  Village Location
                </label>
                <input
                  type="text"
                  id="safety-village-name"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Dzenje Village"
                  required
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-2xl border border-slate-200 bg-white text-[#1C1B1F] placeholder-slate-400 outline-none focus:border-[#1F71E8] focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                  {['Dzenje Village', 'Machokola', 'Mathambi'].map((vName) => (
                    <button
                      key={vName}
                      type="button"
                      onClick={() => setVillage(vName)}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition cursor-pointer shrink-0 ${
                        village.toLowerCase() === vName.toLowerCase()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {vName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Headcount & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1C1B1F] flex items-center gap-1">
                  <Users className="w-4 h-4 text-[#1F71E8]" /> People with you
                </label>
                <input
                  type="number"
                  id="safety-people-count"
                  min="1"
                  max="50"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-2xl border border-slate-200 bg-white text-[#1C1B1F] placeholder-slate-400 outline-none focus:border-[#1F71E8] focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1C1B1F] flex items-center gap-1">
                  <Phone className="w-4 h-4 text-emerald-600" /> Phone (optional)
                </label>
                <input
                  type="tel"
                  id="safety-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0888..."
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-2xl border border-slate-200 bg-white text-[#1C1B1F] placeholder-slate-400 outline-none focus:border-[#1F71E8] focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
              </div>
            </div>

            {/* Optional Short Note */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1C1B1F]">
                Short Note (optional)
              </label>
              <textarea
                id="safety-message-input"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Water is low, family is safe at home."
                className="w-full px-3.5 py-2.5 text-sm font-medium rounded-2xl border border-slate-200 bg-white text-[#1C1B1F] placeholder-slate-400 outline-none resize-none focus:border-[#1F71E8] focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            </div>

            {/* GPS Location Attachment */}
            <div className="bg-[#F3F3FA] rounded-2xl p-3.5 border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${latitude ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#1C1B1F] block truncate">
                      {latitude && longitude
                        ? `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                        : 'Attach GPS Location'}
                    </span>
                    <span className="text-[11px] text-[#49454F] block">
                      {locationStatusText || (latitude ? 'Location ready to send to admin' : 'Sends precise pin to rescue team')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {latitude && (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Clear attached GPS"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    id="get-gps-coords-btn"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                      latitude
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-[#1F71E8] hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    <span>{latitude ? 'Update GPS' : 'Attach GPS'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Village Presets if GPS not yet attached */}
              {!latitude && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    Or select area:
                  </span>
                  {Object.entries(VILLAGE_COORDS).map(([name, coords]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setLatitude(coords.lat);
                        setLongitude(coords.lng);
                        setLocationStatusText(`Attached ${name} center point`);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white hover:bg-blue-50 text-[#1F71E8] border border-slate-200 hover:border-blue-300 transition cursor-pointer shrink-0"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                id="cancel-safety-btn"
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-full text-sm font-bold bg-[#F3EDF7] hover:bg-[#E7E0EC] text-[#1C1B1F] transition active:scale-98 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="confirm-safety-report-btn"
                disabled={isSubmitting || !userName.trim()}
                className="flex-1 py-3.5 px-4 rounded-full text-sm font-bold bg-[#1F71E8] hover:bg-blue-700 text-white shadow-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Save Safety Status</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
