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

  // Helper to format phone number to E.164
  function formatPhoneNumber(num: string): string {
    let cleaned = num.trim().replace(/[\s\-()]/g, '');
    if (!cleaned) return '';
    
    // Malawi local numbers starting with 088, 099, 01, 02, etc. -> +265...
    if (cleaned.startsWith('0') && cleaned.length >= 10) {
      cleaned = '+265' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      // If starts with 265... without +
      if (cleaned.startsWith('265')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 2. Africa's Talking Status Check
  app.get('/api/sms/status', (req, res) => {
    const apiKey = process.env.AFRICAS_TALKING_API_KEY;
    const username = process.env.AFRICAS_TALKING_USERNAME;
    const senderId = process.env.AFRICAS_TALKING_SENDER_ID;

    const isConfigured = Boolean(apiKey && username && apiKey.trim() !== '' && username.trim() !== '');
    const isSandbox = (username || '').toLowerCase() === 'sandbox';

    res.json({
      configured: isConfigured,
      isSandbox,
      username: username ? `${username.substring(0, 3)}***` : null,
      senderId: senderId || null,
      serviceName: "Africa's Talking SMS Gateway"
    });
  });

  // 3. Send SMS via Africa's Talking
  app.post('/api/sms/send', async (req, res) => {
    try {
      const apiKey = process.env.AFRICAS_TALKING_API_KEY;
      const username = process.env.AFRICAS_TALKING_USERNAME;
      const defaultSenderId = process.env.AFRICAS_TALKING_SENDER_ID;

      if (!apiKey || !username) {
        return res.status(400).json({
          success: false,
          error: "Africa's Talking credentials missing. Please set AFRICAS_TALKING_API_KEY and AFRICAS_TALKING_USERNAME in your environment settings."
        });
      }

      const { to, message, from } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters 'to' (phone numbers) or 'message'."
        });
      }

      // Parse recipients
      let rawRecipients: string[] = [];
      if (Array.isArray(to)) {
        rawRecipients = to;
      } else if (typeof to === 'string') {
        rawRecipients = to.split(',').map((s) => s.trim());
      }

      const formattedRecipients = rawRecipients
        .map(formatPhoneNumber)
        .filter((n) => n.length > 5);

      if (formattedRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid phone numbers provided. Please provide numbers in international format (e.g., +265991234567 or 0991234567)."
        });
      }

      const isSandbox = username.toLowerCase() === 'sandbox';
      const endpoint = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const params = new URLSearchParams();
      params.append('username', username);
      params.append('to', formattedRecipients.join(','));
      params.append('message', message);

      const senderId = from || defaultSenderId;
      if (senderId && senderId.trim() !== '') {
        params.append('from', senderId.trim());
      }

      console.log(`[Africa's Talking] Sending SMS to ${formattedRecipients.length} recipients via ${isSandbox ? 'Sandbox' : 'Production'}...`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apiKey': apiKey.trim(),
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("[Africa's Talking] Error response:", data || response.statusText);
        return res.status(response.status).json({
          success: false,
          error: (data && data.errorMessage) || (data && data.Message) || `Africa's Talking API error (${response.status})`,
          details: data
        });
      }

      console.log("[Africa's Talking] Success response:", JSON.stringify(data));

      return res.json({
        success: true,
        data,
        recipientsCount: formattedRecipients.length,
        recipients: formattedRecipients
      });
    } catch (err: any) {
      console.error("[Africa's Talking] Server exception:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to communicate with Africa's Talking API."
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
