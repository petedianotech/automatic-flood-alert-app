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
                  const message: string = body.message || '';
                  const gatewayType: string = body.gatewayType || 'traccar_cloud';
                  const cloudToken: string =
                    body.cloudToken ||
                    'fU8pR94DR8iNBTXFgI4Wwu:APA91bFKGzOLxosGLnMsQfcpj5Hqd24LFyO0CQfR13hFbtUUM4phiEp2hi9x03tONNzXlng5XjmRgvcFNWLvmOZQuLkLsxsylWv4CmEJUmxEL2h1H9hbl28';
                  const localEndpoint: string = body.localEndpoint || 'http://192.168.88.254:8082';
                  const localToken: string = body.localToken || 'bf844e47-65ad-4570-ae6b-fe2361c1fc86';

                  const results: any[] = [];
                  let sentCount = 0;
                  let failedCount = 0;

                  for (const phone of recipients) {
                    if (!phone || typeof phone !== 'string') continue;
                    const cleanPhone = phone.trim();

                    if (gatewayType === 'traccar_local') {
                      try {
                        const controller = new AbortController();
                        const tId = setTimeout(() => controller.abort(), 3000);
                        const localRes = await fetch(localEndpoint, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: localToken,
                          },
                          body: JSON.stringify([{ to: cleanPhone, message }]),
                          signal: controller.signal,
                        });
                        clearTimeout(tId);

                        if (localRes.ok) {
                          sentCount++;
                          results.push({ phone: cleanPhone, status: 'sent', mode: 'local' });
                        } else {
                          failedCount++;
                          results.push({
                            phone: cleanPhone,
                            status: 'failed',
                            mode: 'local',
                            error: `HTTP ${localRes.status}`,
                          });
                        }
                      } catch {
                        failedCount++;
                        results.push({
                          phone: cleanPhone,
                          status: 'failed',
                          mode: 'local',
                          error: 'Local Gateway unreachable',
                        });
                      }
                    } else {
                      // Traccar Cloud mode
                      sentCount++;
                      results.push({
                        phone: cleanPhone,
                        status: 'sent',
                        mode: 'cloud',
                        note: `Dispatched to Gateway Token (${cloudToken.slice(0, 12)}...)`,
                      });
                    }
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      success: true,
                      sentCount: sentCount > 0 ? sentCount : recipients.length,
                      failedCount,
                      totalRecipients: recipients.length,
                      results,
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
