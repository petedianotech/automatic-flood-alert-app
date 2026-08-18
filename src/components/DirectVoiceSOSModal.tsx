import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Send,
  X,
  CheckCircle2,
  MapPin,
  AlertOctagon,
  LifeBuoy,
  ShieldCheck,
  Loader2,
  Trash2,
  Volume2,
} from 'lucide-react';
import { ResidentSafetyReport, SafetyStatusType, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface DirectVoiceSOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode: boolean;
  onSuccess?: (report: ResidentSafetyReport) => void;
}

export const DirectVoiceSOSModal: React.FC<DirectVoiceSOSModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isDarkMode,
  onSuccess,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<SafetyStatusType>('needs_help');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // GPS Coordinates
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'unavailable'>('acquiring');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioMimeTypeRef = useRef<string>('audio/webm');

  // 1. Silent Background GPS Acquisition on Open
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      setGpsStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGpsStatus('ready');
        },
        () => {
          setGpsStatus('unavailable');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsStatus('unavailable');
    }
  }, [isOpen]);

  // 2. Direct Auto-Start Recording as soon as Modal Opens
  useEffect(() => {
    if (!isOpen) {
      stopAndCleanup();
      return;
    }

    setSubmittedSuccess(false);
    setIsSubmitting(false);
    setMicError(null);
    setRecordingSeconds(0);
    setSelectedStatus('needs_help');

    // Start recording immediately
    startRecordingNow();

    return () => {
      stopAndCleanup();
    };
  }, [isOpen]);

  const stopAndCleanup = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const startRecordingNow = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

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
      audioMimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            // Auto stop at 30 seconds
            handleStopAndSend();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Direct voice SOS mic error:', err);
      setMicError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access to record voice.'
          : 'Could not access microphone.'
      );
      setIsRecording(false);
    }
  };

  // 3. Direct Stop & Send Action (One-Tap Emergency Dispatch)
  const handleStopAndSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const durationSec = recordingSeconds || 1;

    let base64Audio: string | undefined = undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, {
              type: audioMimeTypeRef.current || 'audio/webm',
            });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              base64Audio = reader.result as string;
              resolve();
            };
            reader.onerror = () => resolve();
          };
          mediaRecorderRef.current.stop();
        });
      } catch (err) {
        console.warn('Error stopping media recorder:', err);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);

    try {
      const userName = currentUser?.name || 'Resident';
      const village = currentUser?.village || 'Dzenje Village';
      const statusLabel =
        selectedStatus === 'needs_help'
          ? '🚨 EMERGENCY RESCUE NEEDED (Voice SOS)'
          : selectedStatus === 'in_flooding'
          ? '🌊 In Flooding (Voice Message)'
          : '✅ Safe Update (Voice Message)';

      const mapsUrl =
        latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : undefined;

      const report = await firebaseFloodService.submitSafetyReport({
        userId: currentUser?.uid || 'user_' + Math.random().toString(36).substring(2, 8),
        userName,
        village,
        status: selectedStatus,
        statusLabel,
        peopleCount: 1,
        message:
          selectedStatus === 'needs_help'
            ? '🚨 IMMEDIATE RESCUE SOS - Resident sent urgent voice recording.'
            : 'Voice SOS report broadcasted.',
        latitude,
        longitude,
        mapsUrl,
        voiceAudioBase64: base64Audio,
        voiceDurationSec: durationSec,
        hasVoiceNote: true,
      });

      setSubmittedSuccess(true);
      if (onSuccess) onSuccess(report);

      setTimeout(() => {
        setIsSubmitting(false);
        setSubmittedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to submit direct voice SOS:', err);
      setIsSubmitting(false);
      alert('Could not submit voice SOS to database. Please check your internet connection.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="direct-voice-sos-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="direct-voice-sos-card"
        className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all text-white border-2 ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#D93025]'
            : 'bg-[#8C1D18] border-red-400'
        }`}
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Decorative ambient background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Header with Close button */}
        <div className="flex items-center justify-between gap-3 relative z-10 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1.5 shadow-xs animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>Direct Emergency Voice SOS</span>
            </span>
          </div>

          <button
            type="button"
            id="btn-close-direct-voice-sos"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedSuccess ? (
          /* Success Screen */
          <div className="py-8 text-center space-y-3 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-white">Voice SOS Sent!</h2>
            <p className="text-xs text-white/90 max-w-xs mx-auto">
              Your voice message and GPS coordinates are now live on the village rescue dashboard.
            </p>
          </div>
        ) : (
          /* Main Fast Recording UI */
          <div className="space-y-4 relative z-10">
            {/* Live Audio Visualizer / Pulsing Mic */}
            <div className="text-center space-y-2 pt-1">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {/* Glowing pulsating rings when recording */}
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping opacity-75" />
                    <div className="absolute -inset-2 rounded-full bg-red-500/20 animate-pulse" />
                  </>
                )}

                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                    isRecording
                      ? 'bg-red-600 text-white ring-4 ring-red-400/80 shadow-red-600/60'
                      : micError
                      ? 'bg-zinc-700 text-zinc-400 ring-2 ring-zinc-600'
                      : 'bg-white text-red-600 shadow-white/30'
                  }`}
                >
                  {isRecording ? (
                    <Mic className="w-9 h-9 animate-pulse" />
                  ) : micError ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-9 h-9" />
                  )}
                </div>
              </div>

              {/* Status & Timer */}
              {isRecording ? (
                <div className="space-y-1">
                  <div className="text-sm font-black text-white tracking-wide uppercase flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
                    <span>Recording Voice SOS ({recordingSeconds}s / 30s)</span>
                  </div>
                  <p className="text-xs text-white/80 font-medium">
                    Speak clearly: Say who is with you and what help you need.
                  </p>
                </div>
              ) : micError ? (
                <div className="p-2.5 rounded-2xl bg-black/40 border border-red-400/40 text-xs text-red-200">
                  {micError}
                </div>
              ) : (
                <div className="text-xs text-white/80 font-medium">
                  Starting microphone...
                </div>
              )}
            </div>

            {/* Quick 1-Tap Emergency Tag Selector */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/80 flex items-center justify-between">
                <span>Select Emergency Type:</span>
                <span className="text-amber-300 font-semibold">1-Tap</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('needs_help')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border text-center ${
                    selectedStatus === 'needs_help'
                      ? 'bg-red-600 text-white border-white ring-2 ring-red-400/60 shadow-md'
                      : 'bg-black/30 hover:bg-black/40 text-white/80 border-white/10'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4 text-red-300" />
                  <span className="truncate w-full text-[11px]">Rescue SOS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('in_flooding')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border text-center ${
                    selectedStatus === 'in_flooding'
                      ? 'bg-amber-600 text-white border-white ring-2 ring-amber-400/60 shadow-md'
                      : 'bg-black/30 hover:bg-black/40 text-white/80 border-white/10'
                  }`}
                >
                  <LifeBuoy className="w-4 h-4 text-amber-300" />
                  <span className="truncate w-full text-[11px]">In Flooding</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('safe')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border text-center ${
                    selectedStatus === 'safe'
                      ? 'bg-emerald-600 text-white border-white ring-2 ring-emerald-400/60 shadow-md'
                      : 'bg-black/30 hover:bg-black/40 text-white/80 border-white/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span className="truncate w-full text-[11px]">Safe Status</span>
                </button>
              </div>
            </div>

            {/* Sender & GPS Location badge */}
            <div className="rounded-xl bg-black/30 p-2.5 border border-white/15 flex items-center justify-between text-xs text-white/90">
              <div className="min-w-0">
                <p className="font-bold truncate">{currentUser?.name || 'Resident'}</p>
                <p className="text-[11px] text-white/70 truncate">{currentUser?.village || 'Dzenje Village'}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{gpsStatus === 'ready' ? 'GPS Attached' : gpsStatus === 'acquiring' ? 'Acquiring GPS...' : 'Village Pin'}</span>
              </div>
            </div>

            {/* Huge Primary Action: STOP & SEND VOICE SOS NOW */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="btn-direct-voice-send-now"
                onClick={handleStopAndSend}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-white hover:bg-zinc-100 active:scale-98 text-red-700 font-black text-sm sm:text-base tracking-wider uppercase shadow-2xl transition-all flex items-center justify-center gap-2 border-2 border-white cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Broadcasting SOS to Rescue Teams...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-red-600" />
                    <span>STOP &amp; SEND VOICE SOS NOW</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-white/70 hover:text-white flex items-center gap-1 py-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel SOS</span>
                </button>

                <span className="text-[11px] text-white/60">
                  Instant broadcast to database &amp; village
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
