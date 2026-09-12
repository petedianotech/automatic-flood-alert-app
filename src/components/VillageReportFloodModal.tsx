import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  MapPin,
  X,
  CheckCircle2,
  Navigation,
  Loader2,
  Phone,
  Mic,
  Square,
  Play,
  RotateCcw,
  Volume2,
  Send,
  Droplets,
  Building,
  Check,
} from 'lucide-react';
import { ResidentSafetyReport, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface VillageReportFloodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  selectedVillage?: string;
  onSuccess?: (report: ResidentSafetyReport) => void;
}

const WATER_CONDITIONS = [
  { id: 'river_overflow', label: 'River overflowing banks', icon: Droplets, severity: 'high' as const },
  { id: 'bridge_flooded', label: 'Bridge or road covered by water', icon: Navigation, severity: 'high' as const },
  { id: 'homes_threatened', label: 'Water entering houses / compounds', icon: Building, severity: 'critical' as const },
  { id: 'mountain_runoff', label: 'Flash flood rushing from mountain', icon: AlertTriangle, severity: 'critical' as const },
  { id: 'water_rising', label: 'River water level rising quickly', icon: Droplets, severity: 'medium' as const },
];

export const VillageReportFloodModal: React.FC<VillageReportFloodModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedVillage = 'Dzenje Village',
  onSuccess,
}) => {
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [village, setVillage] = useState(currentUser?.village || selectedVillage);
  const [selectedCondition, setSelectedCondition] = useState<string>('river_overflow');
  const [waterLevel, setWaterLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // GPS Location state
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>();
  const [locationStatusText, setLocationStatusText] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);

  // Audio Voice Note recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceAudioBase64, setVoiceAudioBase64] = useState<string | undefined>();
  const [voiceDurationSec, setVoiceDurationSec] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (!userName && currentUser.name) setUserName(currentUser.name);
      if (currentUser.village) setVillage(currentUser.village);
      if (currentUser.phone && !phone) setPhone(currentUser.phone);
    } else if (selectedVillage) {
      setVillage(selectedVillage);
    }
  }, [currentUser, selectedVillage]);

  // Village GPS default coordinate presets (Mulanje District, Malawi)
  const VILLAGE_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
    'Dzenje Village': { lat: -15.9867, lng: 35.5422, label: 'Dzenje Village, Ruo River Area' },
    'Machokola': { lat: -15.9715, lng: 35.5310, label: 'Machokola River Post' },
    'Mathambi': { lat: -16.0120, lng: 35.5560, label: 'Mathambi Flood Basin' },
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      const preset = VILLAGE_COORDS[village] || VILLAGE_COORDS['Dzenje Village'];
      setLatitude(preset.lat);
      setLongitude(preset.lng);
      setLocationStatusText(`Using ${preset.label} preset GPS`);
      return;
    }

    setIsLocating(true);
    setLocationStatusText('Acquiring satellite GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracyMeters(Math.round(pos.coords.accuracy));
        setLocationStatusText(`GPS Attached (±${Math.round(pos.coords.accuracy)}m accuracy)`);
        setIsLocating(false);
      },
      (err) => {
        console.warn('High accuracy GPS error, trying fallback:', err);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLatitude(pos.coords.latitude);
            setLongitude(pos.coords.longitude);
            setAccuracyMeters(Math.round(pos.coords.accuracy));
            setLocationStatusText(`GPS Attached (±${Math.round(pos.coords.accuracy)}m)`);
            setIsLocating(false);
          },
          () => {
            const preset = VILLAGE_COORDS[village] || VILLAGE_COORDS['Dzenje Village'];
            setLatitude(preset.lat);
            setLongitude(preset.lng);
            setLocationStatusText(`GPS unavailable. Set to ${village} location.`);
            setIsLocating(false);
          },
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
    );
  };

  const handleClearLocation = () => {
    setLatitude(undefined);
    setLongitude(undefined);
    setAccuracyMeters(undefined);
    setLocationStatusText('');
  };

  // Voice Note Recording
  const startVoiceRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setVoiceAudioBase64(base64Audio);
          setVoiceDurationSec(recordingSeconds || 3);
        };
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 20) {
            stopVoiceRecording();
            return 20;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone recording error:', err);
      setErrorMessage('Microphone access was denied or not supported on this device.');
    }
  };

  const stopVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
  };

  const clearVoiceRecording = () => {
    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setIsPlayingPreview(false);
    setVoiceAudioBase64(undefined);
    setVoiceDurationSec(0);
    setRecordingSeconds(0);
  };

  const togglePlayPreview = () => {
    if (!voiceAudioBase64) return;
    if (isPlayingPreview) {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    const audio = new Audio(voiceAudioBase64);
    previewAudioRef.current = audio;
    setIsPlayingPreview(true);
    audio.onended = () => setIsPlayingPreview(false);
    audio.onerror = () => setIsPlayingPreview(false);
    audio.play().catch(() => setIsPlayingPreview(false));
  };

  // Reset when closing
  const handleCloseModal = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setIsRecordingVoice(false);
    setSubmittedSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMessage('Please enter your name so the flood team knows who reported.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const conditionObj = WATER_CONDITIONS.find((c) => c.id === selectedCondition);
      const conditionTitle = conditionObj ? conditionObj.label : 'Flood water sighting';
      const mapsUrl = latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : undefined;

      const fullDescription = [
        conditionTitle,
        landmark.trim() ? `Location/Landmark: ${landmark.trim()}` : null,
        notes.trim() ? `Notes: ${notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const report: ResidentSafetyReport = await firebaseFloodService.submitSafetyReport({
        userId: currentUser?.uid || 'guest_' + Math.random().toString(36).substring(2, 9),
        userName: userName.trim(),
        village: village.trim() || selectedVillage || 'Dzenje Village',
        status: 'flood_sighting',
        statusLabel: `Flood Sighting: ${conditionTitle}`,
        peopleCount: 1,
        phone: phone.trim() || undefined,
        message: fullDescription,
        latitude,
        longitude,
        mapsUrl,
        floodLevel: waterLevel,
        waterDescription: conditionTitle,
        landmark: landmark.trim() || undefined,
        reportType: 'flood_sighting',
        voiceAudioBase64,
        voiceDurationSec: voiceAudioBase64 ? voiceDurationSec : undefined,
        hasVoiceNote: Boolean(voiceAudioBase64),
      });

      setSubmittedSuccess(true);
      if (onSuccess) onSuccess(report);
    } catch (err) {
      console.error('Failed to submit flood report:', err);
      setErrorMessage('Could not send report. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-[#1F71E8] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Report Flooding to Admin
              </h3>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Tell the flood team what you see with your location
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-[#1C1B1F]">
          {submittedSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-lg sm:text-xl text-[#1C1B1F]">
                  Flood Report Sent!
                </h4>
                <p className="text-xs sm:text-sm text-[#49454F] max-w-xs mx-auto">
                  Thank you for keeping our village safe. The admin has received your alert with your attached location.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full py-3 px-4 rounded-full bg-[#1F71E8] text-white font-bold text-sm shadow-xs hover:bg-blue-700 active:scale-98 transition cursor-pointer"
                >
                  Back to Village View
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Step 1: Reporter Info */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                  1. Your Information
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Peter Damiano"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F3FA] border border-slate-200 text-xs font-medium text-[#1C1B1F] focus:outline-none focus:ring-2 focus:ring-[#1F71E8]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Village *
                    </label>
                    <select
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F3FA] border border-slate-200 text-xs font-medium text-[#1C1B1F] focus:outline-none focus:ring-2 focus:ring-[#1F71E8]"
                    >
                      <option value="Dzenje Village">Dzenje Village</option>
                      <option value="Machokola">Machokola</option>
                      <option value="Mathambi">Mathambi</option>
                      <option value="Other Area">Other Village / Area</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: What Flood Event Did You See? */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                  2. What did you see?
                </label>
                <div className="space-y-1.5">
                  {WATER_CONDITIONS.map((cond) => {
                    const isSelected = selectedCondition === cond.id;
                    const IconComp = cond.icon;
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => setSelectedCondition(cond.id)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer active:scale-99 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-200'
                            : 'bg-[#F3F3FA] border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-[#1C1B1F]'}`}>
                            {cond.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Water Level / Danger */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                  3. Water Depth &amp; Speed
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setWaterLevel('low')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                      waterLevel === 'low'
                        ? 'bg-blue-50 border-blue-600 font-bold text-blue-900 ring-2 ring-blue-200'
                        : 'bg-[#F3F3FA] border-slate-200 text-[#49454F]'
                    }`}
                  >
                    <span className="block text-xs font-bold">Ankle Deep</span>
                    <span className="text-[10px] text-slate-500">Low / Slow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaterLevel('medium')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                      waterLevel === 'medium'
                        ? 'bg-amber-50 border-amber-500 font-bold text-amber-900 ring-2 ring-amber-200'
                        : 'bg-[#F3F3FA] border-slate-200 text-[#49454F]'
                    }`}
                  >
                    <span className="block text-xs font-bold">Knee Deep</span>
                    <span className="text-[10px] text-slate-500">Road covered</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaterLevel('high')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                      waterLevel === 'high'
                        ? 'bg-orange-50 border-orange-600 font-bold text-orange-900 ring-2 ring-orange-200'
                        : 'bg-[#F3F3FA] border-slate-200 text-[#49454F]'
                    }`}
                  >
                    <span className="block text-xs font-bold">Waist Deep</span>
                    <span className="text-[10px] text-slate-500">Very dangerous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaterLevel('critical')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                      waterLevel === 'critical'
                        ? 'bg-red-50 border-red-600 font-bold text-red-900 ring-2 ring-red-200'
                        : 'bg-[#F3F3FA] border-slate-200 text-[#49454F]'
                    }`}
                  >
                    <span className="block text-xs font-bold">Fast Rushing</span>
                    <span className="text-[10px] text-slate-500">Flash Flood</span>
                  </button>
                </div>
              </div>

              {/* Step 4: Attach Location (GPS & Landmark) */}
              <div className="space-y-2 p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#1F71E8]" />
                    <span className="text-xs font-bold text-blue-900">
                      Attach Location (GPS)
                    </span>
                  </div>
                  {latitude && longitude && (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      Clear GPS
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                      latitude && longitude
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50 shadow-2xs'
                    }`}
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Getting satellite GPS...</span>
                      </>
                    ) : latitude && longitude ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>GPS Attached: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 text-blue-600" />
                        <span>Tap to Attach My Exact GPS Location</span>
                      </>
                    )}
                  </button>

                  {locationStatusText && (
                    <p className="text-[11px] font-medium text-slate-700 text-center">
                      {locationStatusText}
                    </p>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Nearby bridge or landmark (e.g. Near Ruo Bridge, beside market)"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-blue-200 text-xs font-medium text-[#1C1B1F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F71E8]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 5: Phone Number & Voice Note */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                  5. Contact &amp; Voice Note (Optional)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Phone number (e.g. 0991234567)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-[#F3F3FA] border border-slate-200 text-xs font-medium text-[#1C1B1F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F71E8]"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Any extra details..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F3FA] border border-slate-200 text-xs font-medium text-[#1C1B1F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F71E8]"
                    />
                  </div>
                </div>

                {/* Voice Note Recording Box */}
                <div className="p-3 bg-[#F3F3FA] rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#1C1B1F] block truncate">
                        {voiceAudioBase64
                          ? `Voice Note Recorded (${voiceDurationSec}s)`
                          : isRecordingVoice
                          ? `Recording voice... ${recordingSeconds}s`
                          : 'Record Voice Description'}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {voiceAudioBase64
                          ? 'Attached to flood report'
                          : isRecordingVoice
                          ? 'Speak clearly into phone'
                          : 'Optional 10-second voice clip'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRecordingVoice ? (
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="py-1.5 px-3 rounded-full bg-red-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-red-700 cursor-pointer animate-pulse"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    ) : voiceAudioBase64 ? (
                      <>
                        <button
                          type="button"
                          onClick={togglePlayPreview}
                          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs hover:bg-blue-700 cursor-pointer"
                          title="Play preview"
                        >
                          {isPlayingPreview ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={clearVoiceRecording}
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                          title="Delete voice clip"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="py-1.5 px-3 rounded-full bg-white border border-slate-200 text-blue-700 text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-blue-50 cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>Record</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-full bg-[#1F71E8] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 active:scale-98 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending to Flood Admin...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Flood Report to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
