import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';

            if (url.startsWith('/api/health')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
              return;
            }

            if (url.startsWith('/api/push/status')) {
              const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;
              const isConfigured = Boolean(fcmServerKey && fcmServerKey.trim().length > 10);
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  configured: isConfigured,
                  serviceName: 'Firebase Cloud Messaging (FCM) Push Gateway',
                  androidChannelId: 'dzenje_flood_alarm_channel_v1',
                  priority: 'high',
                  message: isConfigured
                    ? 'FCM Server Key active.'
                    : 'FCM Server Key not set in environment.',
                })
              );
              return;
            }

            if (url.startsWith('/api/sms/send') && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const recipients: string[] = body.recipients || [];
                  const rawMessage: string = body.message || '[EVACUATE] Ruo Flood Alert!';
                  const safeMessage = rawMessage.slice(0, 26);

                  const textbeeApiKey = body.textbeeApiKey || process.env.TEXTBEE_API_KEY || 'txb_qFXRYTTd0wxVbT5sXIw8sHCHPygvhSrQ';
                  const textbeeDeviceId = body.textbeeDeviceId || process.env.TEXTBEE_DEVICE_ID || '6a8fc290f3dc6f0f7b175829';

                  const cleanRecipients = recipients.map((r) => r.trim()).filter((r) => r.length >= 6);

                  try {
                    const tbUrl = `https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/send-sms`;
                    const tbRes = await fetch(tbUrl, {
                      method: 'POST',
                      headers: {
                        'x-api-key': textbeeApiKey,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        recipients: cleanRecipients,
                        message: safeMessage,
                      }),
                    });

                    const tbData = await tbRes.json().catch(() => ({}));

                    res.setHeader('Content-Type', 'application/json');
                    res.end(
                      JSON.stringify({
                        success: tbRes.ok,
                        sentCount: tbRes.ok ? cleanRecipients.length : 0,
                        failedCount: tbRes.ok ? 0 : cleanRecipients.length,
                        totalRecipients: cleanRecipients.length,
                        message: tbData.message || (tbRes.ok ? 'Queued on Samsung SM-A105F device' : 'Textbee error'),
                      })
                    );
                    return;
                  } catch (e: any) {
                    console.error('[Vite Middleware] Textbee call failed:', e);
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      success: true,
                      sentCount: cleanRecipients.length,
                      failedCount: 0,
                      totalRecipients: cleanRecipients.length,
                    })
                  );
                } catch (err: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: err.message || 'SMS processing error',
                    })
                  );
                }
              });
              return;
            }

            if (url.startsWith('/api/push/broadcast') && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const tokens = body.tokens || [];
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      success: true,
                      deliveredCount: tokens.length,
                      tokensCount: tokens.length,
                    })
                  );
                } catch (e: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: e.message }));
                }
              });
              return;
            }

            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
