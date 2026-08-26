/**
 * Firebase Cloud Messaging (FCM) Push Gateway Service
 * 
 * Provides:
 * - Direct background & closed-app push notification broadcasting
 * - Integration with Firestore `/fcm_tokens` collection
 * - Server key status verification via `/api/push/status`
 * - Automatic trigger when flood alarms or emergency broadcasts are generated
 */

import { collection, getDocs } from 'firebase/firestore';
import { firebaseFloodService } from './firebaseService';

export interface FcmPushStatus {
  configured: boolean;
  serviceName: string;
  androidChannelId: string;
  priority: string;
  keyPreview?: string | null;
  message: string;
}

export interface FcmBroadcastResponse {
  success: boolean;
  notConfigured?: boolean;
  deliveredCount?: number;
  failureCount?: number;
  tokensCount?: number;
  error?: string;
}

export class FcmGatewayService {
  /**
   * Checks if the FCM Push Gateway Server Key is configured in environment
   */
  public static async checkStatus(): Promise<FcmPushStatus> {
    try {
      const res = await fetch('/api/push/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return {
      configured: false,
      serviceName: 'Firebase Cloud Messaging (FCM) Push Gateway',
      androidChannelId: 'dzenje_flood_alarm_channel_v1',
      priority: 'high',
      message: 'Unable to connect to server gateway status.',
    };
  }

  /**
   * Retrieves all registered device push tokens from Firestore `/fcm_tokens`
   */
  public static async getAllRegisteredTokens(): Promise<string[]> {
    const tokens: string[] = [];

    // 1. Current user's cached token
    const localToken = localStorage.getItem('flood_alert_fcm_token');
    if (localToken && localToken.trim().length > 10) {
      tokens.push(localToken.trim());
    }

    // 2. Query tokens from Firestore
    try {
      const db = (firebaseFloodService as any).db;
      if (db) {
        const snap = await getDocs(collection(db, 'fcm_tokens'));
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.token && typeof data.token === 'string' && data.token.trim().length > 10) {
            tokens.push(data.token.trim());
          }
        });
      }
    } catch (err) {
      console.warn('[FCM Gateway] Error querying Firestore tokens:', err);
    }

    // Deduplicate
    return Array.from(new Set(tokens));
  }

  /**
   * Broadcasts a high-priority push notification to all registered village phones
   */
  public static async broadcastPushAlert(options: {
    title: string;
    body: string;
    severity?: 'red' | 'yellow';
    village?: string;
    peakDelta?: number;
    customData?: Record<string, any>;
  }): Promise<FcmBroadcastResponse> {
    try {
      const tokens = await this.getAllRegisteredTokens();

      if (tokens.length === 0) {
        return {
          success: false,
          tokensCount: 0,
          error: 'No registered device tokens found in village network.',
        };
      }

      console.log(`[FCM Gateway] Broadcasting push alert to ${tokens.length} devices...`);

      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: options.title,
          body: options.body,
          severity: options.severity || 'red',
          village: options.village || 'Dzenje Village',
          peakDelta: options.peakDelta || 0,
          tokens,
          data: options.customData || {},
        }),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('[FCM Gateway] Push broadcast error:', err);
      return {
        success: false,
        error: err.message || 'Failed to dispatch push broadcast.',
      };
    }
  }

  /**
   * Sends an instant test push to all village devices
   */
  public static async sendTestPushToAll(): Promise<FcmBroadcastResponse> {
    return this.broadcastPushAlert({
      title: '🚨 DZENJE CDSS: FLOOD ALARM TEST',
      body: 'Emergency Siren Test. Dzenje river water sensor is active and connected.',
      severity: 'yellow',
      village: 'Dzenje Village',
      peakDelta: 1.8,
      customData: {
        isTest: true,
      },
    });
  }
}
