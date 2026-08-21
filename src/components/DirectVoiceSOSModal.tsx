import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  X,
  CheckCircle2,
  MapPin,
  AlertOctagon,
  LifeBuoy,
  ShieldCheck,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ResidentSafetyReport, SafetyStatusType, UserProfile } from '../types';
import { firebaseFloodService } from '../services/firebaseService';

interface DirectVoiceSOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isDarkMode?: boolean;
  onSuccess?: (report: ResidentSafetyReport) => void;
}

export const DirectVoiceSOSModal: React.FC<DirectVoiceSOSModalProps> = ({
  isOpen,
  onClose,
  currentUser,
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

  // Background GPS Acquisition
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

  // Start recording on modal open
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
          ? 'Please allow microphone access to record voice.'
          : 'Could not access microphone.'
      );
      setIsRecording(false);
    }
  };

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
          ? 'Emergency Rescue Needed (Voice SOS)'
          : selectedStatus === 'in_flooding'
          ? 'In Flooding (Voice Message)'
          : 'Safe Update (Voice Message)';

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
            : selectedStatus === 'safe'
            ? '✅ Resident reported safe status with voice confirmation.'
            : '⚠️ Water rising - Resident sent voice message.',
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
      }, 1000);
    } catch (err) {
      console.error('Failed to submit direct voice SOS:', err);
      setIsSubmitting(false);
      alert('Could not submit voice SOS. Please check internet connection.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="direct-voice-sos-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
    >
      <div
        id="direct-voice-sos-card"
        className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-200 bg-[#FEF7FF] text-[#1C1B1F] shadow-2xl transition-all max-h-[92vh] overflow-y-auto"
      >
        {/* Mobile Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
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
                Dzenje CDSS ADDA STEM CLUB • Voice SOS
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-direct-voice-sos"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F3EDF7] hover:bg-[#E7E0EC] text-[#49454F] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-[#1C1B1F]">Voice SOS Sent!</h2>
            <p className="text-sm text-[#49454F] max-w-xs mx-auto font-medium">
              Your voice note and location have been sent to village safety teams.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Live Audio Visualizer */}
            <div className="text-center space-y-2 py-1">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all bg-red-100 text-red-600">
                {isRecording ? (
                  <Mic className="w-8 h-8 animate-pulse text-red-600" />
                ) : micError ? (
                  <MicOff className="w-8 h-8 text-slate-400" />
                ) : (
                  <Mic className="w-8 h-8 text-red-600" />
                )}
              </div>

              {isRecording ? (
                <div className="space-y-1">
                  <div className="text-sm font-bold text-red-600 flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                    <span>Recording Voice ({recordingSeconds}s / 30s)</span>
                  </div>
                  <p className="text-xs text-[#49454F] font-medium">
                    Speak clearly: Say where you are and what help you need.
                  </p>
                </div>
              ) : micError ? (
                <div className="p-3 rounded-2xl bg-red-100 text-red-700 text-xs font-semibold">
                  {micError}
                </div>
              ) : (
                <p className="text-xs text-[#49454F] font-medium">
                  Starting microphone...
                </p>
              )}
            </div>

            {/* Emergency Tag Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                Emergency Type:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('needs_help')}
                  className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border text-center cursor-pointer ${
                    selectedStatus === 'needs_help'
                      ? 'bg-red-50 border-red-500 text-red-900 shadow-xs'
                      : 'bg-[#F3F3FA] border-slate-100 text-[#49454F]'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span className="truncate w-full text-xs">Need Rescue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('in_flooding')}
                  className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border text-center cursor-pointer ${
                    selectedStatus === 'in_flooding'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                      : 'bg-[#F3F3FA] border-slate-100 text-[#49454F]'
                  }`}
                >
                  <LifeBuoy className="w-4 h-4 text-amber-600" />
                  <span className="truncate w-full text-xs">Water Rising</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('safe')}
                  className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border text-center cursor-pointer ${
                    selectedStatus === 'safe'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                      : 'bg-[#F3F3FA] border-slate-100 text-[#49454F]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="truncate w-full text-xs">I Am Safe</span>
                </button>
              </div>
            </div>

            {/* Resident & GPS status */}
            <div className="bg-[#F3F3FA] rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="font-bold text-sm text-[#1C1B1F] truncate">
                  {currentUser?.name || 'Resident'}
                </p>
                <p className="text-xs text-[#49454F] truncate font-medium">
                  {currentUser?.village || 'Dzenje Village'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>
                  {gpsStatus === 'ready'
                    ? 'GPS Attached'
                    : gpsStatus === 'acquiring'
                    ? 'Getting GPS...'
                    : 'Village Location'}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="btn-direct-voice-send-now"
                onClick={handleStopAndSend}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Voice SOS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Stop &amp; Send Voice SOS</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-[#49454F] hover:text-red-600 flex items-center gap-1 py-1 transition cursor-pointer font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <span className="text-xs text-[#49454F] font-medium">
                  Direct notice to village rescue team
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

