import React, { useState, useRef, useEffect } from 'react';
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
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Trash2,
  Volume2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { ResidentSafetyReport, SafetyStatusType, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface SafetyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode: boolean;
  initialStatus?: SafetyStatusType;
  autoStartVoice?: boolean;
  onSuccess?: (report: ResidentSafetyReport) => void;
}

export const SafetyCheckInModal: React.FC<SafetyCheckInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isDarkMode,
  initialStatus = 'safe',
  autoStartVoice = false,
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

  // Voice recording & Hands-Free state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceAudioBase64, setVoiceAudioBase64] = useState<string | undefined>();
  const [voiceDurationSec, setVoiceDurationSec] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const [speechKeywordDetected, setSpeechKeywordDetected] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechRecognitionSupported(true);
      }
    }
  }, []);

  // Auto-start recording if opened in fast voice mode
  useEffect(() => {
    if (isOpen && autoStartVoice && !voiceAudioBase64 && !isRecording) {
      const timer = setTimeout(() => {
        handleStartVoiceReporting();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoStartVoice]);

  // Clean up on unmount or modal close
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [isOpen]);

  const stopRecordingCleanup = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const handleStartVoiceReporting = async () => {
    if (isRecording) {
      handleStopVoiceReporting();
      return;
    }

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type for best compression & browser compatibility
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        // Convert audio Blob to Base64 data URL for durable storage in Firestore
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setVoiceAudioBase64(base64Data);
        };
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording in 500ms time-slices
      mediaRecorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer (max 30 seconds)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            handleStopVoiceReporting();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

      // 2. Initialize hands-free speech recognition (transcription + emergency keyword trigger)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let transcriptText = '';
            for (let i = 0; i < event.results.length; i++) {
              transcriptText += event.results[i][0].transcript + ' ';
            }

            const cleanText = transcriptText.trim();
            if (cleanText) {
              setMessage(cleanText);

              // Auto keyword detection for hands-free emergency triage
              const lower = cleanText.toLowerCase();
              if (
                lower.includes('rescue') ||
                lower.includes('sos') ||
                lower.includes('help') ||
                lower.includes('trapped') ||
                lower.includes('boat') ||
                lower.includes('roof') ||
                lower.includes('emergency')
              ) {
                setStatus('needs_help');
                setSpeechKeywordDetected('Rescue SOS detected');
              } else if (
                lower.includes('flood') ||
                lower.includes('rising') ||
                lower.includes('water') ||
                lower.includes('compound')
              ) {
                setStatus('in_flooding');
                setSpeechKeywordDetected('Flooding condition detected');
              } else if (
                lower.includes('evacuated') ||
                lower.includes('shelter') ||
                lower.includes('school') ||
                lower.includes('high ground')
              ) {
                setStatus('evacuated');
                setSpeechKeywordDetected('Evacuation status detected');
              } else if (
                lower.includes('safe') ||
                lower.includes('clear') ||
                lower.includes('receded') ||
                lower.includes('ok') ||
                lower.includes('fine')
              ) {
                setStatus('safe');
                setSpeechKeywordDetected('Safe status detected');
              }
            }
          };

          recognition.onerror = (err: any) => {
            console.warn('Speech recognition error:', err);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          console.warn('Could not start speech recognition:', e);
        }
      }
    } catch (err) {
      console.error('Microphone permission or recording error:', err);
      alert('Could not access microphone. Please enable microphone permissions in your browser.');
      setIsRecording(false);
    }
  };

  const handleStopVoiceReporting = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setVoiceDurationSec(recordingSeconds || 1);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  };

  const handlePlayVoicePreview = () => {
    if (!voiceAudioBase64) return;

    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    const audio = new Audio(voiceAudioBase64);
    previewAudioRef.current = audio;
    setIsPlayingPreview(true);

    audio.onended = () => {
      setIsPlayingPreview(false);
    };

    audio.onerror = () => {
      setIsPlayingPreview(false);
    };

    audio.play().catch((e) => {
      console.warn('Audio play error:', e);
      setIsPlayingPreview(false);
    });
  };

  const handleDiscardVoice = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
    setVoiceAudioBase64(undefined);
    setVoiceDurationSec(0);
    setSpeechKeywordDetected(null);
  };

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

    // Stop recording if active
    if (isRecording) {
      handleStopVoiceReporting();
    }

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
        voiceAudioBase64,
        voiceDurationSec: voiceDurationSec || (voiceAudioBase64 ? 5 : undefined),
        hasVoiceNote: !!voiceAudioBase64,
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

  if (!isOpen) return null;

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
            <img
              src="/icon.svg"
              alt="App Icon"
              className="w-9 h-9 rounded-xl shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-base font-bold leading-tight">Check In Safety Status</h2>
              <p className="text-xs text-zinc-400">Let your village and rescue team know you are safe</p>
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
              Your status has been securely synced to the village roll-call and the Admin Rescue Dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Status Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-2">
                Select Your Current Situation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="status-option-safe"
                  onClick={() => setStatus('safe')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'safe'
                      ? 'bg-[#E6F4EA] border-[#CEEAD6] text-[#0D652D] ring-2 ring-[#0D652D]/20 dark:bg-[#137333]/30 dark:border-[#137333]/60 dark:text-[#81C995]'
                      : isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] hover:border-[#5F6368]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] hover:border-[#1A73E8]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#0D652D] dark:text-[#81C995]" />
                    <span>I Am Safe</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#0D652D] dark:text-[#81C995]">No flood near me</span>
                </button>

                <button
                  type="button"
                  id="status-option-evacuated"
                  onClick={() => setStatus('evacuated')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'evacuated'
                      ? 'bg-[#E8F0FE] border-[#D2E3FC] text-[#1557B0] ring-2 ring-[#1557B0]/20 dark:bg-[#1A73E8]/30 dark:border-[#1A73E8]/60 dark:text-[#8AB4F8]'
                      : isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] hover:border-[#5F6368]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] hover:border-[#1A73E8]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Home className="w-4 h-4 text-[#1557B0] dark:text-[#8AB4F8]" />
                    <span>I Evacuated</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#1557B0] dark:text-[#8AB4F8]">At shelter or high ground</span>
                </button>

                <button
                  type="button"
                  id="status-option-flooding"
                  onClick={() => setStatus('in_flooding')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'in_flooding'
                      ? 'bg-[#FEF7E0] border-[#FEEFC3] text-[#B06000] ring-2 ring-[#B06000]/20 dark:bg-[#B06000]/30 dark:border-[#B06000]/60 dark:text-[#FDE293]'
                      : isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] hover:border-[#5F6368]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] hover:border-[#1A73E8]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-[#B06000] dark:text-[#FDE293]" />
                    <span>Water Rising</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#B06000] dark:text-[#FDE293]">Water entering my yard or home</span>
                </button>

                <button
                  type="button"
                  id="status-option-needs-help"
                  onClick={() => setStatus('needs_help')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    status === 'needs_help'
                      ? 'bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F] ring-2 ring-[#C5221F]/20 font-bold dark:bg-[#D93025]/30 dark:border-[#D93025]/60 dark:text-[#F28B82]'
                      : isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] hover:border-[#5F6368]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] hover:border-[#1A73E8]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <LifeBuoy className="w-4 h-4 text-[#C5221F] dark:text-[#F28B82]" />
                    <span>Need Rescue</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#C5221F] dark:text-[#F28B82]">Urgent rescue needed right now</span>
                </button>
              </div>
            </div>

            {/* Resident Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3C4043] dark:text-[#BDC1C6] mb-1">Your Full Name</label>
                <input
                  type="text"
                  id="safety-user-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Peter Damiano"
                  required
                  className={`w-full px-3 py-2 text-xs font-medium rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] focus:border-[#1A73E8]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] focus:border-[#1A73E8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3C4043] dark:text-[#BDC1C6] mb-1">Village / Location</label>
                <input
                  type="text"
                  id="safety-village-name"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Dzenje Village"
                  required
                  className={`w-full px-3 py-2 text-xs font-medium rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] focus:border-[#1A73E8]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] focus:border-[#1A73E8]'
                  }`}
                />
              </div>
            </div>

            {/* Headcount & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3C4043] dark:text-[#BDC1C6] mb-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> People with you
                  </span>
                </label>
                <input
                  type="number"
                  id="safety-people-count"
                  min="1"
                  max="50"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-full px-3 py-2 text-xs font-medium rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] focus:border-[#1A73E8]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] focus:border-[#1A73E8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3C4043] dark:text-[#BDC1C6] mb-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </span>
                </label>
                <input
                  type="tel"
                  id="safety-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0888..."
                  className={`w-full px-3 py-2 text-xs font-medium rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] focus:border-[#1A73E8]'
                      : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] focus:border-[#1A73E8]'
                  }`}
                />
              </div>
            </div>

            {/* Optional Note / Message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#3C4043] dark:text-[#BDC1C6]">
                  Message or Note
                </label>
                {isRecording && (
                  <span className="text-[10px] text-[#D93025] font-bold animate-pulse flex items-center gap-1">
                    <Radio className="w-3 h-3" /> Live Recording
                  </span>
                )}
              </div>
              <textarea
                id="safety-message-input"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  status === 'safe'
                    ? 'e.g. Water is low, my family is safe at home.'
                    : status === 'evacuated'
                    ? 'e.g. Relocated to Dzenje Primary School classroom.'
                    : 'e.g. Water is rising near house, need rescue boat.'
                }
                className={`w-full px-3 py-2 text-xs font-medium rounded-xl border outline-none resize-none ${
                  isDarkMode
                    ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3] focus:border-[#1A73E8]'
                    : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#1F1F1F] focus:border-[#1A73E8]'
                }`}
              />
            </div>

            {/* GPS Location Attachment */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between ${
                latitude && longitude
                  ? 'bg-[#E6F4EA] border-[#CEEAD6] text-[#137333] dark:bg-[#137333]/20 dark:border-[#137333]/40 dark:text-[#81C995]'
                  : isDarkMode
                  ? 'bg-[#1E1F20] border-[#303134] text-[#9AA0A6]'
                  : 'bg-[#F8F9FA] border-[#E1E3E1] text-[#5F6368]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-[#D93025] shrink-0" />
                <div>
                  {latitude && longitude ? (
                    <span className="font-mono text-[11px] font-bold">
                      GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span>Add GPS location for village rescue</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                id="get-gps-coords-btn"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#1F1F1F] dark:bg-white text-white dark:text-[#1F1F1F] flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
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
                className={`flex-1 py-3 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  isDarkMode
                    ? 'border-[#303134] text-[#E3E3E3] hover:bg-[#303134]'
                    : 'border-[#E1E3E1] text-[#1F1F1F] hover:bg-[#F1F3F4]'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                id="confirm-safety-report-btn"
                disabled={isSubmitting || !userName.trim()}
                className={`flex-1 py-3 rounded-full text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                  status === 'safe'
                    ? 'bg-[#137333] hover:bg-[#0D652D]'
                    : status === 'evacuated'
                    ? 'bg-[#1A73E8] hover:bg-[#1557B0]'
                    : status === 'in_flooding'
                    ? 'bg-[#B06000] hover:bg-[#8C4D00]'
                    : 'bg-[#D93025] hover:bg-[#B3261E]'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Submit Safety Status</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

