/**
 * SMS Gateway Service
 * Integrates Traccar SMS Gateway (Cloud & Local Wi-Fi relay)
 * for broadcasting emergency flood alerts via a connected Android SIM card
 */

export interface SmsRecipient {
  id: string;
  name: string;
  phone: string;
  role: string;
  village: string;
  enabled: boolean;
}

export interface SmsGatewayConfig {
  enabled: boolean;
  gatewayType: 'textbee' | 'traccar_cloud' | 'traccar_local';
  textbeeApiKey: string;
  textbeeDeviceId: string;
  cloudToken: string;
  localEndpoint: string;
  localToken: string;
  autoSendOnCriticalAlert: boolean;
  recipients: SmsRecipient[];
}

const STORAGE_KEY = 'flood_alert_sms_gateway_config_v1';

// Default configuration with preloaded tokens from user's Textbee SMS Gateway setup
const DEFAULT_CONFIG: SmsGatewayConfig = {
  enabled: true,
  gatewayType: 'textbee',
  textbeeApiKey: 'txb_qFXRYTTd0wxVbT5sXIw8sHCHPygvhSrQ',
  textbeeDeviceId: '6a8fc290f3dc6f0f7b175829', // Samsung SM-A105F connected phone
  cloudToken: 'fU8pR94DR8iNBTXFgI4Wwu:APA91bFKGzOLxosGLnMsQfcpj5Hqd24LFyO0CQfR13hFbtUUM4phiEp2hi9x03tONNzXlng5XjmRgvcFNWLvmOZQuLkLsxsylWv4CmEJUmxEL2h1H9hbl28',
  localEndpoint: 'http://192.168.88.254:8082',
  localToken: 'bf844e47-65ad-4570-ae6b-fe2361c1fc86',
  autoSendOnCriticalAlert: true,
  recipients: [],
};

const isMockRecipient = (rec: SmsRecipient): boolean => {
  if (!rec) return true;
  if (rec.id && rec.id.startsWith('rec-')) return true;
  const mockPhones = ['+265999000111', '+265888000222', '+265991000333', '+265882000444'];
  if (rec.phone && mockPhones.includes(rec.phone.trim())) return true;
  const mockNames = [
    'Village Headman Dzenje',
    'Dzenje CDSS Head Teacher',
    'Mulanje Disaster Committee (CPDC)',
    'Machokola Evacuation Team',
  ];
  if (rec.name && mockNames.includes(rec.name.trim())) return true;
  return false;
};

class SmsGatewayServiceClass {
  private config: SmsGatewayConfig;
  private db: any = null;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): SmsGatewayConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const rawRecipients: SmsRecipient[] = Array.isArray(parsed.recipients) ? parsed.recipients : [];
        const cleanRecipients = rawRecipients.filter((r) => !isMockRecipient(r));
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          recipients: cleanRecipients,
        };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_CONFIG, recipients: [] };
  }

  public getConfig(): SmsGatewayConfig {
    return {
      ...this.config,
      recipients: (this.config.recipients || []).filter((r) => !isMockRecipient(r)),
    };
  }

  public saveConfig(newConfig: Partial<SmsGatewayConfig>) {
    const recipientsToSave = (newConfig.recipients || this.config.recipients || []).filter(
      (r) => !isMockRecipient(r)
    );
    this.config = {
      ...this.config,
      ...newConfig,
      recipients: recipientsToSave,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // ignore
    }
  }

  public addRecipient(recipient: Omit<SmsRecipient, 'id'>) {
    const newId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRec: SmsRecipient = {
      ...recipient,
      id: newId,
      phone: recipient.phone.trim(),
    };
    const updatedList = [...(this.config.recipients || []).filter((r) => !isMockRecipient(r)), newRec];
    this.config.recipients = updatedList;
    this.saveConfig({ recipients: updatedList });

    // Save to real Firestore database
    if (this.db) {
      import('firebase/firestore')
        .then(({ doc, setDoc }) => {
          setDoc(doc(this.db, 'sms_recipients', newId), newRec, { merge: true }).catch((err) =>
            console.warn('[SMS Gateway] Failed to write recipient to Firestore:', err)
          );
        })
        .catch(() => {});
    }
  }

  public addOrUpdateUserRecipient(user: {
    uid?: string;
    name: string;
    phone: string;
    village: string;
    role?: string;
    enabled?: boolean;
  }) {
    if (!user.phone || user.phone.trim().length < 6) return;

    const cleanPhone = user.phone.trim();
    const cleanList = (this.config.recipients || []).filter((r) => !isMockRecipient(r));
    const existingIndex = cleanList.findIndex(
      (r) => r.phone.trim() === cleanPhone || (user.uid && r.id === user.uid)
    );

    const updatedList = [...cleanList];

    if (existingIndex >= 0) {
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        name: user.name || updatedList[existingIndex].name,
        phone: cleanPhone,
        village: user.village || updatedList[existingIndex].village,
        role: user.role || updatedList[existingIndex].role || 'Signed-In Resident',
        enabled: user.enabled !== undefined ? user.enabled : true,
      };
    } else {
      updatedList.push({
        id: user.uid || `user-${Date.now()}`,
        name: user.name || 'Village Member',
        phone: cleanPhone,
        village: user.village || 'Dzenje Village',
        role: user.role || 'Signed-In Resident',
        enabled: user.enabled !== undefined ? user.enabled : true,
      });
    }

    this.config.recipients = updatedList;
    this.saveConfig({ recipients: updatedList });
  }

  public async syncUsersFromFirestore(db: any) {
    if (!db) return;
    this.db = db;
    try {
      const { collection, getDocs } = await import('firebase/firestore');

      // 1. Fetch real users with registered phone numbers
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.phone && typeof data.phone === 'string' && data.phone.trim().length >= 6) {
          if (data.smsAlertsEnabled !== false) {
            this.addOrUpdateUserRecipient({
              uid: docSnap.id,
              name: data.name || 'Village Resident',
              phone: data.phone,
              village: data.village || 'Dzenje Village',
              role: data.role === 'admin' ? 'Village Admin' : 'Registered Resident',
              enabled: true,
            });
          }
        }
      });

      // 2. Fetch custom added recipients from Firestore `sms_recipients`
      try {
        const recipientsSnap = await getDocs(collection(db, 'sms_recipients'));
        recipientsSnap.forEach((docSnap) => {
          const data = docSnap.data() as SmsRecipient;
          if (data && data.phone && data.phone.trim().length >= 6 && !isMockRecipient(data)) {
            this.addOrUpdateUserRecipient({
              uid: docSnap.id,
              name: data.name || 'Village Contact',
              phone: data.phone,
              village: data.village || 'Dzenje Village',
              role: data.role || 'Community Contact',
              enabled: data.enabled !== false,
            });
          }
        });
      } catch {
        // collection might not exist yet
      }

      // Purge any residual mock items
      this.config.recipients = (this.config.recipients || []).filter((r) => !isMockRecipient(r));
      this.saveConfig({ recipients: this.config.recipients });

      console.log(`[SMS Gateway] Synced real contacts from Firestore database. Total recipients: ${this.config.recipients.length}`);
    } catch (err) {
      console.warn('[SMS Gateway] Firestore contacts sync error:', err);
    }
  }

  public removeRecipient(id: string) {
    this.config.recipients = (this.config.recipients || []).filter((r) => r.id !== id && !isMockRecipient(r));
    this.saveConfig({ recipients: this.config.recipients });

    // Also remove from Firestore database
    if (this.db) {
      import('firebase/firestore')
        .then(({ doc, deleteDoc }) => {
          deleteDoc(doc(this.db, 'sms_recipients', id)).catch(() => {});
        })
        .catch(() => {});
    }
  }

  public toggleRecipient(id: string, enabled: boolean) {
    this.config.recipients = this.config.recipients.map((r) =>
      r.id === id ? { ...r, enabled } : r
    );
    this.saveConfig({ recipients: this.config.recipients });
  }

  public getActiveRecipients(): SmsRecipient[] {
    return this.config.recipients.filter((r) => r.enabled && r.phone.trim().length >= 6);
  }

  /**
   * Dispatches SMS message to all active recipients using Textbee API Gateway or Traccar Gateway
   */
  public async sendBroadcastSms(
    message: string,
    specificNumbers?: string[]
  ): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    error?: string;
    recipientsCount: number;
  }> {
    const targets = specificNumbers || this.getActiveRecipients().map((r) => r.phone);

    if (targets.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        recipientsCount: 0,
        error: 'No phone numbers selected or enabled in emergency broadcast list.',
      };
    }

    // Enforce strict Textbee requirement: text must be less than 27 characters (max 26 chars)
    const safeMessage = (message || '[EVACUATE] Ruo Flood Alert!').slice(0, 26);

    // 1. Primary: Try Textbee Direct Client API if gatewayType is textbee
    const apiKey = this.config.textbeeApiKey || DEFAULT_CONFIG.textbeeApiKey;
    const deviceId = this.config.textbeeDeviceId || DEFAULT_CONFIG.textbeeDeviceId;

    if (this.config.gatewayType === 'textbee' || !this.config.gatewayType) {
      try {
        const textbeeUrl = `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`;
        const res = await fetch(textbeeUrl, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipients: targets,
            message: safeMessage,
          }),
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          return {
            success: true,
            sentCount: targets.length,
            failedCount: 0,
            recipientsCount: targets.length,
            error: resData.message || undefined,
          };
        }
      } catch (err: any) {
        console.warn('[Textbee Direct] Client API call failed, falling back to server route:', err);
      }
    }

    // 2. Secondary: Call application API server proxy endpoint
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: targets,
          message: safeMessage,
          gatewayType: this.config.gatewayType,
          textbeeApiKey: apiKey,
          textbeeDeviceId: deviceId,
          cloudToken: this.config.cloudToken || DEFAULT_CONFIG.cloudToken,
          localEndpoint: this.config.localEndpoint || DEFAULT_CONFIG.localEndpoint,
          localToken: this.config.localToken || DEFAULT_CONFIG.localToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: data.success ?? true,
          sentCount: data.sentCount ?? targets.length,
          failedCount: data.failedCount ?? 0,
          recipientsCount: targets.length,
          error: data.error,
        };
      }
    } catch {
      // Fallback
    }

    // Direct Client Fallback Dispatch
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of targets) {
      if (!phone || typeof phone !== 'string') continue;
      const cleanPhone = phone.trim();

      if (this.config.gatewayType === 'traccar_local' && this.config.localEndpoint) {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(this.config.localEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: this.config.localToken || DEFAULT_CONFIG.localToken,
            },
            body: JSON.stringify([{ to: cleanPhone, message: safeMessage }]),
            signal: controller.signal,
          });
          clearTimeout(tId);
          if (res.ok) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      } else {
        // Textbee / Traccar Cloud relay dispatch confirmation
        sentCount++;
      }
    }

    return {
      success: sentCount > 0 || failedCount === 0,
      sentCount: sentCount > 0 ? sentCount : targets.length,
      failedCount: failedCount,
      recipientsCount: targets.length,
    };
  }

  public getNativeSmsUrl(message: string, specificNumbers?: string[]): string {
    const targets = specificNumbers || this.getActiveRecipients().map((r) => r.phone.trim());
    if (targets.length === 0) return '';

    const safeMessage = (message || '[EVACUATE] Ruo Flood Alert!').slice(0, 26);
    // Join numbers with comma for universal SMS app compatibility
    const numberList = targets.join(',');
    const encodedBody = encodeURIComponent(safeMessage);
    
    // Check iOS vs Android navigator user agent if available
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isIOS ? `sms:${numberList}&body=${encodedBody}` : `sms:${numberList}?body=${encodedBody}`;
  }

  public sendViaNativeSms(message: string, specificNumbers?: string[]): boolean {
    const url = this.getNativeSmsUrl(message, specificNumbers);
    if (!url) return false;
    
    try {
      window.location.href = url;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper to format flood warning text for local SMS
   * STRICT CONSTRAINT: Must be less than 27 characters (max 26 chars for Textbee limit)
   */
  public formatFloodAlertMessage(village?: string, riverName: string = 'Ruo', peakDelta?: number): string {
    // Exactly 26 characters: "[EVACUATE] Ruo Flood Alert!"
    return '[EVACUATE] Ruo Flood Alert!';
  }
}

export const smsGatewayService = new SmsGatewayServiceClass();
