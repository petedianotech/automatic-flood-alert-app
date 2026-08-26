export const ADMIN_EMAIL = 'petedianotech@gmail.com';

export const isAppAdmin = (user?: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.email && user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const cleanName = (user.name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const cleanVillage = (user.village || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const isMatchAdminName =
    cleanName === 'dzenje cdss adda stem club' ||
    cleanName === 'dzenje cdss' ||
    cleanName === 'adda stem club' ||
    cleanName.includes('adda stem');
  const isMatchAdminVillage =
    cleanVillage === 'dzenje village' || cleanVillage === 'dzenje';

  if (isMatchAdminName && isMatchAdminVillage) {
    return true;
  }
  return false;
};

export interface UserProfile {
  uid: string;
  name: string;
  village: string;
  phone?: string;
  smsAlertsEnabled?: boolean;
  email?: string;
  photoURL?: string;
  authProvider: 'name_village' | 'google';
  hasPassword?: boolean;
  role?: 'resident' | 'warden' | 'operator' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  firebaseUid: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface MotionData {
  x: number;
  y: number;
  z: number;
  totalMagnitude: number; // A = sqrt(x^2 + y^2 + z^2)
  delta: number; // |A - 9.81| (or calibrated baseline offset)
  timestamp: number;
}

export type FloodSeverity = 'yellow' | 'red';

export interface GeoLocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  timestamp: number;
}

export interface SensorLocation {
  riverName: string; // e.g. "Ruo River"
  village: string; // e.g. "Dzenje Village"
  traditionalAuthority: string; // e.g. "T/A Mabuka"
  district: string; // e.g. "Mulanje"
  region: string; // e.g. "Southern Region, Malawi"
  fullAddress: string; // e.g. "Ruo River, Dzenje Village, T/A Mabuka, Mulanje District, Southern Region, Malawi"
  coordinates?: GeoLocationCoordinates | null;
  isGpsLive?: boolean;
  gpsAccuracy?: number;
  mapsUrl?: string;
}

export interface FloodAlert {
  id: string;
  timestamp: number;
  formattedTime: string;
  peakDelta: number;
  durationSeconds: number;
  nodeId: string;
  nodeName: string;
  village?: string;
  location?: SensorLocation;
  locationLabel?: string;
  riverName?: string;
  traditionalAuthority?: string;
  district?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  userId?: string;
  status: 'active' | 'resolved' | 'dismissed';
  severity?: FloodSeverity; // 'yellow' = Warning/Advisory, 'red' = Critical/Evacuate
  title?: string;
  message?: string;
  dismissedBy?: string;
  dismissedAt?: number;
  source: 'hardware_sensor' | 'acoustic_sound_sensor' | 'manual_test' | 'simulated';
  notes?: string;
}

export type SensorDetectionMode = 'motion' | 'sound';

export interface AcousticData {
  decibels: number; // Approximate SPL decibel level (30 - 110 dB)
  rms: number; // Root-mean-square amplitude (0.0 - 1.0)
  peakRms: number; // Peak amplitude
  resonanceScore: number; // 0 - 100% low-frequency turbulent water roar / rumble
  frequencyData: number[]; // Normalized frequency bins for visualizer (0 - 255)
  isWaterRoarDetected: boolean;
  sustainedDurationSec: number;
  triggerProgress: number; // 0.0 - 1.0
  timestamp: number;

  // Continuous Motor-Driven Bicycle Bell Detection & Rejection Metrics
  bellDetectionScore: number; // 0 - 100% match with metallic bicycle bell profile
  isBellRingingDetected: boolean; // True when motor-rotated bell is actively detected
  soundClassification: 'bell_ringing' | 'human_voice' | 'whistle' | 'ambient_noise' | 'water_roar' | 'quiet';
  voiceRejectionActive: boolean; // True when speech is detected and filtered out
  whistleRejectionActive: boolean; // True when whistling is filtered out
  motorCadenceHz: number; // Estimated repetitive motor strike frequency (Hz)
  bellBandDb: number; // Sound level in 2.4kHz - 4.8kHz bell band
  speechBandDb: number; // Sound level in 100Hz - 1.4kHz human voice band
}

export interface AcousticSensorState {
  isSupported: boolean;
  isListening: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isPaused: boolean;
  error?: string;
  thresholdYellowDb: number; // Default: 68 dB
  thresholdRedDb: number; // Default: 82 dB
  resonanceThreshold: number; // Default: 65%
}

export interface SensorConfig {
  thresholdYellow: number; // Default: 0.8 m/s^2 (Advisory Warning)
  thresholdRed: number; // Default: 1.6 m/s^2 (Critical Evacuation)
  thresholdDelta: number; // Default: 1.6 m/s^2 (Reference)
  thresholdYellowDb?: number; // Sound Advisory dB (Default: 68 dB)
  thresholdRedDb?: number; // Sound Critical dB (Default: 82 dB)
  soundResonanceSensitivity?: number; // 1.0 - 2.5x (Default: 1.2)
  activeDetectionMode?: SensorDetectionMode;
  continuousDurationSec: number; // Reference duration
  sensorName: string;
  nodeId: string;
  location?: SensorLocation;
  sirenVolume: number; // 0.0 - 1.0
  autoWakeLock: boolean;
  pushEnabled: boolean;
  soundAlarmOnDevice: boolean;
  highContrastAlert: boolean;
  baselineGravity: number; // Default 9.81 m/s^2 or calibrated
}

export interface WakeLockState {
  isSupported: boolean;
  isActive: boolean;
  error?: string;
  releaseTime?: number;
}

export interface MotionSensorState {
  isSupported: boolean;
  isListening: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isCalibrating: boolean;
  error?: string;
  hardwareAvailable: boolean;
  isPaused?: boolean;
}

export interface BatteryState {
  isSupported: boolean;
  charging: boolean;
  level: number;
  chargingTime?: number;
  dischargingTime?: number;
}

export type SafetyStatusType = 'safe' | 'in_flooding' | 'needs_help' | 'evacuated';

export interface ResidentSafetyReport {
  id: string;
  userId: string;
  userName: string;
  village: string;
  status: SafetyStatusType;
  statusLabel?: string;
  peopleCount?: number;
  phone?: string;
  message?: string;
  timestamp: number;
  formattedTime: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  voiceAudioBase64?: string;
  voiceDurationSec?: number;
  hasVoiceNote?: boolean;
  updatedAt?: string;
}

export type NodeMode = 'sensor' | 'receiver' | 'village' | 'diagnostics' | 'admin' | 'settings';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConfigured: boolean;
}
