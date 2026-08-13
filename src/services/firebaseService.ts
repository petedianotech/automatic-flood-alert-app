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
import { FloodAlert, UserProfile, AuthState, ADMIN_EMAIL, isAppAdmin } from '../types';

const STORAGE_KEY_USER_PROFILE = 'flood_alert_user_profile';
const STORAGE_KEY_ALERTS = 'flood_alert_history_local';
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
  private authListeners: Set<(state: AuthState) => void> = new Set();
  private firestoreUnsubscribe: Unsubscribe | null = null;
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
          } else if (event.data && event.data.type === 'CLEAR_ALERTS') {
            this.notifyAlerts([]);
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
          const isAdminUser = userEmail && userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
          profile = {
            uid: fbUser.uid,
            name: data.name || fbUser.displayName || (isAdminUser ? 'Admin Peter (System Manager)' : 'Resident'),
            village: data.village || 'Green Valley River Basin',
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
        // Authenticate with Firebase anonymously to secure Firestore write credentials
        const cred = await signInAnonymously(this.auth);
        uid = cred.user.uid;
        if (trimmedName) {
          try {
            await updateProfile(cred.user, { displayName: trimmedName });
          } catch {
            // Ignore
          }
        }
      }

      const profile: UserProfile = {
        uid,
        name: trimmedName,
        village: trimmedVillage,
        authProvider: 'name_village',
        hasPassword: Boolean(password && password.trim().length > 0),
        role: 'resident',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore
      if (this.db) {
        try {
          await setDoc(doc(this.db, 'users', uid), profile);
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

    const updatedProfile: UserProfile = {
      ...current,
      ...updates,
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
              village: data.village,
              userId: data.userId,
              status: data.status || 'active',
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
    const alertWithUser = {
      ...alert,
      village: alert.village || user?.village || 'General Sector',
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

  public async clearAlerts(): Promise<void> {
    this.saveLocalAlerts([]);
    this.notifyAlerts([]);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'CLEAR_ALERTS' });
    }
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
    return [];
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

  public subscribeAuth(cb: (state: AuthState) => void): () => void {
    this.authListeners.add(cb);
    cb(this.currentAuthState);
    return () => this.authListeners.delete(cb);
  }

  private notifyAlerts(alerts: FloodAlert[]) {
    this.alertListeners.forEach((cb) => cb(alerts));
  }

  public getAuthState(): AuthState {
    return this.currentAuthState;
  }

  public getIsFirebaseConnected(): boolean {
    return this.isFirebaseActive && this.db !== null;
  }
}

export const firebaseFloodService = new FirebaseFloodService();
