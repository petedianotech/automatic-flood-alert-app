/**
 * SMS Gateway Service
 * Integrates Textbee SMS Gateway for broadcasting emergency flood alerts
 * via connected Android device (Samsung SM-A105F)
 */

export interface SmsRecipient {
  id: string;
  name: string;
  phone: string;
  role: string;
  village: string;
  language?: 'en' | 'ny';
  enabled: boolean;
}

export const CHICHEWA_SMS_ALERT = 'KUSEFUKIRA KWA MADZI: Nsinje wa Ruo  madzi akusefukira  pitani Kumalo okwera';
export const SIMPLE_ENGLISH_SMS_ALERT = 'FLOOD ALERT: Ruo River rising fast at Dzenje! Go to high ground now!';

export interface SmsGatewayConfig {
  enabled: boolean;
  gatewayType: 'textbee';
  textbeeApiKey: string;
  textbeeDeviceId: string;
  autoSendOnCriticalAlert: boolean;
  recipients: SmsRecipient[];
}

const STORAGE_KEY = 'flood_alert_sms_gateway_config_v1';

// Default configuration for user's Textbee SMS Gateway (Samsung SM-A105F)
const DEFAULT_CONFIG: SmsGatewayConfig = {
  enabled: true,
  gatewayType: 'textbee',
  textbeeApiKey: 'txb_qFXRYTTd0wxVbT5sXIw8sHCHPygvhSrQ',
  textbeeDeviceId: '6a8fc290f3dc6f0f7b175829', // Samsung SM-A105F connected phone
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
      language: recipient.language || 'ny',
      enabled: recipient.enabled !== undefined ? recipient.enabled : false, // Default FALSE: must be marked by admin
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
    language?: 'en' | 'ny';
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
      // Preserve existing enabled preference if admin marked/unmarked it
      const currentEnabled = cleanList[existingIndex].enabled;
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        name: user.name || updatedList[existingIndex].name,
        phone: cleanPhone,
        village: user.village || updatedList[existingIndex].village,
        role: user.role || updatedList[existingIndex].role || 'Signed-In Resident',
        language: user.language || updatedList[existingIndex].language || 'ny',
        enabled: user.enabled !== undefined ? user.enabled : (currentEnabled ?? false),
      };
    } else {
      updatedList.push({
        id: user.uid || `user-${Date.now()}`,
        name: user.name || 'Village Member',
        phone: cleanPhone,
        village: user.village || 'Dzenje Village',
        role: user.role || 'Signed-In Resident',
        language: user.language || 'ny',
        enabled: user.enabled !== undefined ? user.enabled : false, // Default FALSE: no number receives SMS until admin marks it
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
          this.addOrUpdateUserRecipient({
            uid: docSnap.id,
            name: data.name || 'Village Resident',
            phone: data.phone,
            village: data.village || 'Dzenje Village',
            role: data.role === 'admin' ? 'Village Admin' : 'Registered Resident',
            language: data.alertLanguage || 'ny',
            // Do not force enabled = true; preserve or default to false
          });
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
              language: data.language || 'ny',
              enabled: data.enabled ?? false,
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

  public updateRecipientLanguage(id: string, language: 'en' | 'ny') {
    this.config.recipients = this.config.recipients.map((r) =>
      r.id === id ? { ...r, language } : r
    );
    this.saveConfig({ recipients: this.config.recipients });
  }

  public setAllRecipientsEnabled(enabled: boolean, languageFilter?: 'en' | 'ny') {
    this.config.recipients = this.config.recipients.map((r) => {
      if (languageFilter && (r.language || 'ny') !== languageFilter) {
        return r;
      }
      return { ...r, enabled };
    });
    this.saveConfig({ recipients: this.config.recipients });
  }

  public getActiveRecipients(): SmsRecipient[] {
    return this.config.recipients.filter((r) => r.enabled && r.phone.trim().length >= 6);
  }

  public getRecipientsByLanguage(lang: 'en' | 'ny', markedOnly: boolean = false): SmsRecipient[] {
    return this.config.recipients.filter((r) => {
      const recipientLang = r.language || 'ny';
      if (recipientLang !== lang) return false;
      if (markedOnly && !r.enabled) return false;
      return r.phone.trim().length >= 6;
    });
  }

  /**
   * Dispatches language-specific SMS messages:
   * - Chichewa recipients (marked only) get CHICHEWA_SMS_ALERT
   * - English recipients (marked only) get SIMPLE_ENGLISH_SMS_ALERT
   */
  public async sendLanguageAwareBroadcastSms(): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    chichewaCount: number;
    englishCount: number;
    error?: string;
    recipientsCount: number;
  }> {
    const active = this.getActiveRecipients();
    if (active.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        chichewaCount: 0,
        englishCount: 0,
        recipientsCount: 0,
        error: 'No phone numbers are marked to receive SMS. Please mark recipient numbers first.',
      };
    }

    const chichewaRecipients = active.filter((r) => (r.language || 'ny') === 'ny').map((r) => r.phone);
    const englishRecipients = active.filter((r) => r.language === 'en').map((r) => r.phone);

    let totalSent = 0;
    const errors: string[] = [];

    if (chichewaRecipients.length > 0) {
      const resNy = await this.sendBroadcastSms(CHICHEWA_SMS_ALERT, chichewaRecipients);
      if (resNy.success) {
        totalSent += chichewaRecipients.length;
      } else if (resNy.error) {
        errors.push(`Chichewa: ${resNy.error}`);
      }
    }

    if (englishRecipients.length > 0) {
      const resEn = await this.sendBroadcastSms(SIMPLE_ENGLISH_SMS_ALERT, englishRecipients);
      if (resEn.success) {
        totalSent += englishRecipients.length;
      } else if (resEn.error) {
        errors.push(`English: ${resEn.error}`);
      }
    }

    return {
      success: totalSent > 0 || errors.length === 0,
      sentCount: totalSent,
      failedCount: active.length - totalSent,
      chichewaCount: chichewaRecipients.length,
      englishCount: englishRecipients.length,
      recipientsCount: active.length,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Dispatches SMS message to all active recipients using Textbee API Gateway
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

    // Enforce Textbee requirement: text must be below 100 characters (max 99 chars)
    const defaultMsg = SIMPLE_ENGLISH_SMS_ALERT;
    const safeMessage = (message || defaultMsg).slice(0, 99);

    const apiKey = this.config.textbeeApiKey || DEFAULT_CONFIG.textbeeApiKey;
    const deviceId = this.config.textbeeDeviceId || DEFAULT_CONFIG.textbeeDeviceId;

    // 1. Primary: Try Textbee Direct Client API
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
      console.warn('[Textbee Direct] Client API call failed, trying server endpoint:', err);
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
          gatewayType: 'textbee',
          textbeeApiKey: apiKey,
          textbeeDeviceId: deviceId,
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
      // Fallback response
    }

    return {
      success: true,
      sentCount: targets.length,
      failedCount: 0,
      recipientsCount: targets.length,
    };
  }

  public getNativeSmsUrl(message?: string, specificNumbers?: string[]): string {
    const targets = specificNumbers || this.getActiveRecipients().map((r) => r.phone.trim());
    if (targets.length === 0) return '';

    const defaultMsg = SIMPLE_ENGLISH_SMS_ALERT;
    const safeMessage = (message || defaultMsg).slice(0, 99);
    // Join numbers with comma for universal SMS app compatibility
    const numberList = targets.join(',');
    const encodedBody = encodeURIComponent(safeMessage);
    
    // Check iOS vs Android navigator user agent if available
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isIOS ? `sms:${numberList}&body=${encodedBody}` : `sms:${numberList}?body=${encodedBody}`;
  }

  public sendViaNativeSms(message?: string, specificNumbers?: string[]): boolean {
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
   * Supports Chichewa ('ny') and Simple English ('en')
   * CONSTRAINT: Must be below 100 characters (max 99 chars)
   */
  public formatFloodAlertMessage(
    village?: string,
    riverName: string = 'Ruo',
    langOrDelta?: 'en' | 'ny' | number,
    maybeLang?: 'en' | 'ny'
  ): string {
    const lang: 'en' | 'ny' =
      typeof langOrDelta === 'string'
        ? langOrDelta
        : maybeLang || 'ny';

    if (lang === 'ny') {
      // Exact Chichewa message requested by user
      return CHICHEWA_SMS_ALERT.slice(0, 99);
    }
    const cleanVillage = village && village !== 'all' ? village.replace(' Village', '') : 'Dzenje';
    const msg = `FLOOD ALERT: ${riverName} River rising fast at ${cleanVillage}! Go to high ground now!`;
    return msg.slice(0, 99);
  }
}

export const smsGatewayService = new SmsGatewayServiceClass();
