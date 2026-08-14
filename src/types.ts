export const ADMIN_EMAIL = 'petedianotech@gmail.com';

export const isAppAdmin = (user?: UserProfile | null): boolean => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
};

export interface UserProfile {
  uid: string;
  name: string;
  village: string;
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
  source: 'hardware_sensor' | 'manual_test' | 'simulated';
  notes?: string;
}

export interface SensorConfig {
  thresholdYellow: number; // Default: 0.8 m/s^2 (Advisory Warning)
  thresholdRed: number; // Default: 1.6 m/s^2 (Critical Evacuation)
  thresholdDelta: number; // Default: 1.6 m/s^2 (Reference)
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

export type NodeMode = 'sensor' | 'receiver' | 'village' | 'diagnostics' | 'settings';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConfigured: boolean;
}
