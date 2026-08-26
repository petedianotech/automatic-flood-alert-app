/**
 * Automatic Flood Alert System
 * Native Mobile App Experience powered by Firebase Auth, Firestore & Offline PWA Service Worker
 * 
 * Features:
 * - Offline & Background Notification Engine (Service Worker Registration + Web Push)
 * - Mobile App Shell (Status Bar, Mobile Header, Bottom Navigation Bar)
 * - Sign In Option 1: Name, Village & (Optional Password)
 * - Sign In Option 2: Google Account OAuth
 * - Village Community Flood Alert Network & River Monitoring
 * - Screen Wake Lock API (forces screen to stay awake continuously)
 * - Device Motion Sensor API (3-axis accelerometer, A = sqrt(X^2+Y^2+Z^2), Delta = |A - 9.81|)
 * - Web Audio Siren API (high-pitched emergency oscillating alarm sound)
 * - Firebase Web SDK v10 Modular Integration (Firestore flood_alerts + users)
 * - Critical Flood Alert Modal Overlay with "HOLD TO DISMISS" safety control
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileAuthModal } from './components/MobileAuthModal';
import { VillageCommunityView } from './components/VillageCommunityView';
import { SensorNodeView } from './components/SensorNodeView';
import { ReceiverNodeView } from './components/ReceiverNodeView';
import { AdminSafetyDashboardView } from './components/AdminSafetyDashboardView';
import { CriticalAlarmModal } from './components/CriticalAlarmModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { SafetyCheckInModal } from './components/SafetyCheckInModal';
import { DirectVoiceSOSModal } from './components/DirectVoiceSOSModal';
import { FcmGatewayModal } from './components/FcmGatewayModal';
import { AlertSoundModal } from './components/AlertSoundModal';
import { SmsGatewayModal } from './components/SmsGatewayModal';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { Mic } from 'lucide-react';
import {
  MotionData,
  AcousticData,
  AcousticSensorState,
  SensorDetectionMode,
  FloodAlert,
  FloodSeverity,
  SensorConfig,
  WakeLockState,
  MotionSensorState,
  NodeMode,
  UserProfile,
  AuthState,
  isAppAdmin,
  ADMIN_EMAIL,
  ResidentSafetyReport,
} from './types';
import { wakeLockService } from './services/wakeLock';
import { motionSensorService } from './services/motionSensor';
import { acousticSensorService } from './services/acousticSensorService';
import { firebaseFloodService } from './services/firebaseService';
import { sirenService } from './services/audioSiren';
import { NotificationService } from './services/notificationService';

const DEFAULT_CONFIG: SensorConfig = {
  thresholdDelta: 1.5,
  thresholdYellow: 1.5,
  thresholdRed: 2.5,
  thresholdYellowDb: 68,
  thresholdRedDb: 82,
  soundResonanceSensitivity: 1.2,
  activeDetectionMode: 'motion',
  continuousDurationSec: 0.1,
  sensorName: 'Basement Water Vibrator Node',
  nodeId: 'node-vibrator-' + Math.random().toString(36).substring(2, 6),
  sirenVolume: 0.85,
  autoWakeLock: false,
  pushEnabled: true,
  soundAlarmOnDevice: true,
  highContrastAlert: true,
  baselineGravity: 9.81,
};

const STORAGE_KEY_SETTINGS = 'flood_alert_settings_v1';

export default function App() {
  // Enforce Light Theme with Material 3 tokens
  const isDarkMode = false;

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem('flood_alert_theme', 'light');
    } catch {
      // ignore
    }
  }, []);

  // Auth state & First-Open Welcome logic
  const [authState, setAuthState] = useState<AuthState>(() => firebaseFloodService.getAuthState());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const isAdmin = isAppAdmin(authState.user);

  // Villagers & unauthenticated users only see 'village' and 'receiver' (Alerts).
  // Default to 'village' screen for residents and guests; 'admin' (Dashboard) for admin users.
  const [currentMode, setCurrentMode] = useState<NodeMode>(() => {
    const initialUser = firebaseFloodService.getAuthState().user;
    return isAppAdmin(initialUser) ? 'admin' : 'village';
  });

  // Enforce role-based screen access: Villagers & guests are restricted to 'village' and 'receiver' (Alerts)
  useEffect(() => {
    if (!isAdmin && (currentMode === 'admin' || currentMode === 'sensor')) {
      setCurrentMode('village');
    }
  }, [isAdmin, currentMode]);

  const handleSelectMode = (mode: NodeMode) => {
    if (!isAdmin && (mode === 'admin' || mode === 'sensor')) {
      setCurrentMode('village');
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentMode(mode);
  };

  // Selected village state
  const [selectedVillage, setSelectedVillage] = useState<string>('Dzenje Village');

  // Network online/offline state
  const [isOnline, setIsOnline] = useState<boolean>(() => NotificationService.isOnline());


  // Config state
  const [config, setConfig] = useState<SensorConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  // Detection Mode (Motion Vibration vs Sound & Resonance Sensor)
  const [activeDetectionMode, setActiveDetectionMode] = useState<SensorDetectionMode>(
    config.activeDetectionMode || 'motion'
  );

  // Hardware states: OFF by default as requested by user
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Motion Sensor State
  const [motion, setMotion] = useState<MotionData>(() => motionSensorService.getLatestMotion());
  const [sustainedDuration, setSustainedDuration] = useState<number>(0);
  const [triggerProgress, setTriggerProgress] = useState<number>(0);
  const [sensorState, setSensorState] = useState<MotionSensorState>({
    isSupported: motionSensorService.isSupported(),
    isListening: false,
    permissionStatus: 'prompt',
    isCalibrating: false,
    hardwareAvailable: true,
  });

  // Sound / Acoustic Sensor State
  const [soundData, setSoundData] = useState<AcousticData>(() => acousticSensorService.getLatestData());
  const [acousticState, setAcousticState] = useState<AcousticSensorState>({
    isSupported: acousticSensorService.isSupported(),
    isListening: false,
    permissionStatus: 'prompt',
    isPaused: false,
    thresholdYellowDb: config.thresholdYellowDb || 68,
    thresholdRedDb: config.thresholdRedDb || 82,
    resonanceThreshold: 65,
  });

  const [wakeLockState, setWakeLockState] = useState<WakeLockState>({
    isSupported: wakeLockService.isSupported(),
    isActive: false,
  });

  // Alerts state
  const [alerts, setAlerts] = useState<FloodAlert[]>(() => firebaseFloodService.getLocalAlerts());
  const [activeAlert, setActiveAlert] = useState<FloodAlert | null>(null);

  // Community Safety Reports state
  const [safetyReports, setSafetyReports] = useState<ResidentSafetyReport[]>(() =>
    firebaseFloodService.getLocalSafetyReports()
  );
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isSafetyModalAutoVoice, setIsSafetyModalAutoVoice] = useState(false);
  const [isDirectVoiceSOSOpen, setIsDirectVoiceSOSOpen] = useState(false);

  const handleOpenDirectVoiceSOS = () => {
    setIsDirectVoiceSOSOpen(true);
  };

  const handleOpenNormalCheckIn = () => {
    setIsSafetyModalAutoVoice(false);
    setIsSafetyModalOpen(true);
  };

  // Modals & UI helpers
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isFcmModalOpen, setIsFcmModalOpen] = useState(false);
  const [isAlertSoundModalOpen, setIsAlertSoundModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() =>
    NotificationService.getPermission()
  );

  // Subscribe to Network Online / Offline State
  useEffect(() => {
    const unsubNetwork = NotificationService.subscribeNetworkStatus((online) => {
      setIsOnline(online);
    });
    return () => unsubNetwork();
  }, []);

  // Subscribe to Safety Reports in real-time
  useEffect(() => {
    const unsubSafety = firebaseFloodService.subscribeSafetyReports((updatedReports) => {
      setSafetyReports(updatedReports);
    });
    return () => unsubSafety();
  }, []);

  // Subscribe to Auth State
  useEffect(() => {
    const unsubAuth = firebaseFloodService.subscribeAuth((state) => {
      setAuthState(state);
      // Keep auth state synchronized
      if (state.user?.village) {
        setSelectedVillage(state.user.village);
      }
    });
    return () => {
      unsubAuth();
    };
  }, []);


  // Sync config changes to storage & services
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(config));
    } catch {
      // ignore
    }
    motionSensorService.setConfig(
      config.thresholdYellow ?? config.thresholdDelta,
      config.thresholdRed ?? 2.5,
      config.baselineGravity
    );
    sirenService.setVolume(config.sirenVolume);
  }, [config]);

  // 1. Audio Context Global Unlock
  useEffect(() => {
    const handleGlobalInteraction = () => {
      sirenService.unlockAudio();
    };

    window.addEventListener('pointerdown', handleGlobalInteraction, { passive: true });
    window.addEventListener('click', handleGlobalInteraction, { passive: true });
    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });

    const unsubWakeLock = wakeLockService.subscribe((active, err) => {
      setWakeLockState({
        isSupported: wakeLockService.isSupported(),
        isActive: active,
        error: err,
      });
    });

    return () => {
      window.removeEventListener('pointerdown', handleGlobalInteraction);
      window.removeEventListener('click', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
      unsubWakeLock();
    };
  }, []);

  // 2. Firebase Alerts Subscription
  useEffect(() => {
    const unsubAlerts = firebaseFloodService.subscribeAlerts((updatedAlerts) => {
      setAlerts(updatedAlerts);

      // Check if there is an active alert for this node
      const currentActive = updatedAlerts.find((a) => a.status === 'active');
      if (currentActive && (!activeAlert || activeAlert.id !== currentActive.id)) {
        setActiveAlert(currentActive);
        
        // Immediately start loud siren and hardware vibration
        sirenService.unlockAudio();
        if (currentActive.severity === 'yellow') {
          sirenService.startWarningChime();
        } else {
          sirenService.startEmergencySiren();
        }

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([1000, 300, 1000, 300, 1000]);
          } catch {
            // ignore
          }
        }

        // Trigger push notification if this is a newly received active alert from another device
        const isYellow = currentActive.severity === 'yellow';
        const userVillage = authState.user?.village || 'Dzenje Village';
        const locationSummary = currentActive.riverName && currentActive.village
          ? `${currentActive.riverName}, ${currentActive.village}`
          : userVillage;

        NotificationService.sendFloodPushNotification(
          isYellow ? `⚠️ FLOOD WARNING: ${locationSummary}` : `🚨 CRITICAL FLOOD ALARM: ${locationSummary}`,
          isYellow
            ? `Flood warning at ${locationSummary}. Please get ready and check your safety!`
            : `CRITICAL FLOOD ALARM at ${locationSummary}! Move to high ground immediately!`,
          {
            village: currentActive.village || userVillage,
            riverName: currentActive.riverName,
            locationLabel: currentActive.locationLabel,
            mapsUrl: currentActive.mapsUrl,
            latitude: currentActive.latitude,
            longitude: currentActive.longitude,
            peakDelta: currentActive.peakDelta,
            isTest: currentActive.source === 'simulated' || currentActive.source === 'manual_test',
          }
        );
      }
    });

    return () => {
      unsubAlerts();
    };
  }, [activeAlert, authState.user?.village]);

  // 3. Motion & Acoustic Sensors Subscriptions & Trigger Callbacks
  const handleFloodTrigger = useCallback(
    async (
      peakValue: number,
      severity: FloodSeverity = 'red',
      durationSec: number = 0.1,
      source: 'hardware_sensor' | 'acoustic_sound_sensor' | 'manual_test' | 'simulated' = 'hardware_sensor'
    ) => {
      const userVillage = authState.user?.village || 'Dzenje Village';
      const isYellow = severity === 'yellow';
      const isAcoustic = source === 'acoustic_sound_sensor';

      let title = isYellow
        ? '⚠️ Warning: Flood Motor Vibration Detected'
        : '🚨 CRITICAL FLOOD ALARM: Move to Safety';
      let message = isYellow
        ? `Motor vibration reached ${peakValue.toFixed(1)} m/s². Be on alert.`
        : `Strong motor flood vibration of ${peakValue.toFixed(1)} m/s² detected! Move to safe high ground now.`;

      if (isAcoustic) {
        title = isYellow
          ? '⚠️ Warning: System Bell Ringing'
          : '🚨 CRITICAL FLOOD ALARM: Emergency Warning Bell';
        message = isYellow
          ? `System warning bell sound reached ${peakValue.toFixed(0)} dB. Stay alert.`
          : `Emergency flood warning bell ringing loudly at ${peakValue.toFixed(0)} dB! Move to safety now!`;
      }

      await firebaseFloodService.recordFloodAlert({
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString(),
        peakDelta: peakValue,
        durationSeconds: durationSec,
        nodeId: config.nodeId,
        nodeName: config.sensorName,
        village: userVillage,
        status: 'active',
        source,
        severity,
        title,
        message,
        notes: isAcoustic
          ? `Sound sensor: ${peakValue.toFixed(0)} dB bell warning (${severity.toUpperCase()})`
          : `Vibration sensor: ${peakValue.toFixed(1)} m/s² motor movement (${severity.toUpperCase()})`,
      });
    },
    [config.nodeId, config.sensorName, authState.user?.village]
  );

  // Subscribe to Motion Sensor Data
  useEffect(() => {
    if (!isAdmin) {
      motionSensorService.stopListening();
      return;
    }

    const unsubMotion = motionSensorService.onMotion((data, sustained, progress) => {
      setMotion(data);
      setSustainedDuration(sustained);
      setTriggerProgress(progress);
    });

    const unsubTrigger = motionSensorService.onTrigger(handleFloodTrigger);

    const unsubState = motionSensorService.onStateChange((newState) => {
      setSensorState(newState);
    });

    return () => {
      unsubMotion();
      unsubTrigger();
      unsubState();
    };
  }, [isAdmin, handleFloodTrigger]);

  // Subscribe to Acoustic Sound Sensor Data
  useEffect(() => {
    if (!isAdmin) {
      acousticSensorService.stopListening();
      return;
    }

    const unsubSound = acousticSensorService.onSoundData((data) => {
      setSoundData(data);
    });

    const unsubTrigger = acousticSensorService.onTrigger(handleFloodTrigger);

    const unsubState = acousticSensorService.onStateChange((newState) => {
      setAcousticState(newState);
    });

    return () => {
      unsubSound();
      unsubTrigger();
      unsubState();
    };
  }, [isAdmin, handleFloodTrigger]);

  // Handle arming / disarming (ADMIN ONLY) - Respects active detection mode
  useEffect(() => {
    if (isAdmin && isArmed) {
      if (activeDetectionMode === 'motion') {
        acousticSensorService.stopListening();
        motionSensorService.startListening();
      } else {
        motionSensorService.stopListening();
        acousticSensorService.startListening();
      }

      if (config.autoWakeLock) {
        wakeLockService.request();
      }
    } else {
      motionSensorService.stopListening();
      acousticSensorService.stopListening();
    }
  }, [isAdmin, isArmed, activeDetectionMode, config.autoWakeLock]);

  // Toggle Arm Handler
  const handleToggleArm = () => {
    setIsArmed((prev) => {
      const next = !prev;
      if (next) {
        setIsPaused(false);
      }
      return next;
    });
  };

  // Toggle Pause Handler (Routes to active sensor)
  const handleTogglePause = () => {
    if (activeDetectionMode === 'motion') {
      const nextPaused = motionSensorService.togglePause();
      setIsPaused(nextPaused);
    } else {
      const nextPaused = acousticSensorService.togglePause();
      setIsPaused(nextPaused);
    }
  };

  // Switch Detection Mode (Motion Vibration vs Sound & Resonance)
  const handleSelectDetectionMode = (mode: SensorDetectionMode) => {
    setActiveDetectionMode(mode);
    setConfig((prev) => ({ ...prev, activeDetectionMode: mode }));
    setIsPaused(false);
  };

  // Sound Config Update
  const handleUpdateSoundConfig = (thresholdYellowDb: number, thresholdRedDb: number, sensitivity: number) => {
    setConfig((prev) => ({
      ...prev,
      thresholdYellowDb,
      thresholdRedDb,
      soundResonanceSensitivity: sensitivity,
    }));
    acousticSensorService.setConfig(thresholdYellowDb, thresholdRedDb, sensitivity);
  };

  // Request Wake Lock manually
  const handleRequestWakeLock = async () => {
    await wakeLockService.request();
  };

  // Request Notification permission
  const handleRequestNotificationPermission = async () => {
    const perm = await NotificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      NotificationService.sendFloodPushNotification(
        '🌊 Flood Alerts Activated',
        'Offline background notifications are active. You will be alerted even when the app is in the background.'
      );
    }
  };

  // Calibrate Zero Baseline
  const handleCalibrateBaseline = async (): Promise<number> => {
    const newBaseline = await motionSensorService.calibrateBaseline();
    setConfig((prev) => ({ ...prev, baselineGravity: newBaseline }));
    return newBaseline;
  };

  // Simulate Flood Test (Motion)
  const handleSimulateTest = (severity: FloodSeverity = 'red') => {
    motionSensorService.simulateFloodTest(severity);
  };

  // Simulate Sound Roar Test (Acoustic)
  const handleSimulateSoundTest = (severity: FloodSeverity = 'red') => {
    acousticSensorService.simulateSoundTest(severity);
  };

  // Manual Trigger Alert
  const handleManualTriggerAlert = (severity: FloodSeverity = 'red') => {
    if (activeDetectionMode === 'motion') {
      const peak = severity === 'yellow' ? (config.thresholdYellow ?? 1.5) : (config.thresholdRed ?? 2.5);
      handleFloodTrigger(peak, severity, 0.2, 'manual_test');
    } else {
      const peak = severity === 'yellow' ? (config.thresholdYellowDb ?? 68) : (config.thresholdRedDb ?? 82);
      handleFloodTrigger(peak, severity, 0.2, 'acoustic_sound_sensor');
    }
  };

  // Dismiss Active Alert from modal or log
  const handleDismissAlert = async (alertId: string) => {
    const author = authState.user?.name ? `${authState.user.name} (${authState.user.village})` : `Node Operator (${config.nodeId})`;
    await firebaseFloodService.dismissAlert(alertId, author, isAdmin);
    if (activeAlert && activeAlert.id === alertId) {
      setActiveAlert(null);
    }
    sirenService.stopEmergencySiren();
  };

  // Delete Alert (Local hide for users, Firestore global deletion for admins)
  const handleDeleteAlert = async (alertId: string) => {
    if (isAdmin) {
      if (window.confirm('Delete this flood alert from Firestore for everyone in the village?')) {
        await firebaseFloodService.deleteAlert(alertId, true);
        if (activeAlert && activeAlert.id === alertId) {
          setActiveAlert(null);
        }
      }
    } else {
      await firebaseFloodService.deleteAlert(alertId, false);
      if (activeAlert && activeAlert.id === alertId) {
        setActiveAlert(null);
      }
    }
  };

  // One-Tap Turn Off Sensors & Dismiss Alert
  const handleTurnOffSensorAndDismiss = async (alertId: string) => {
    setIsArmed(false);
    setIsPaused(false);
    motionSensorService.stopListening();
    acousticSensorService.stopListening();
    sirenService.stopAllAlarms();
    await handleDismissAlert(alertId);
  };

  // Clear Alerts Log (Local screen clearing for users, Firestore global wipe for admins)
  const handleClearAlerts = async () => {
    if (isAdmin) {
      if (window.confirm('Permanently delete all flood alerts from Firestore database for all village users?')) {
        await firebaseFloodService.clearAlerts(true);
        setActiveAlert(null);
        sirenService.stopEmergencySiren();
      }
    } else {
      if (window.confirm('Clear all alerts from your screen? (Sensor data remains safely stored in the village database).')) {
        await firebaseFloodService.clearAlerts(false);
        setActiveAlert(null);
        sirenService.stopEmergencySiren();
      }
    }
  };

  // Test Siren Blast
  const handleTestSiren = () => {
    sirenService.setVolume(config.sirenVolume);
    sirenService.startEmergencySiren();
    setTimeout(() => {
      sirenService.stopEmergencySiren();
    }, 1800);
  };

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  return (
    <div
      id="app-root-container"
      className={`h-[100dvh] overflow-hidden flex justify-center transition-colors duration-200 font-sans ${
        isDarkMode ? 'bg-[#141218] text-[#E6E1E5]' : 'bg-[#FEF7FF] text-[#1C1B1F]'
      }`}
    >
      {/* Mobile Device Frame Container */}
      <div
        id="mobile-phone-frame"
        className={`w-full max-w-md h-full sm:h-[96vh] sm:my-auto sm:rounded-[32px] sm:shadow-lg sm:border flex flex-col relative overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1E1F20] sm:border-[#303134] text-[#E6E1E5]'
            : 'bg-[#FEF7FF] sm:border-slate-200 text-[#1C1B1F]'
        }`}
      >
        {/* 1. Top App Bar */}
        <TopBar
          currentMode={currentMode}
          onSelectMode={handleSelectMode}
          isDarkMode={isDarkMode}
          isArmed={isArmed}
          isPaused={isPaused}
          sensorState={sensorState}
          wakeLockState={wakeLockState}
          isFirebaseConnected={firebaseFloodService.getIsFirebaseConnected()}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          currentUser={authState.user}
          isAdmin={isAdmin}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenVoiceSOS={handleOpenDirectVoiceSOS}
          activeAlertCount={activeAlertCount}
          selectedVillage={selectedVillage}
        />

        {/* 2. Fixed Mobile Content Screen (Smoothly scrollable, Bottom Nav stays fixed) */}
        <main
          id="mobile-main-scroll-area"
          className="flex-1 w-full overflow-y-auto min-h-0 px-3.5 sm:px-4 py-3.5 overscroll-contain"
        >
          {currentMode === 'admin' && (
            <AdminSafetyDashboardView
              safetyReports={safetyReports}
              alerts={alerts}
              currentUser={authState.user}
              isDarkMode={isDarkMode}
              selectedVillage={selectedVillage}
              onSelectVillage={setSelectedVillage}
              onOpenCheckInModal={handleOpenNormalCheckIn}
              onOpenDirectVoiceSOS={handleOpenDirectVoiceSOS}
              onOpenFcmModal={() => setIsFcmModalOpen(true)}
            />
          )}

          {currentMode === 'sensor' && (
            <SensorNodeView
              motion={motion}
              sensorState={sensorState}
              soundData={soundData}
              acousticState={acousticState}
              activeDetectionMode={activeDetectionMode}
              onSelectDetectionMode={handleSelectDetectionMode}
              wakeLockState={wakeLockState}
              config={config}
              isArmed={isArmed}
              isPaused={isPaused}
              sustainedDuration={sustainedDuration}
              triggerProgress={triggerProgress}
              isDarkMode={isDarkMode}
              isAdmin={isAdmin}
              currentUser={authState.user}
              onToggleArm={handleToggleArm}
              onTogglePause={handleTogglePause}
              onCalibrate={handleCalibrateBaseline}
              onSimulateTest={handleSimulateTest}
              onSimulateSoundTest={handleSimulateSoundTest}
              onGoToReceiver={() => handleSelectMode('receiver')}
              onGoToAdmin={() => handleSelectMode('admin')}
            />
          )}

          {currentMode === 'receiver' && (
            <ReceiverNodeView
              alerts={alerts}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={handleRequestNotificationPermission}
              onDismissAlert={handleDismissAlert}
              onDeleteAlert={handleDeleteAlert}
              onClearAlerts={handleClearAlerts}
              isFirebaseConnected={firebaseFloodService.getIsFirebaseConnected()}
              onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
              isDarkMode={isDarkMode}
              isOnline={isOnline}
              currentUser={authState.user}
              isAdmin={isAdmin}
              onOpenVoiceSOS={handleOpenDirectVoiceSOS}
              onOpenFcmModal={() => setIsFcmModalOpen(true)}
              onOpenSoundModal={() => setIsAlertSoundModalOpen(true)}
              onOpenSmsModal={() => setIsSmsModalOpen(true)}
            />
          )}

          {currentMode === 'village' && (
            <VillageCommunityView
              currentUser={authState.user}
              alerts={alerts}
              safetyReports={safetyReports}
              isDarkMode={isDarkMode}
              selectedVillage={selectedVillage}
              onSelectVillage={setSelectedVillage}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenDirectVoiceSOS={handleOpenDirectVoiceSOS}
              onOpenCheckInModal={handleOpenNormalCheckIn}
            />
          )}
        </main>

        {/* 3. Native Mobile Bottom Navigation Dock */}
        <MobileBottomNav
          currentMode={currentMode}
          onSelectMode={handleSelectMode}
          activeAlertCount={activeAlertCount}
          isArmed={isArmed}
          isPaused={isPaused}
          isDarkMode={isDarkMode}
          isAdmin={isAdmin}
        />


        {/* 4. Mobile Home Indicator Pill */}
        <div className="hidden sm:flex justify-center pb-2 select-none pointer-events-none">
          <div className="w-28 h-1 rounded-full bg-black/20 dark:bg-white/20" />
        </div>
      </div>

      {/* 5. Critical Alarm Full-Screen Modal Overlay */}
      <CriticalAlarmModal
        activeAlert={activeAlert}
        onDismiss={handleDismissAlert}
        onTurnOffSensorAndDismiss={handleTurnOffSensorAndDismiss}
        isSoundEnabled={config.soundAlarmOnDevice}
        onOpenCheckIn={handleOpenNormalCheckIn}
        onOpenVoiceSOS={handleOpenDirectVoiceSOS}
        isAdmin={isAdmin}
      />

      {/* 6. Direct Fast Voice Emergency SOS Modal */}
      <DirectVoiceSOSModal
        isOpen={isDirectVoiceSOSOpen}
        onClose={() => setIsDirectVoiceSOSOpen(false)}
        currentUser={authState.user}
        isDarkMode={isDarkMode}
      />

      {/* 7. Detailed Safety Status Check-In Modal */}
      <SafetyCheckInModal
        isOpen={isSafetyModalOpen}
        onClose={() => {
          setIsSafetyModalOpen(false);
          setIsSafetyModalAutoVoice(false);
        }}
        currentUser={authState.user}
        isDarkMode={isDarkMode}
        autoStartVoice={isSafetyModalAutoVoice}
      />

      {/* 8. Mobile Authentication & Profile Modal */}
      <MobileAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={authState.user}
        isDarkMode={isDarkMode}
        onSignedIn={(isAdminUser) => {
          if (isAdminUser) {
            setCurrentMode('admin');
          } else {
            setCurrentMode('village');
          }
        }}
      />

      {/* 9. Firebase Modular Web SDK Config Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* 10. Firebase Cloud Messaging (FCM) Push Gateway Modal */}
      <FcmGatewayModal
        isOpen={isFcmModalOpen}
        onClose={() => setIsFcmModalOpen(false)}
        isAdmin={isAdmin}
      />

      {/* 11. Alert Sound & Custom Ringtone Settings Modal */}
      <AlertSoundModal
        isOpen={isAlertSoundModalOpen}
        onClose={() => setIsAlertSoundModalOpen(false)}
      />

      {/* 12. Traccar SMS Gateway Settings Modal */}
      <SmsGatewayModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
      />

      {/* 13. Automatic Install App Prompt on New Devices */}
      <InstallAppPrompt isDarkMode={isDarkMode} />
    </div>
  );
}
