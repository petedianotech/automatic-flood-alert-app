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
import { MobileStatusBar } from './components/MobileStatusBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileAuthModal } from './components/MobileAuthModal';
import { VillageCommunityView } from './components/VillageCommunityView';
import { SensorNodeView } from './components/SensorNodeView';
import { ReceiverNodeView } from './components/ReceiverNodeView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { CriticalAlarmModal } from './components/CriticalAlarmModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import {
  MotionData,
  FloodAlert,
  SensorConfig,
  WakeLockState,
  MotionSensorState,
  NodeMode,
  UserProfile,
  AuthState,
  isAppAdmin,
  ADMIN_EMAIL,
} from './types';
import { wakeLockService } from './services/wakeLock';
import { motionSensorService } from './services/motionSensor';
import { firebaseFloodService } from './services/firebaseService';
import { sirenService } from './services/audioSiren';
import { NotificationService } from './services/notificationService';
import { useBattery } from './services/batteryService';

const DEFAULT_CONFIG: SensorConfig = {
  thresholdDelta: 1.5, // 1.5 m/s^2
  continuousDurationSec: 3.0, // 3 seconds
  sensorName: 'Basement Water Vibrator Node',
  nodeId: 'node-vibrator-' + Math.random().toString(36).substring(2, 6),
  sirenVolume: 0.85,
  autoWakeLock: true,
  pushEnabled: true,
  soundAlarmOnDevice: true,
  highContrastAlert: true,
  baselineGravity: 9.81,
};

const STORAGE_KEY_SETTINGS = 'flood_alert_settings_v1';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // App mode: 'sensor' | 'receiver' | 'village' | 'diagnostics'
  // Default to 'receiver' screen for residents / general users, and 'sensor' screen for admin
  const [currentMode, setCurrentMode] = useState<NodeMode>(() =>
    isAppAdmin(firebaseFloodService.getAuthState().user) ? 'sensor' : 'receiver'
  );

  // Network online/offline state
  const [isOnline, setIsOnline] = useState<boolean>(() => NotificationService.isOnline());

  // Battery status hook for mobile status bar
  const batteryState = useBattery();

  // Auth state
  const [authState, setAuthState] = useState<AuthState>(() => firebaseFloodService.getAuthState());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isAdmin = isAppAdmin(authState.user);

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

  // Hardware states
  const [isArmed, setIsArmed] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [motion, setMotion] = useState<MotionData>(() => motionSensorService.getLatestMotion());
  const [sustainedDuration, setSustainedDuration] = useState<number>(0);
  const [triggerProgress, setTriggerProgress] = useState<number>(0);

  const [wakeLockState, setWakeLockState] = useState<WakeLockState>({
    isSupported: wakeLockService.isSupported(),
    isActive: false,
  });

  const [sensorState, setSensorState] = useState<MotionSensorState>({
    isSupported: motionSensorService.isSupported(),
    isListening: false,
    permissionStatus: 'prompt',
    isCalibrating: false,
    hardwareAvailable: true,
  });

  // Alerts state
  const [alerts, setAlerts] = useState<FloodAlert[]>(() => firebaseFloodService.getLocalAlerts());
  const [activeAlert, setActiveAlert] = useState<FloodAlert | null>(null);

  // Modals & UI helpers
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
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

  // Subscribe to Auth State
  useEffect(() => {
    const unsubAuth = firebaseFloodService.subscribeAuth((state) => {
      setAuthState(state);
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
    motionSensorService.setConfig(config.thresholdDelta, config.continuousDurationSec, config.baselineGravity);
    sirenService.setVolume(config.sirenVolume);
  }, [config]);

  // Dark mode class toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 1. Screen Wake Lock Lifecycle (Auto-request on page load to keep plugged-in screen awake)
  useEffect(() => {
    const unsubWakeLock = wakeLockService.subscribe((active, err) => {
      setWakeLockState({
        isSupported: wakeLockService.isSupported(),
        isActive: active,
        error: err,
      });
    });

    if (config.autoWakeLock) {
      wakeLockService.request();
    }

    return () => {
      unsubWakeLock();
    };
  }, [config.autoWakeLock]);

  // 2. Firebase Alerts Subscription
  useEffect(() => {
    const unsubAlerts = firebaseFloodService.subscribeAlerts((updatedAlerts) => {
      setAlerts(updatedAlerts);

      // Check if there is an active alert for this node
      const currentActive = updatedAlerts.find((a) => a.status === 'active');
      if (currentActive && !activeAlert) {
        setActiveAlert(currentActive);
      }
    });

    return () => {
      unsubAlerts();
    };
  }, [activeAlert]);

  // 3. Motion Sensor Subscription & Alert Trigger Callback
  const handleFloodTrigger = useCallback(
    async (peakDelta: number, durationSec: number, source: 'hardware_sensor' | 'manual_test' | 'simulated') => {
      const userVillage = authState.user?.village || 'Riverbank East';
      const newAlert = await firebaseFloodService.recordFloodAlert({
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString(),
        peakDelta,
        durationSeconds: durationSec,
        nodeId: config.nodeId,
        nodeName: config.sensorName,
        village: userVillage,
        status: 'active',
        source,
        notes: `Continuous vibration exceeded ${config.thresholdDelta.toFixed(2)} m/s² for ${durationSec.toFixed(1)}s`,
      });

      setActiveAlert(newAlert);

      // Send Offline-ready Background Push Notification (works even in background or offline)
      NotificationService.sendFloodPushNotification(
        `🚨 FLOOD WARNING: ${userVillage}`,
        `High continuous vibration detected at ${config.sensorName} (Peak: ${peakDelta.toFixed(2)} m/s²). Check water sensor immediately!`,
        {
          village: userVillage,
          peakDelta,
          isTest: source === 'simulated' || source === 'manual_test',
        }
      );
    },
    [config.nodeId, config.sensorName, config.thresholdDelta, authState.user?.village]
  );

  useEffect(() => {
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
  }, [handleFloodTrigger]);

  // Handle arming / disarming
  useEffect(() => {
    if (isArmed) {
      motionSensorService.startListening();
      if (config.autoWakeLock) {
        wakeLockService.request();
      }
    } else {
      motionSensorService.stopListening();
    }
  }, [isArmed, config.autoWakeLock]);

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

  // Toggle Pause Handler
  const handleTogglePause = () => {
    const nextPaused = motionSensorService.togglePause();
    setIsPaused(nextPaused);
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

  // Simulate Flood Test
  const handleSimulateTest = (durationSec = 3.5, peakForce = 3.2) => {
    motionSensorService.simulateFloodTest(durationSec, peakForce);
  };

  // Manual Trigger Alert
  const handleManualTriggerAlert = () => {
    handleFloodTrigger(3.45, 3.0, 'manual_test');
  };

  // Dismiss Active Alert from modal or log
  const handleDismissAlert = async (alertId: string) => {
    const author = authState.user?.name ? `${authState.user.name} (${authState.user.village})` : `Node Operator (${config.nodeId})`;
    await firebaseFloodService.dismissAlert(alertId, author);
    if (activeAlert && activeAlert.id === alertId) {
      setActiveAlert(null);
    }
    sirenService.stopEmergencySiren();
  };

  // Clear Alerts Log
  const handleClearAlerts = async () => {
    if (window.confirm('Clear all recorded flood incidents from the history log?')) {
      await firebaseFloodService.clearAlerts();
      setActiveAlert(null);
      sirenService.stopEmergencySiren();
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
      className={`min-h-screen flex justify-center transition-colors duration-200 font-sans ${
        isDarkMode ? 'bg-[#0B0C0E] text-[#E3E3E3]' : 'bg-[#EDF0F5] text-[#1F1F1F]'
      }`}
    >
      {/* Mobile Device Frame Container */}
      <div
        id="mobile-phone-frame"
        className={`w-full max-w-md min-h-screen sm:min-h-[96vh] sm:my-3 sm:rounded-[36px] sm:shadow-2xl sm:border flex flex-col relative overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#141517] sm:border-[#2C2D30] text-[#E3E3E3]'
            : 'bg-[#F8F9FA] sm:border-[#DDE1E6] text-[#1F1F1F]'
        }`}
      >
        {/* 1. Native Mobile Status Bar with Live Online/Offline & Battery */}
        <MobileStatusBar batteryState={batteryState} isDarkMode={isDarkMode} isOnline={isOnline} />

        {/* 2. Top App Bar */}
        <TopBar
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          isArmed={isArmed}
          isPaused={isPaused}
          sensorState={sensorState}
          wakeLockState={wakeLockState}
          isFirebaseConnected={firebaseFloodService.getIsFirebaseConnected()}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          currentUser={authState.user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          activeAlertCount={activeAlertCount}
        />

        {/* 3. Scrollable Mobile Content Screen */}
        <main
          id="mobile-main-scroll-area"
          className="flex-1 w-full px-3.5 sm:px-4 py-4 overflow-y-auto space-y-4"
        >
          {currentMode === 'sensor' && (
            <SensorNodeView
              motion={motion}
              sensorState={sensorState}
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
              onRequestWakeLock={handleRequestWakeLock}
              onManualTriggerAlert={handleManualTriggerAlert}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onGoToReceiver={() => setCurrentMode('receiver')}
            />
          )}

          {currentMode === 'receiver' && (
            <ReceiverNodeView
              alerts={alerts}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={handleRequestNotificationPermission}
              onDismissAlert={handleDismissAlert}
              onClearAlerts={handleClearAlerts}
              onTestSiren={handleTestSiren}
              isFirebaseConnected={firebaseFloodService.getIsFirebaseConnected()}
              onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
              isDarkMode={isDarkMode}
              isOnline={isOnline}
            />
          )}

          {currentMode === 'village' && (
            <VillageCommunityView
              currentUser={authState.user}
              alerts={alerts}
              isDarkMode={isDarkMode}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onTestSiren={handleTestSiren}
            />
          )}

          {currentMode === 'diagnostics' && (
            <DiagnosticsView
              config={config}
              onUpdateConfig={setConfig}
              sensorState={sensorState}
              wakeLockState={wakeLockState}
              onRequestWakeLock={handleRequestWakeLock}
              onRequestMotionPermission={() => motionSensorService.requestPermission()}
              onTestSiren={handleTestSiren}
              isDarkMode={isDarkMode}
            />
          )}
        </main>

        {/* 4. Native Mobile Bottom Navigation Dock */}
        <MobileBottomNav
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          activeAlertCount={activeAlertCount}
          isArmed={isArmed}
          isPaused={isPaused}
          isDarkMode={isDarkMode}
          isAdmin={isAdmin}
        />

        {/* 5. Mobile Home Indicator Pill */}
        <div className="hidden sm:flex justify-center pb-2 select-none pointer-events-none">
          <div className="w-28 h-1 rounded-full bg-black/20 dark:bg-white/20" />
        </div>
      </div>

      {/* 6. Critical Alarm Full-Screen Modal Overlay */}
      <CriticalAlarmModal
        activeAlert={activeAlert}
        onDismiss={handleDismissAlert}
        isSoundEnabled={config.soundAlarmOnDevice}
      />

      {/* 7. Mobile Authentication & Profile Modal */}
      <MobileAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={authState.user}
        isDarkMode={isDarkMode}
      />

      {/* 8. Firebase Modular Web SDK Config Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
