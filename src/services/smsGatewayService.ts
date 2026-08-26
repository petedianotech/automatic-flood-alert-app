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
  gatewayType: 'traccar_cloud' | 'traccar_local';
  cloudToken: string;
  localEndpoint: string;
  localToken: string;
  autoSendOnCriticalAlert: boolean;
  recipients: SmsRecipient[];
}

const STORAGE_KEY = 'flood_alert_sms_gateway_config_v1';

// Default configuration with preloaded tokens from user's Traccar SMS Gateway setup
const DEFAULT_CONFIG: SmsGatewayConfig = {
  enabled: true,
  gatewayType: 'traccar_cloud',
  cloudToken: 'fU8pR94DR8iNBTXFgI4Wwu:APA91bFKGzOLxosGLnMsQfcpj5Hqd24LFyO0CQfR13hFbtUUM4phiEp2hi9x03tONNzXlng5XjmRgvcFNWLvmOZQuLkLsxsylWv4CmEJUmxEL2h1H9hbl28',
  localEndpoint: 'http://192.168.88.254:8082',
  localToken: 'bf844e47-65ad-4570-ae6b-fe2361c1fc86',
  autoSendOnCriticalAlert: true,
  recipients: [
    {
      id: 'rec-1',
      name: 'Village Headman Dzenje',
      phone: '+265999000111',
      role: 'Village Chief',
      village: 'Dzenje Village',
      enabled: true,
    },
    {
      id: 'rec-2',
      name: 'Dzenje CDSS Head Teacher',
      phone: '+265888000222',
      role: 'School Safety Coordinator',
      village: 'Dzenje Village',
      enabled: true,
    },
    {
      id: 'rec-3',
      name: 'Mulanje Disaster Committee (CPDC)',
      phone: '+265991000333',
      role: 'District Disaster Officer',
      village: 'Mulanje District',
      enabled: true,
    },
    {
      id: 'rec-4',
      name: 'Machokola Evacuation Team',
      phone: '+265882000444',
      role: 'Rescue Lead',
      village: 'Machokola',
      enabled: true,
    },
  ],
};

class SmsGatewayServiceClass {
  private config: SmsGatewayConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): SmsGatewayConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          recipients: parsed.recipients && parsed.recipients.length > 0 ? parsed.recipients : DEFAULT_CONFIG.recipients,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  }

  public getConfig(): SmsGatewayConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<SmsGatewayConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // ignore
    }
  }

  public addRecipient(recipient: Omit<SmsRecipient, 'id'>) {
    const newRec: SmsRecipient = {
      ...recipient,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.config.recipients = [...this.config.recipients, newRec];
    this.saveConfig({ recipients: this.config.recipients });
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
    const existingIndex = this.config.recipients.findIndex(
      (r) => r.phone.trim() === cleanPhone || (user.uid && r.id === user.uid)
    );

    const updatedList = [...this.config.recipients];

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
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnapshot = await getDocs(collection(db, 'users'));
      querySnapshot.forEach((docSnap) => {
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
      console.log(`[SMS Gateway] Synced contacts from Firestore. Total recipients: ${this.config.recipients.length}`);
    } catch (err) {
      console.warn('[SMS Gateway] Firestore contacts sync error:', err);
    }
  }

  public removeRecipient(id: string) {
    this.config.recipients = this.config.recipients.filter((r) => r.id !== id);
    this.saveConfig({ recipients: this.config.recipients });
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
   * Dispatches SMS message to all active recipients using the configured Traccar SMS Gateway
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

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: targets,
          message: message,
          gatewayType: this.config.gatewayType,
          cloudToken: this.config.cloudToken || DEFAULT_CONFIG.cloudToken,
          localEndpoint: this.config.localEndpoint || DEFAULT_CONFIG.localEndpoint,
          localToken: this.config.localToken || DEFAULT_CONFIG.localToken,
        }),
      });

      const responseText = await response.text();
      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        // Handle non-JSON response gracefully (e.g. 404 or server HTML error)
        return {
          success: false,
          sentCount: 0,
          failedCount: targets.length,
          recipientsCount: targets.length,
          error: `Gateway API Server Response (Status ${response.status}): ${responseText.replace(/<[^>]*>?/gm, '').slice(0, 120)}`,
        };
      }

      return {
        success: data.success ?? false,
        sentCount: data.sentCount ?? 0,
        failedCount: data.failedCount ?? 0,
        recipientsCount: targets.length,
        error: data.error,
      };
    } catch (err: any) {
      return {
        success: false,
        sentCount: 0,
        failedCount: targets.length,
        recipientsCount: targets.length,
        error: err?.message || 'Network connection to SMS gateway endpoint failed.',
      };
    }
  }

  /**
   * Helper to format flood warning text for local SMS
   */
  public formatFloodAlertMessage(village: string, riverName: string = 'Ruo River', peakDelta: number = 2.4): string {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `[FLOOD ALERT ${timeStr}] Dzenje CDSS Sensor detected rapid rise in ${riverName} (${village}). Evacuate to higher ground immediately!`;
  }
}

export const smsGatewayService = new SmsGatewayServiceClass();
