/**
 * Firebase Integration Service (v10+ Modular SDK)
 * - Connects Firestore & Firebase Authentication
 * - Supports Name + Village sign-in & Google OAuth sign-in
 * - Stores user profiles in `/users/{userId}`
 * - Realtime flood telemetry alerts in `/flood_alerts/{alertId}`
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocFromServer,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  Auth,
} from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { FloodAlert, UserProfile, AuthState, ADMIN_EMAIL, isAppAdmin, ResidentSafetyReport, SafetyStatusType } from '../types';

const STORAGE_KEY_USER_PROFILE = 'flood_alert_user_profile';
const STORAGE_KEY_ALERTS = 'flood_alert_history_local';
const STORAGE_KEY_SAFETY_REPORTS = 'flood_alert_safety_reports_local';
const BROADCAST_CHANNEL_NAME = 'flood_alert_system_sync';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

class FirebaseFloodService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private alertListeners: Set<(alerts: FloodAlert[]) => void> = new Set();
  private safetyListeners: Set<(reports: ResidentSafetyReport[]) => void> = new Set();
  private authListeners: Set<(state: AuthState) => void> = new Set();
  private firestoreUnsubscribe: Unsubscribe | null = null;
  private safetyFirestoreUnsubscribe: Unsubscribe | null = null;
  private isFirebaseActive: boolean = false;
  private currentAuthState: AuthState = {
    user: null,
    firebaseUid: null,
    isAuthenticated: false,
    isLoading: true,
  };

  constructor() {
    this.initBroadcastChannel();
    this.initFirebase();
  }

  private handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
    const currentFbUser = this.auth?.currentUser;
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: currentFbUser?.uid,
        email: currentFbUser?.email,
        emailVerified: currentFbUser?.emailVerified,
        isAnonymous: currentFbUser?.isAnonymous,
        tenantId: currentFbUser?.tenantId,
        providerInfo: currentFbUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
      },
      operationType,
      path,
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'NEW_ALERT') {
            this.handleLocalAlertReceived(event.data.alert);
          } else if (event.data && event.data.type === 'UPDATE_ALERT') {
            this.handleLocalAlertUpdated(event.data.alert);
          } else if (event.data && event.data.type === 'DELETE_ALERT') {
            this.handleLocalAlertDeleted(event.data.alertId);
          } else if (event.data && event.data.type === 'CLEAR_ALERTS') {
            this.notifyAlerts([]);
          } else if (event.data && event.data.type === 'NEW_SAFETY_REPORT') {
            this.handleLocalSafetyReportReceived(event.data.report);
          } else if (event.data && event.data.type === 'DELETE_SAFETY_REPORT') {
            this.handleLocalSafetyReportDeleted(event.data.reportId);
          } else if (event.data && event.data.type === 'CLEAR_SAFETY_REPORTS') {
            this.notifySafetyReports([]);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not available:', err);
      }
    }
  }

  private async initFirebase() {
    try {
      if (!getApps().length) {
        this.app = initializeApp(firebaseConfigJson);
      } else {
        this.app = getApp();
      }

      // CRITICAL: Initialize Firestore with configured databaseId
      this.db = getFirestore(this.app, firebaseConfigJson.firestoreDatabaseId);
      this.auth = getAuth(this.app);
      this.isFirebaseActive = true;

      // Validate connection to server
      this.testConnection();

      // Listen to Firebase Auth state
      onAuthStateChanged(this.auth, async (fbUser) => {
        if (fbUser) {
          await this.syncUserProfile(fbUser);
        } else {
          // Check local cached profile
          const cachedProfile = this.getCachedProfile();
          if (cachedProfile) {
            this.updateAuthState({
              user: cachedProfile,
              firebaseUid: cachedProfile.uid,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            this.updateAuthState({
              user: null,
              firebaseUid: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        }
      });

      this.subscribeFirestoreAlerts();
      this.subscribeFirestoreSafetyReports();
    } catch (err) {
      console.warn('Firebase initialization error:', err);
      this.isFirebaseActive = false;
      const cached = this.getCachedProfile();
      this.updateAuthState({
        user: cached,
        firebaseUid: cached?.uid || null,
        isAuthenticated: !!cached,
        isLoading: false,
      });
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.db) return false;
    try {
      await getDocFromServer(doc(this.db, 'test', 'connection'));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firebase client is offline, check configuration.');
      }
      return false;
    }
  }

  private async syncUserProfile(fbUser: User) {
    let profile: UserProfile | null = null;

    if (this.db) {
      try {
        const userDocRef = doc(this.db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const userEmail = fbUser.email || data.email;
          const cleanName = (data.name || fbUser.displayName || '').toLowerCase().trim().replace(/\s+/g, ' ');
          const cleanVillage = (data.village || '').toLowerCase().trim().replace(/\s+/g, ' ');
          const isAdminUser =
            (userEmail && userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) ||
            (cleanName === 'dzenje cdss adda stem club' && cleanVillage === 'dzenje village');
          profile = {
            uid: fbUser.uid,
            name: data.name || fbUser.displayName || (isAdminUser ? 'Dzenje CDSS ADDA STEM CLUB' : 'Resident'),
            village: data.village || 'Dzenje Village',
            email: userEmail,
            photoURL: fbUser.photoURL || data.photoURL,
            authProvider: data.authProvider || (fbUser.isAnonymous ? 'name_village' : 'google'),
            hasPassword: data.hasPassword,
            role: isAdminUser ? 'admin' : (data.role || 'resident'),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
      } catch {
        // Continue with local / fallback
      }
    }

    if (!profile) {
      const cached = this.getCachedProfile();
      if (cached && cached.uid === fbUser.uid) {
        profile = cached;
      } else {
        const userEmail = fbUser.email || undefined;
        const isAdminUser = userEmail && userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
        profile = {
          uid: fbUser.uid,
          name: fbUser.displayName || (isAdminUser ? 'Admin Peter (System Manager)' : 'Community Member'),
          village: 'Riverside Village',
          email: userEmail,
          photoURL: fbUser.photoURL || undefined,
          authProvider: fbUser.isAnonymous ? 'name_village' : 'google',
          role: isAdminUser ? 'admin' : 'resident',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    this.saveCachedProfile(profile);
    this.updateAuthState({
      user: profile,
      firebaseUid: fbUser.uid,
      isAuthenticated: true,
      isLoading: false,
    });
  }

  private updateAuthState(state: AuthState) {
    this.currentAuthState = state;
    this.authListeners.forEach((cb) => cb(state));
  }

  public getCachedProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveCachedProfile(profile: UserProfile | null) {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Option 1: Sign in using Name, Village, and (optional password)
   */
  public async signInWithNameAndVillage(
    name: string,
    village: string,
    password?: string
  ): Promise<UserProfile> {
    const trimmedName = name.trim();
    const trimmedVillage = village.trim();

    if (!trimmedName || !trimmedVillage) {
      throw new Error('Please enter both your name and village.');
    }

    this.updateAuthState({ ...this.currentAuthState, isLoading: true, error: undefined });

    try {
      let uid = 'user_' + Date.now();

      if (this.auth) {
        try {
          // Attempt Firebase anonymous authentication if enabled in project
          const cred = await signInAnonymously(this.auth);
          uid = cred.user.uid;
          if (trimmedName) {
            try {
              await updateProfile(cred.user, { displayName: trimmedName });
            } catch {
              // Ignore
            }
          }
        } catch (authErr) {
          // Note: If Anonymous Auth is restricted in Firebase console (auth/admin-restricted-operation),
          // fallback cleanly to persistent client device ID so all users can sign in smoothly.
          console.warn('Firebase Anonymous sign-in unavailable or restricted, using persistent local session:', authErr);
          const cached = this.getCachedProfile();
          if (cached && cached.uid) {
            uid = cached.uid;
          } else {
            uid = 'resident_' + Math.random().toString(36).substring(2, 10);
          }
        }
      }

      const cleanName = trimmedName.toLowerCase().replace(/\s+/g, ' ');
      const cleanVillage = trimmedVillage.toLowerCase().replace(/\s+/g, ' ');
      const isMatchAdminName =
        cleanName === 'dzenje cdss adda stem club' ||
        cleanName === 'dzenje cdss' ||
        cleanName === 'adda stem club' ||
        cleanName.includes('adda stem');
      const isMatchAdminVillage =
        cleanVillage === 'dzenje village' || cleanVillage === 'dzenje';
      const isAdminLogin = isMatchAdminName && isMatchAdminVillage;

      const profile: UserProfile = {
        uid,
        name: trimmedName,
        village: trimmedVillage,
        authProvider: 'name_village',
        hasPassword: Boolean(password && password.trim().length > 0),
        role: isAdminLogin ? 'admin' : 'resident',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore if available
      if (this.db) {
        try {
          await setDoc(doc(this.db, 'users', uid), profile, { merge: true });
        } catch (err) {
          console.warn('Could not write profile to Firestore (cached locally):', err);
        }
      }

      this.saveCachedProfile(profile);
      this.updateAuthState({
        user: profile,
        firebaseUid: uid,
        isAuthenticated: true,
        isLoading: false,
      });

      return profile;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Sign in failed';
      this.updateAuthState({
        ...this.currentAuthState,
        isLoading: false,
        error: errMsg,
      });
      throw err;
    }
  }

  /**
   * Option 2: Sign in using Google Account
   */
  public async signInWithGoogle(defaultVillage: string = 'Highland Riverside'): Promise<UserProfile> {
    if (!this.auth) {
      throw new Error('Firebase Auth is not available.');
    }

    this.updateAuthState({ ...this.currentAuthState, isLoading: true, error: undefined });

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const fbUser = result.user;

      let village = defaultVillage;
      // Check if existing profile document has village
      if (this.db) {
        try {
          const userDoc = await getDoc(doc(this.db, 'users', fbUser.uid));
          if (userDoc.exists() && userDoc.data().village) {
            village = userDoc.data().village;
          }
        } catch {
          // ignore
        }
      }

      const userEmail = fbUser.email || undefined;
      const isAdminUser = userEmail && userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

      const profile: UserProfile = {
        uid: fbUser.uid,
        name: fbUser.displayName || (isAdminUser ? 'Admin Peter (System Manager)' : 'Google User'),
        village,
        email: userEmail,
        photoURL: fbUser.photoURL || undefined,
        authProvider: 'google',
        role: isAdminUser ? 'admin' : 'resident',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (this.db) {
        try {
          await setDoc(doc(this.db, 'users', fbUser.uid), profile, { merge: true });
        } catch (err) {
          console.warn('Could not write Google user to Firestore:', err);
        }
      }

      this.saveCachedProfile(profile);
      this.updateAuthState({
        user: profile,
        firebaseUid: fbUser.uid,
        isAuthenticated: true,
        isLoading: false,
      });

      return profile;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      this.updateAuthState({
        ...this.currentAuthState,
        isLoading: false,
        error: errMsg,
      });
      throw err;
    }
  }

  /**
   * Update Profile (e.g. Village or Name)
   */
  public async updateProfileData(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = this.currentAuthState.user;
    if (!current) throw new Error('No user is currently signed in');

    const newName = (updates.name !== undefined ? updates.name : current.name).trim();
    const newVillage = (updates.village !== undefined ? updates.village : current.village).trim();
    const cleanName = newName.toLowerCase().replace(/\s+/g, ' ');
    const cleanVillage = newVillage.toLowerCase().replace(/\s+/g, ' ');
    const isAdminUser =
      (current.email && current.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) ||
      (cleanName === 'dzenje cdss adda stem club' && cleanVillage === 'dzenje village');

    const updatedProfile: UserProfile = {
      ...current,
      ...updates,
      name: newName,
      village: newVillage,
      role: isAdminUser ? 'admin' : (updates.role || current.role || 'resident'),
      updatedAt: new Date().toISOString(),
    };

    if (this.db && this.currentAuthState.firebaseUid) {
      try {
        await updateDoc(doc(this.db, 'users', this.currentAuthState.firebaseUid), {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to update profile on Firestore:', err);
      }
    }

    this.saveCachedProfile(updatedProfile);
    this.updateAuthState({
      ...this.currentAuthState,
      user: updatedProfile,
    });

    return updatedProfile;
  }

  /**
   * Sign Out
   */
  public async signOutUser(): Promise<void> {
    try {
      if (this.auth) {
        await signOut(this.auth);
      }
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
    this.saveCachedProfile(null);
    this.updateAuthState({
      user: null,
      firebaseUid: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  private subscribeFirestoreAlerts() {
    if (!this.db) return;

    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
    }

    try {
      const q = query(
        collection(this.db, 'flood_alerts'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      this.firestoreUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const alerts: FloodAlert[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            alerts.push({
              id: docSnapshot.id,
              timestamp: data.timestamp || Date.now(),
              formattedTime: data.formattedTime || new Date(data.timestamp).toLocaleTimeString(),
              peakDelta: data.peakDelta || 0,
              durationSeconds: data.durationSeconds || 0,
              nodeId: data.nodeId || 'node-unknown',
              nodeName: data.nodeName || 'Sensor Node',
              village: data.village || data.location?.village || 'Dzenje',
              location: data.location,
              locationLabel: data.locationLabel || (data.location ? `${data.location.riverName}, ${data.location.village}` : undefined),
              riverName: data.riverName || data.location?.riverName,
              traditionalAuthority: data.traditionalAuthority || data.location?.traditionalAuthority,
              district: data.district || data.location?.district,
              region: data.region || data.location?.region,
              latitude: data.latitude ?? data.location?.coordinates?.latitude,
              longitude: data.longitude ?? data.location?.coordinates?.longitude,
              mapsUrl: data.mapsUrl || data.location?.mapsUrl,
              userId: data.userId,
              status: data.status || 'active',
              severity: data.severity || (data.peakDelta >= 1.5 ? 'red' : 'yellow'),
              title: data.title,
              message: data.message,
              dismissedBy: data.dismissedBy,
              dismissedAt: data.dismissedAt,
              source: data.source || 'hardware_sensor',
              notes: data.notes,
            });
          });

          this.saveLocalAlerts(alerts);
          this.notifyAlerts(alerts);
        },
        (error) => {
          console.warn('Firestore alerts snapshot listener error:', error);
        }
      );
    } catch (err) {
      console.warn('Firestore subscription failed:', err);
    }
  }

  public async recordFloodAlert(alert: Omit<FloodAlert, 'id'>): Promise<FloodAlert> {
    const user = this.currentAuthState.user;
    const alertWithUser: Omit<FloodAlert, 'id'> = {
      ...alert,
      village: alert.village || alert.location?.village || user?.village || 'Dzenje',
      riverName: alert.riverName || alert.location?.riverName || 'Ruo River',
      traditionalAuthority: alert.traditionalAuthority || alert.location?.traditionalAuthority || 'T/A Mabuka',
      district: alert.district || alert.location?.district || 'Mulanje',
      region: alert.region || alert.location?.region || 'Southern Region, Malawi',
      locationLabel: alert.locationLabel || (alert.location ? `${alert.location.riverName}, ${alert.location.village}, ${alert.location.traditionalAuthority}` : `${alert.village || 'Dzenje'}`),
      latitude: alert.latitude ?? alert.location?.coordinates?.latitude,
      longitude: alert.longitude ?? alert.location?.coordinates?.longitude,
      mapsUrl: alert.mapsUrl || alert.location?.mapsUrl || (alert.latitude && alert.longitude ? `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}` : undefined),
      userId: user?.uid || this.currentAuthState.firebaseUid || 'anonymous',
    };

    const newAlert: FloodAlert = {
      ...alertWithUser,
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    };

    // 1. Write to Firestore if connected
    if (this.db) {
      try {
        const docRef = await addDoc(collection(this.db, 'flood_alerts'), {
          ...alertWithUser,
          createdAt: new Date().toISOString(),
        });
        newAlert.id = docRef.id;
      } catch (err) {
        console.warn('Could not write alert to Firestore, stored locally:', err);
      }
    }

    // 2. Write to local storage & broadcast to other tabs/receivers
    const existing = this.getLocalAlerts();
    const updated = [newAlert, ...existing].slice(0, 100);
    this.saveLocalAlerts(updated);
    this.notifyAlerts(updated);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'NEW_ALERT', alert: newAlert });
    }

    return newAlert;
  }

  public async dismissAlert(alertId: string, dismissedBy?: string): Promise<void> {
    const user = this.currentAuthState.user;
    const authorName = dismissedBy || user?.name || 'Authorized Member';
    const now = Date.now();

    // 1. Update Firestore if connected
    if (this.db) {
      try {
        const docRef = doc(this.db, 'flood_alerts', alertId);
        await updateDoc(docRef, {
          status: 'dismissed',
          dismissedBy: authorName,
          dismissedAt: now,
        });
      } catch (err) {
        console.warn('Firestore alert update failed:', err);
      }
    }

    // 2. Update local state
    const existing = this.getLocalAlerts();
    const updated = existing.map((item) => {
      if (item.id === alertId) {
        return {
          ...item,
          status: 'dismissed' as const,
          dismissedBy: authorName,
          dismissedAt: now,
        };
      }
      return item;
    });

    this.saveLocalAlerts(updated);
    this.notifyAlerts(updated);

    if (this.broadcastChannel) {
      const target = updated.find((a) => a.id === alertId);
      if (target) {
        this.broadcastChannel.postMessage({ type: 'UPDATE_ALERT', alert: target });
      }
    }
  }

  public async deleteAlert(alertId: string): Promise<void> {
    if (this.db) {
      try {
        const docRef = doc(this.db, 'flood_alerts', alertId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore delete flood_alert failed:', err);
      }
    }

    this.handleLocalAlertDeleted(alertId);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'DELETE_ALERT', alertId });
    }
  }

  public async clearAlerts(): Promise<void> {
    this.saveLocalAlerts([]);
    this.notifyAlerts([]);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'CLEAR_ALERTS' });
    }
  }

  private handleLocalAlertDeleted(alertId: string) {
    const existing = this.getLocalAlerts();
    const updated = existing.filter((item) => item.id !== alertId);
    this.saveLocalAlerts(updated);
    this.notifyAlerts(updated);
  }

  public getLocalAlerts(): FloodAlert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ALERTS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    const now = Date.now();
    return [
      {
        id: 'alert-seed-1',
        timestamp: now - 1000 * 60 * 30,
        formattedTime: new Date(now - 1000 * 60 * 30).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        peakDelta: 1.85,
        durationSeconds: 4,
        nodeId: 'ruo-station-01',
        nodeName: 'Ruo River Bridge Sensor',
        village: 'Dzenje Village',
        locationLabel: 'Ruo River, Dzenje Village, T/A Mabuka, Mulanje',
        riverName: 'Ruo River',
        traditionalAuthority: 'T/A Mabuka',
        district: 'Mulanje',
        status: 'active',
        severity: 'red',
        source: 'hardware_sensor',
      },
      {
        id: 'alert-seed-2',
        timestamp: now - 1000 * 60 * 180,
        formattedTime: new Date(now - 1000 * 60 * 180).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        peakDelta: 0.95,
        durationSeconds: 3,
        nodeId: 'likhubula-station-02',
        nodeName: 'Likhubula River Sensor',
        village: 'Mabuka Village',
        locationLabel: 'Likhubula River, Mabuka Village, T/A Mabuka, Mulanje',
        riverName: 'Likhubula River',
        traditionalAuthority: 'T/A Mabuka',
        district: 'Mulanje',
        status: 'resolved',
        severity: 'yellow',
        source: 'acoustic_sound_sensor',
      },
    ];
  }

  private saveLocalAlerts(alerts: FloodAlert[]) {
    try {
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }

  private handleLocalAlertReceived(alert: FloodAlert) {
    const existing = this.getLocalAlerts();
    if (!existing.some((a) => a.id === alert.id)) {
      const updated = [alert, ...existing].slice(0, 100);
      this.saveLocalAlerts(updated);
      this.notifyAlerts(updated);
    }
  }

  private handleLocalAlertUpdated(alert: FloodAlert) {
    const existing = this.getLocalAlerts();
    const updated = existing.map((item) => (item.id === alert.id ? alert : item));
    this.saveLocalAlerts(updated);
    this.notifyAlerts(updated);
  }

  public subscribeAlerts(cb: (alerts: FloodAlert[]) => void): () => void {
    this.alertListeners.add(cb);
    cb(this.getLocalAlerts());
    return () => this.alertListeners.delete(cb);
  }

  public subscribeSafetyReports(cb: (reports: ResidentSafetyReport[]) => void): () => void {
    this.safetyListeners.add(cb);
    cb(this.getLocalSafetyReports());
    return () => this.safetyListeners.delete(cb);
  }

  public subscribeAuth(cb: (state: AuthState) => void): () => void {
    this.authListeners.add(cb);
    cb(this.currentAuthState);
    return () => this.authListeners.delete(cb);
  }

  private notifyAlerts(alerts: FloodAlert[]) {
    this.alertListeners.forEach((cb) => cb(alerts));
  }

  private notifySafetyReports(reports: ResidentSafetyReport[]) {
    this.safetyListeners.forEach((cb) => cb(reports));
  }

  private subscribeFirestoreSafetyReports() {
    if (!this.db) return;

    if (this.safetyFirestoreUnsubscribe) {
      this.safetyFirestoreUnsubscribe();
    }

    try {
      const q = query(
        collection(this.db, 'safety_reports'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      this.safetyFirestoreUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const reports: ResidentSafetyReport[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            reports.push({
              id: docSnapshot.id,
              userId: data.userId || 'anonymous',
              userName: data.userName || 'Resident',
              village: data.village || 'Dzenje Village',
              status: data.status || 'safe',
              statusLabel: data.statusLabel,
              peopleCount: data.peopleCount,
              phone: data.phone,
              message: data.message,
              timestamp: data.timestamp || Date.now(),
              formattedTime: data.formattedTime || new Date(data.timestamp || Date.now()).toLocaleTimeString(),
              latitude: data.latitude,
              longitude: data.longitude,
              mapsUrl: data.mapsUrl,
              voiceAudioBase64: data.voiceAudioBase64,
              voiceDurationSec: data.voiceDurationSec,
              hasVoiceNote: data.hasVoiceNote || !!data.voiceAudioBase64,
              updatedAt: data.updatedAt,
            });
          });

          this.saveLocalSafetyReports(reports);
          this.notifySafetyReports(reports);
        },
        (error) => {
          console.warn('Firestore safety reports snapshot listener error:', error);
        }
      );
    } catch (err) {
      console.warn('Firestore safety reports subscription failed:', err);
    }
  }

  public async submitSafetyReport(
    reportData: Omit<ResidentSafetyReport, 'id' | 'timestamp' | 'formattedTime'>
  ): Promise<ResidentSafetyReport> {
    const user = this.currentAuthState.user;
    const now = Date.now();
    const formatted = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newReport: ResidentSafetyReport = {
      ...reportData,
      id: 'report_' + now + '_' + Math.random().toString(36).substring(2, 7),
      userId: reportData.userId || user?.uid || this.currentAuthState.firebaseUid || 'anonymous_user',
      userName: reportData.userName || user?.name || 'Resident',
      village: reportData.village || user?.village || 'Dzenje Village',
      timestamp: now,
      formattedTime: formatted,
      updatedAt: new Date(now).toISOString(),
    };

    // 1. Write to Firestore if connected
    if (this.db) {
      try {
        const docRef = await addDoc(collection(this.db, 'safety_reports'), {
          ...newReport,
          createdAt: new Date().toISOString(),
        });
        newReport.id = docRef.id;
      } catch (err) {
        console.warn('Could not write safety report to Firestore, stored locally:', err);
      }
    }

    // 2. Save locally and broadcast
    const existing = this.getLocalSafetyReports();
    // Replace any previous report by the same user or prepend
    const filtered = existing.filter((r) => r.userId !== newReport.userId);
    const updated = [newReport, ...filtered].slice(0, 100);
    this.saveLocalSafetyReports(updated);
    this.notifySafetyReports(updated);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'NEW_SAFETY_REPORT', report: newReport });
    }

    return newReport;
  }

  public getLocalSafetyReports(): ResidentSafetyReport[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAFETY_REPORTS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    // Default seed sample data if empty so UI looks alive
    return [
      {
        id: 'seed-1',
        userId: 'seed-user-1',
        userName: 'Peter Damiano',
        village: 'Dzenje Village',
        status: 'safe',
        statusLabel: 'Safe at Home (Flood Waters Receded)',
        peopleCount: 4,
        phone: '+265 999 123 456',
        message: 'Ruo River banks receded. Family is safe, water clear.',
        timestamp: Date.now() - 1000 * 60 * 15,
        formattedTime: '15 mins ago',
      },
      {
        id: 'seed-2',
        userId: 'seed-user-2',
        userName: 'Chikondi Phiri',
        village: 'Dzenje Village',
        status: 'evacuated',
        statusLabel: 'Evacuated to High Ground',
        peopleCount: 6,
        phone: '+265 888 234 567',
        message: 'Moved to Dzenje Primary School shelter.',
        timestamp: Date.now() - 1000 * 60 * 45,
        formattedTime: '45 mins ago',
      },
      {
        id: 'seed-3',
        userId: 'seed-user-3',
        userName: 'Mary Banda',
        village: 'Mabuka Village',
        status: 'in_flooding',
        statusLabel: 'In Flooding (Compound Flooded)',
        peopleCount: 3,
        phone: '+265 991 345 678',
        message: 'Water entering front porch, observing river level.',
        timestamp: Date.now() - 1000 * 60 * 60,
        formattedTime: '1 hour ago',
      },
    ];
  }

  public async deleteSafetyReport(reportId: string): Promise<void> {
    if (this.db) {
      try {
        const docRef = doc(this.db, 'safety_reports', reportId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore delete safety_report failed:', err);
      }
    }

    this.handleLocalSafetyReportDeleted(reportId);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'DELETE_SAFETY_REPORT', reportId });
    }
  }

  public async clearSafetyReports(): Promise<void> {
    this.saveLocalSafetyReports([]);
    this.notifySafetyReports([]);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'CLEAR_SAFETY_REPORTS' });
    }
  }

  private handleLocalSafetyReportDeleted(reportId: string) {
    const existing = this.getLocalSafetyReports();
    const updated = existing.filter((r) => r.id !== reportId);
    this.saveLocalSafetyReports(updated);
    this.notifySafetyReports(updated);
  }

  private saveLocalSafetyReports(reports: ResidentSafetyReport[]) {
    try {
      localStorage.setItem(STORAGE_KEY_SAFETY_REPORTS, JSON.stringify(reports));
    } catch {
      // ignore
    }
  }

  private handleLocalSafetyReportReceived(report: ResidentSafetyReport) {
    const existing = this.getLocalSafetyReports();
    const filtered = existing.filter((r) => r.id !== report.id && r.userId !== report.userId);
    const updated = [report, ...filtered].slice(0, 100);
    this.saveLocalSafetyReports(updated);
    this.notifySafetyReports(updated);
  }

  public async registerFcmToken(token: string): Promise<void> {
    if (!token) return;
    try {
      localStorage.setItem('flood_alert_fcm_token', token);
      if (this.db) {
        const tokenDocId = token.slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, '_');
        const tokenRef = doc(this.db, 'fcm_tokens', tokenDocId);
        await setDoc(
          tokenRef,
          {
            token,
            userId: this.currentAuthState.user?.uid || 'anonymous_subscriber',
            userName: this.currentAuthState.user?.name || 'Resident',
            village: this.currentAuthState.user?.village || 'Dzenje Village',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            updatedAt: new Date().toISOString(),
            timestamp: Date.now(),
          },
          { merge: true }
        );
        console.log('[FCM] Device push token registered in Firestore:', tokenDocId);
      }
    } catch (err) {
      console.warn('[FCM] Token registration in Firestore note:', err);
    }
  }

  public getAuthState(): AuthState {
    return this.currentAuthState;
  }

  public getIsFirebaseConnected(): boolean {
    return this.isFirebaseActive && this.db !== null;
  }
}

export const firebaseFloodService = new FirebaseFloodService();
