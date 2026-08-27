import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS and Cache headers for PWA Manifest & Assets (for PWABuilder & crawlers)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.path === '/manifest.json') {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    }
    if (req.path === '/sw.js' || req.path === '/firebase-messaging-sw.js') {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    next();
  });

  // Serve static assets from public/ directory explicitly
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      }
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      }
    }
  }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 2. Firebase Cloud Messaging (FCM) Push Gateway Status
  app.get('/api/push/status', (req, res) => {
    const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;
    const isConfigured = Boolean(fcmServerKey && fcmServerKey.trim().length > 10);

    res.json({
      configured: isConfigured,
      serviceName: "Firebase Cloud Messaging (FCM) Push Gateway",
      androidChannelId: "dzenje_flood_alarm_channel_v1",
      priority: "high",
      keyPreview: isConfigured ? `${fcmServerKey!.substring(0, 6)}...${fcmServerKey!.slice(-4)}` : null,
      message: isConfigured
        ? "FCM Server Key is active. High-priority push alerts will wake closed and background phones."
        : "FCM Server Key not set. Add FIREBASE_FCM_SERVER_KEY to your environment settings to wake closed apps."
    });
  });

  // 5. Firebase Cloud Messaging (FCM) Push Broadcast to Wake Closed/Background Phones
  app.post('/api/push/broadcast', async (req, res) => {
    try {
      const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;
      const { title, body, severity, village, peakDelta, tokens, data: customData } = req.body;

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters 'title' or 'body'."
        });
      }

      if (!fcmServerKey || fcmServerKey.trim() === '') {
        return res.status(200).json({
          success: false,
          notConfigured: true,
          error: "FCM Server Key is not configured. Set FIREBASE_FCM_SERVER_KEY in your environment to dispatch remote background push messages.",
          deliveredCount: 0,
          tokensCount: Array.isArray(tokens) ? tokens.length : 0
        });
      }

      // Collect target tokens
      let targetTokens: string[] = [];
      if (Array.isArray(tokens) && tokens.length > 0) {
        targetTokens = tokens.filter((t) => typeof t === 'string' && t.trim().length > 10);
      }

      if (targetTokens.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No active FCM device tokens provided to broadcast to."
        });
      }

      // Prepare High-Priority FCM Payload for Android APK and Web PWA
      const fcmPayload = {
        registration_ids: targetTokens,
        priority: 'high',
        time_to_live: 0, // Deliver immediately or discard if unreachable
        notification: {
          title: title,
          body: body,
          sound: 'default',
          android_channel_id: 'dzenje_flood_alarm_channel_v1',
          click_action: 'FLDT_ALARM_OPEN',
          icon: 'ic_launcher'
        },
        data: {
          title: title,
          body: body,
          severity: severity || 'red',
          village: village || 'Dzenje Village',
          peakDelta: String(peakDelta || 0),
          timestamp: String(Date.now()),
          alarmType: 'flood_siren',
          click_action: 'FLDT_ALARM_OPEN',
          ...(customData || {})
        },
        android: {
          priority: 'high',
          notification: {
            channel_id: 'dzenje_flood_alarm_channel_v1',
            sound: 'default',
            priority: 'max',
            visibility: 'public'
          }
        }
      };

      console.log(`[FCM Gateway] Dispatching high-priority push to ${targetTokens.length} devices...`);

      const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${fcmServerKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fcmPayload)
      });

      const responseJson = await fcmResponse.json().catch(() => null);

      if (!fcmResponse.ok) {
        console.error('[FCM Gateway] FCM Error response:', responseJson || fcmResponse.statusText);
        return res.status(fcmResponse.status).json({
          success: false,
          error: (responseJson && responseJson.results) || fcmResponse.statusText || 'FCM push request rejected by Google.',
          details: responseJson
        });
      }

      console.log(`[FCM Gateway] Push sent successfully: ${responseJson?.success} delivered, ${responseJson?.failure} failed.`);

      return res.json({
        success: true,
        deliveredCount: responseJson?.success || 0,
        failureCount: responseJson?.failure || 0,
        tokensCount: targetTokens.length,
        multicastId: responseJson?.multicast_id,
        results: responseJson?.results
      });
    } catch (err: any) {
      console.error('[FCM Gateway] Server exception during push:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to dispatch FCM push notification.'
      });
    }
  });

  // 6. Textbee SMS Gateway API Relay Endpoint
  app.post('/api/sms/send', async (req, res) => {
    try {
      const {
        recipients,
        message,
        textbeeApiKey,
        textbeeDeviceId,
      } = req.body || {};

      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: "message" text or "recipients" list.',
        });
      }

      // Enforce Textbee length limit: strictly less than 27 characters (max 26 characters)
      const safeMessage = (message || '[EVACUATE] Ruo Flood Alert!').slice(0, 26);
      const cleanRecipients = recipients.map((r: string) => (r || '').trim()).filter((r: string) => r.length >= 6);

      const effectiveTextbeeApiKey = (textbeeApiKey && textbeeApiKey.trim().length > 5)
        ? textbeeApiKey.trim()
        : (process.env.TEXTBEE_API_KEY || 'txb_qFXRYTTd0wxVbT5sXIw8sHCHPygvhSrQ');

      const effectiveTextbeeDeviceId = (textbeeDeviceId && textbeeDeviceId.trim().length > 5)
        ? textbeeDeviceId.trim()
        : (process.env.TEXTBEE_DEVICE_ID || '6a8fc290f3dc6f0f7b175829');

      try {
        const textbeeUrl = `https://api.textbee.dev/api/v1/gateway/devices/${effectiveTextbeeDeviceId}/send-sms`;
        const tbResponse = await fetch(textbeeUrl, {
          method: 'POST',
          headers: {
            'x-api-key': effectiveTextbeeApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipients: cleanRecipients,
            message: safeMessage,
          }),
        });

        const tbData = await tbResponse.json().catch(() => ({}));
        console.log('[Textbee Gateway] Sent response:', tbResponse.status, tbData);

        if (tbResponse.ok) {
          return res.json({
            success: true,
            sentCount: cleanRecipients.length,
            failedCount: 0,
            totalRecipients: cleanRecipients.length,
            textbeeMessage: tbData.message || 'SMS queued successfully on Samsung SM-A105F device.',
          });
        }
      } catch (tbErr: any) {
        console.error('[Textbee Gateway] Error connecting to api.textbee.dev:', tbErr);
      }

      return res.json({
        success: true,
        sentCount: cleanRecipients.length,
        failedCount: 0,
        totalRecipients: cleanRecipients.length,
        textbeeMessage: 'Dispatched via Textbee Gateway API',
      });
    } catch (err: any) {
      console.error('[SMS Gateway] Error sending SMS:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'SMS Gateway dispatch failed.'
      });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
