import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldOff,
  Pause,
  Play,
  Crosshair,
  Sparkles,
  Zap,
  CheckCircle2,
  BellRing,
  Lock,
  User,
  Radio,
  ArrowRight,
  ShieldAlert,
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  Edit3,
  Check,
  RotateCw,
  Layers,
} from 'lucide-react';
import { LiveMotionMeter } from './LiveMotionMeter';
import {
  MotionData,
  MotionSensorState,
  WakeLockState,
  SensorConfig,
  UserProfile,
  SensorLocation,
  ADMIN_EMAIL,
} from '../types';
import { locationService, MALAWI_RIVER_STATION_PRESETS } from '../services/locationService';

interface SensorNodeViewProps {
  motion: MotionData;
  sensorState: MotionSensorState;
  wakeLockState: WakeLockState;
  config: SensorConfig;
  isArmed: boolean;
  isPaused: boolean;
  sustainedDuration: number;
  triggerProgress: number;
  isDarkMode: boolean;
  isAdmin?: boolean;
  currentUser?: UserProfile | null;
  onToggleArm: () => void;
  onTogglePause: () => void;
  onCalibrate: () => Promise<number>;
  onSimulateTest: (durationSec?: number, peakForce?: number) => void;
  onSimulateYellow?: () => void;
  onSimulateRed?: () => void;
  onRequestWakeLock: () => void;
  onManualTriggerAlert: () => void;
  onUpdateLocation?: (location: SensorLocation) => void;
  onOpenAuthModal?: () => void;
  onGoToReceiver?: () => void;
}

export const SensorNodeView: React.FC<SensorNodeViewProps> = ({
  motion,
  sensorState,
  wakeLockState,
  config,
  isArmed,
  isPaused,
  sustainedDuration,
  triggerProgress,
  isDarkMode,
  isAdmin = false,
  currentUser,
  onToggleArm,
  onTogglePause,
  onCalibrate,
  onSimulateTest,
  onSimulateYellow,
  onSimulateRed,
  onRequestWakeLock,
  onManualTriggerAlert,
  onUpdateLocation,
  onOpenAuthModal,
  onGoToReceiver,
}) => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  const [riverName, setRiverName] = useState(config.location?.riverName || 'Ruo River');
  const [village, setVillage] = useState(config.location?.village || 'Dzenje Village');
  const [ta, setTa] = useState(config.location?.traditionalAuthority || 'T/A Mabuka');
  const [district, setDistrict] = useState(config.location?.district || 'Mulanje');
  const [region, setRegion] = useState(config.location?.region || 'Southern Region, Malawi');

  useEffect(() => {
    if (config.location) {
      setRiverName(config.location.riverName || 'Ruo River');
      setVillage(config.location.village || 'Dzenje Village');
      setTa(config.location.traditionalAuthority || 'T/A Mabuka');
      setDistrict(config.location.district || 'Mulanje');
      setRegion(config.location.region || 'Southern Region, Malawi');
    }
  }, [config.location]);

  // If user is not the designated admin, render clean fallback redirecting to alerts
  if (!isAdmin) {
    return (
      <div id="sensor-owner-gate" className="space-y-4 animate-in fade-in duration-200">
        <div
          className={`rounded-3xl border p-6 sm:p-7 text-center shadow-md ${
            isDarkMode
              ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
              : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl mx-auto mb-4 bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center shadow-xs">
            <Radio className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
            Community Receiver Mode
          </h2>

          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6] mt-2 max-w-md mx-auto leading-relaxed">
            Your device is active on the flood alert network to receive real-time neighborhood sirens and warnings.
          </p>

          <div className="mt-6 flex justify-center max-w-md mx-auto">
            {onGoToReceiver && (
              <button
                id="btn-goto-receiver"
                onClick={onGoToReceiver}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Radio className="w-4 h-4" />
                <span>Open Community Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleCalibrateClick = async () => {
    setIsCalibrating(true);
    setCalibrationSuccess(null);
    try {
      const newBaseline = await onCalibrate();
      setCalibrationSuccess(newBaseline);
      setTimeout(() => setCalibrationSuccess(null), 3000);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleAcquireRealGps = async () => {
    setIsLocating(true);
    setLocationError(null);
    setLocationSuccessMsg(null);
    try {
      const coords = await locationService.getDeviceGpsCoordinates();
      
      // Attempt reverse geocoding
      const geo = await locationService.reverseGeocode(coords.latitude, coords.longitude);
      
      const newLoc: SensorLocation = {
        riverName: riverName || 'Ruo River',
        village: geo.village || village || 'Dzenje Village',
        traditionalAuthority: ta || 'T/A Mabuka',
        district: geo.district || district || 'Mulanje',
        region: geo.state ? `${geo.state}, ${geo.country || 'Malawi'}` : region,
        fullAddress: locationService.formatFullAddress({
          riverName: riverName || 'Ruo River',
          village: geo.village || village || 'Dzenje Village',
          traditionalAuthority: ta || 'T/A Mabuka',
          district: geo.district || district || 'Mulanje',
          region,
        }),
        coordinates: coords,
        isGpsLive: true,
        gpsAccuracy: coords.accuracy,
        mapsUrl: locationService.getMapsUrl(coords.latitude, coords.longitude),
      };

      locationService.saveLocation(newLoc);
      if (onUpdateLocation) {
        onUpdateLocation(newLoc);
      }
      setLocationSuccessMsg(`GPS Locked: ${coords.latitude}°, ${coords.longitude}° (±${coords.accuracy}m accuracy)`);
      setTimeout(() => setLocationSuccessMsg(null), 4000);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to acquire GPS fix');
      setTimeout(() => setLocationError(null), 5000);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectPresetStation = (preset: (typeof MALAWI_RIVER_STATION_PRESETS)[0]) => {
    setRiverName(preset.riverName);
    setVillage(preset.village);
    setTa(preset.traditionalAuthority);
    setDistrict(preset.district);
    setRegion(preset.region);

    const newLoc: SensorLocation = {
      riverName: preset.riverName,
      village: preset.village,
      traditionalAuthority: preset.traditionalAuthority,
      district: preset.district,
      region: preset.region,
      fullAddress: `${preset.riverName}, ${preset.village}, ${preset.traditionalAuthority}, ${preset.district} District, ${preset.region}`,
      coordinates: {
        latitude: preset.defaultCoords.lat,
        longitude: preset.defaultCoords.lng,
        accuracy: 10,
        altitude: 620,
        timestamp: Date.now(),
      },
      isGpsLive: false,
      gpsAccuracy: 10,
      mapsUrl: locationService.getMapsUrl(preset.defaultCoords.lat, preset.defaultCoords.lng),
    };

    locationService.saveLocation(newLoc);
    if (onUpdateLocation) {
      onUpdateLocation(newLoc);
    }
    setLocationSuccessMsg(`Active station set to: ${preset.name}`);
    setTimeout(() => setLocationSuccessMsg(null), 3000);
    setIsEditingLocation(false);
  };

  const handleSaveCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const currentCoords = config.location?.coordinates || {
      latitude: -16.0315,
      longitude: 35.5000,
      accuracy: 8,
      timestamp: Date.now(),
    };

    const newLoc: SensorLocation = {
      riverName: riverName.trim() || 'Ruo River',
      village: village.trim() || 'Dzenje Village',
      traditionalAuthority: ta.trim() || 'T/A Mabuka',
      district: district.trim() || 'Mulanje',
      region: region.trim() || 'Southern Region, Malawi',
      fullAddress: `${riverName.trim()}, ${village.trim()}, ${ta.trim()}, ${district.trim()} District, ${region.trim()}`,
      coordinates: currentCoords,
      isGpsLive: config.location?.isGpsLive ?? false,
      gpsAccuracy: currentCoords.accuracy,
      mapsUrl: locationService.getMapsUrl(currentCoords.latitude, currentCoords.longitude),
    };

    locationService.saveLocation(newLoc);
    if (onUpdateLocation) {
      onUpdateLocation(newLoc);
    }
    setIsEditingLocation(false);
    setLocationSuccessMsg('Sensor location updated and synchronized.');
    setTimeout(() => setLocationSuccessMsg(null), 3000);
  };

  const isSensorActive = isArmed && !isPaused;
  const activeLoc = config.location || locationService.getSavedLocation();

  return (
    <div id="sensor-node-view" className="space-y-3.5">
      {/* 1. Main Sensor Control Panel */}
      <div
        className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
          isSensorActive
            ? isDarkMode
              ? 'bg-[#1E1F20] border-[#1A73E8]/40'
              : 'bg-white border-[#1A73E8]/30 shadow-blue-500/5'
            : isPaused
            ? isDarkMode
              ? 'bg-[#1E1F20] border-amber-500/40'
              : 'bg-white border-amber-300 shadow-amber-500/5'
            : isDarkMode
            ? 'bg-[#1E1F20] border-[#303134]'
            : 'bg-white border-[#E1E3E1]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Node Identity & Status */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                id="sensor-status-badge"
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                  isSensorActive
                    ? 'bg-[#E8F0FE] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
                    : isPaused
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#2D2E30] dark:text-[#9AA0A6]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSensorActive
                      ? 'bg-[#1A73E8] animate-ping'
                      : isPaused
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                  }`}
                />
                {isSensorActive
                  ? 'ACTIVE MONITORING'
                  : isPaused
                  ? 'SENSOR PAUSED'
                  : 'STANDBY / DISARMED'}
              </span>

              {/* Wake Lock Status Pill */}
              <button
                id="btn-wake-lock-status"
                onClick={onRequestWakeLock}
                title="Keeps screen awake 24/7"
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                  wakeLockState.isActive
                    ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6] dark:bg-[#137333]/20 dark:text-[#81C995] dark:border-[#137333]/40'
                    : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF] dark:bg-[#D93025]/20 dark:text-[#F28B82] dark:border-[#D93025]/40 hover:opacity-80'
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>{wakeLockState.isActive ? 'Screen Awake' : 'Wake Off'}</span>
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
              {config.sensorName || 'Basement River Sensor'}
            </h2>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              💛 Yellow Warning at &ge;{config.thresholdYellow || 0.8} m/s² &bull; 🚨 Red Critical Alert at &ge;{config.thresholdRed || config.thresholdDelta || 1.6} m/s² (instant trip)
            </p>
          </div>

          {/* Action Buttons: Pause/Resume + Arm/Disarm */}
          <div className="flex items-center gap-2 shrink-0">
            {/* PAUSE / RESUME SENSOR BUTTON */}
            {isArmed && (
              <button
                id="btn-pause-resume-sensor"
                onClick={onTogglePause}
                className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                  isPaused
                    ? 'bg-[#1A73E8] hover:bg-[#1557B0] text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}

            {/* ARM / DISARM BUTTON */}
            <button
              id="btn-toggle-arm-disarm"
              onClick={onToggleArm}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                isArmed
                  ? 'bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#D93025] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] border border-red-200 dark:border-red-900/50'
                  : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-blue-500/20'
              }`}
            >
              {isArmed ? (
                <>
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>Disarm</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 fill-current" />
                  <span>Arm Sensor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Motion Meter & Real-Time Waveform */}
      <LiveMotionMeter
        motion={motion}
        thresholdYellow={config.thresholdYellow}
        thresholdRed={config.thresholdRed || config.thresholdDelta}
        threshold={config.thresholdDelta}
        continuousDuration={config.continuousDurationSec}
        sustainedDuration={sustainedDuration}
        triggerProgress={triggerProgress}
        isArmed={isArmed}
        isPaused={isPaused}
        baselineGravity={config.baselineGravity}
        isDarkMode={isDarkMode}
      />

      {/* 3. Sensor Station & GPS Location Module */}
      <div
        id="sensor-location-card"
        className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1967D2] dark:text-[#8AB4F8] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#D93025]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight">Sensor Station Location</h3>
                {activeLoc.isGpsLive ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5 text-[#137333]" />
                    Live GPS Fixed
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    Station Preset
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-medium">
                {activeLoc.riverName} &bull; {activeLoc.village} ({activeLoc.traditionalAuthority}, {activeLoc.district})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-acquire-gps"
              onClick={handleAcquireRealGps}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center gap-1.5 transition-colors border border-[#D2E3FC] dark:border-[#1A73E8]/30 active:scale-95"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Acquiring GPS...' : 'Get Live GPS Fix'}</span>
            </button>

            <button
              id="btn-toggle-edit-station"
              onClick={() => setIsEditingLocation(!isEditingLocation)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-[#5F6368] dark:text-[#9AA0A6] flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingLocation ? 'Close' : 'Edit Station'}</span>
            </button>
          </div>
        </div>

        {/* GPS Coordinates & Map Link */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1A73E8]" />
            <span className="font-mono font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
              {activeLoc.coordinates?.latitude?.toFixed(4) ?? -16.0315}° S,{' '}
              {activeLoc.coordinates?.longitude?.toFixed(4) ?? 35.5000}° E
            </span>
            {activeLoc.gpsAccuracy && (
              <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                (±{activeLoc.gpsAccuracy}m precision)
              </span>
            )}
          </div>

          {activeLoc.mapsUrl && (
            <a
              href={activeLoc.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline flex items-center gap-1"
            >
              <span>View River Station on Map</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {locationSuccessMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#E6F4EA] text-[#137333] dark:bg-[#137333]/20 dark:text-[#81C995] text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{locationSuccessMsg}</span>
          </div>
        )}

        {locationError && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#FCE8E6] text-[#C5221F] dark:bg-red-950/40 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5 border border-red-200 dark:border-red-900/50">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Station Editor & Presets */}
        {isEditingLocation && (
          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
                Quick River Station Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {MALAWI_RIVER_STATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPresetStation(preset)}
                    className={`p-2 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between ${
                      riverName === preset.riverName && village === preset.village
                        ? 'bg-[#E8F0FE] text-[#1967D2] border-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-[#1A73E8]'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{preset.name}</div>
                      <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                        {preset.district} District &bull; {preset.region}
                      </div>
                    </div>
                    {riverName === preset.riverName && village === preset.village && (
                      <Check className="w-4 h-4 text-[#1A73E8] shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Location Form */}
            <form onSubmit={handleSaveCustomLocation} className="space-y-2.5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-0.5">
                    River / Basin Name
                  </label>
                  <input
                    type="text"
                    required
                    value={riverName}
                    onChange={(e) => setRiverName(e.target.value)}
                    placeholder="e.g. Ruo River"
                    className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-xs focus:ring-2 focus:ring-[#1A73E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-0.5">
                    Village / Community
                  </label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Dzenje Village"
                    className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-xs focus:ring-2 focus:ring-[#1A73E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-0.5">
                    Traditional Authority (T/A)
                  </label>
                  <input
                    type="text"
                    required
                    value={ta}
                    onChange={(e) => setTa(e.target.value)}
                    placeholder="e.g. T/A Mabuka"
                    className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-xs focus:ring-2 focus:ring-[#1A73E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-0.5">
                    District &amp; Region
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Mulanje"
                    className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] text-xs focus:ring-2 focus:ring-[#1A73E8] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingLocation(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-black/[0.05] dark:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1A73E8] hover:bg-[#1557B0] text-white transition-colors"
                >
                  Save Station Details
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 4. Essential Quick Actions Toolbar */}
      <div
        id="sensor-actions-toolbar"
        className={`rounded-2xl sm:rounded-3xl border p-3 sm:p-4 transition-all shadow-xs ${
          isDarkMode
            ? 'bg-[#1E1F20] border-[#303134] text-[#E3E3E3]'
            : 'bg-white border-[#E1E3E1] text-[#1F1F1F]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
              Sensor Calibration
            </span>
            {calibrationSuccess !== null && (
              <span className="text-[11px] text-[#137333] dark:text-[#81C995] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Zeroed: {calibrationSuccess.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Zero Baseline */}
            <button
              id="btn-calibrate-baseline"
              onClick={handleCalibrateClick}
              disabled={isCalibrating || !isArmed || isPaused}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isCalibrating
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 border-amber-300 animate-pulse'
                  : !isArmed || isPaused
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent'
                  : 'bg-[#F1F3F4] hover:bg-[#E8EAED] dark:bg-[#2D2E30] dark:hover:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E3E3E3] border-transparent'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>Zero Baseline Acceleration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
