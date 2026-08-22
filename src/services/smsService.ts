/**
 * Africa's Talking SMS Emergency Broadcast Service
 * Connects the app to Africa's Talking SMS Gateway via the secure backend API.
 */

import { FloodAlert } from '../types';

export interface SmsStatus {
  configured: boolean;
  isSandbox: boolean;
  username: string | null;
  senderId: string | null;
  serviceName: string;
}

export interface SmsSendResult {
  success: boolean;
  error?: string;
  recipientsCount?: number;
  recipients?: string[];
  data?: any;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  role: string; // e.g. "Village Head", "Rescue Warden", "CDSS STEM Club", "Clinic", "Family"
  village?: string;
}

const STORAGE_KEY_EMERGENCY_CONTACTS = 'flood_emergency_sms_contacts';

export class SmsService {
  private static cachedStatus: SmsStatus | null = null;
  private static statusListeners: Set<(status: SmsStatus) => void> = new Set();

  /**
   * Default community emergency contact list for Dzenje Village
   */
  public static getDefaultContacts(): EmergencyContact[] {
    return [
      {
        id: 'contact-stem-lead',
        name: 'Dzenje CDSS STEM Station',
        phone: '+265991234567',
        role: 'Station Admin',
        village: 'Dzenje Village',
      },
      {
        id: 'contact-village-chief',
        name: 'Dzenje Village Leader',
        phone: '+265881234567',
        role: 'Village Chief',
        village: 'Dzenje Village',
      },
      {
        id: 'contact-red-cross',
        name: 'Community Rescue Team',
        phone: '+265999888777',
        role: 'Rescue Warden',
        village: 'Dzenje Village',
      },
    ];
  }

  /**
   * Get saved emergency SMS contacts from localStorage
   */
  public static getContacts(): EmergencyContact[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EMERGENCY_CONTACTS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return this.getDefaultContacts();
  }

  /**
   * Save emergency contacts list
   */
  public static saveContacts(contacts: EmergencyContact[]) {
    try {
      localStorage.setItem(STORAGE_KEY_EMERGENCY_CONTACTS, JSON.stringify(contacts));
    } catch {
      // ignore
    }
  }

  /**
   * Add a new emergency contact
   */
  public static addContact(contact: Omit<EmergencyContact, 'id'>): EmergencyContact {
    const contacts = this.getContacts();
    const newContact: EmergencyContact = {
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    contacts.push(newContact);
    this.saveContacts(contacts);
    return newContact;
  }

  /**
   * Delete an emergency contact
   */
  public static deleteContact(id: string) {
    const contacts = this.getContacts().filter((c) => c.id !== id);
    this.saveContacts(contacts);
  }

  /**
   * Check Africa's Talking API connection status
   */
  public static async checkStatus(): Promise<SmsStatus> {
    try {
      const res = await fetch('/api/sms/status');
      if (res.ok) {
        const status = await res.json();
        this.cachedStatus = status;
        this.statusListeners.forEach((cb) => cb(status));
        return status;
      }
    } catch (err) {
      console.warn("[SmsService] Failed to check status:", err);
    }
    const fallback: SmsStatus = {
      configured: false,
      isSandbox: false,
      username: null,
      senderId: null,
      serviceName: "Africa's Talking SMS Gateway",
    };
    this.cachedStatus = fallback;
    return fallback;
  }

  public static getCachedStatus(): SmsStatus | null {
    return this.cachedStatus;
  }

  public static subscribeStatus(cb: (status: SmsStatus) => void): () => void {
    this.statusListeners.add(cb);
    if (this.cachedStatus) {
      cb(this.cachedStatus);
    } else {
      this.checkStatus();
    }
    return () => this.statusListeners.delete(cb);
  }

  /**
   * Send SMS via Africa's Talking Backend API
   */
  public static async sendSms(
    to: string | string[],
    message: string,
    from?: string
  ): Promise<SmsSendResult> {
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, message, from }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || `SMS sending failed with status ${res.status}`,
        };
      }

      return {
        success: true,
        recipientsCount: data.recipientsCount,
        recipients: data.recipients,
        data: data.data,
      };
    } catch (err: any) {
      console.error("[SmsService] Error calling /api/sms/send:", err);
      return {
        success: false,
        error: err.message || 'Could not connect to SMS server.',
      };
    }
  }

  /**
   * Broadcast Instant Emergency Flood Alert via SMS to all saved contacts
   */
  public static async broadcastFloodAlert(
    alert: Partial<FloodAlert>,
    customMessage?: string
  ): Promise<SmsSendResult> {
    const contacts = this.getContacts();
    const phoneNumbers = contacts.map((c) => c.phone).filter((p) => p && p.trim() !== '');

    if (phoneNumbers.length === 0) {
      return {
        success: false,
        error: 'No phone numbers registered in the Emergency Contact list.',
      };
    }

    const village = alert.village || alert.location?.village || 'Dzenje Village';
    const river = alert.riverName || alert.location?.riverName || 'Dzenje / Ruo River';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Bilingual message: Chichewa & English (easily understandable by local people)
    const defaultMsg = `🚨 CHENJEZO LA CHIGUMULA / FLOOD WARNING (${time})! Madzi a m'tsinje wa ${river} akukwera mofulumira ku ${village}. Samukani msanga ku malo okwera! River water rising rapidly. Move to high ground now! - Dzenje STEM Alert`;

    const finalMsg = customMessage && customMessage.trim() !== '' ? customMessage : defaultMsg;

    return this.sendSms(phoneNumbers, finalMsg);
  }
}
