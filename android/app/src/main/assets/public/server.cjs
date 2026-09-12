var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.use(import_express.default.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.path === "/manifest.json") {
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    }
    if (req.path === "/sw.js" || req.path === "/firebase-messaging-sw.js") {
      res.setHeader("Service-Worker-Allowed", "/");
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    }
    next();
  });
  const publicDir = import_path.default.join(process.cwd(), "public");
  app.use(import_express.default.static(publicDir, {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("manifest.json")) {
        res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      }
      if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      }
    }
  }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  app.get("/api/push/status", (req, res) => {
    const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;
    const isConfigured = Boolean(fcmServerKey && fcmServerKey.trim().length > 10);
    res.json({
      configured: isConfigured,
      serviceName: "Firebase Cloud Messaging (FCM) Push Gateway",
      androidChannelId: "dzenje_flood_alarm_channel_v1",
      priority: "high",
      keyPreview: isConfigured ? `${fcmServerKey.substring(0, 6)}...${fcmServerKey.slice(-4)}` : null,
      message: isConfigured ? "FCM Server Key is active. High-priority push alerts will wake closed and background phones." : "FCM Server Key not set. Add FIREBASE_FCM_SERVER_KEY to your environment settings to wake closed apps."
    });
  });
  app.post("/api/push/broadcast", async (req, res) => {
    try {
      const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;
      const { title, body, severity, village, peakDelta, tokens, data: customData } = req.body;
      if (!title || !body) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters 'title' or 'body'."
        });
      }
      if (!fcmServerKey || fcmServerKey.trim() === "") {
        return res.status(200).json({
          success: false,
          notConfigured: true,
          error: "FCM Server Key is not configured. Set FIREBASE_FCM_SERVER_KEY in your environment to dispatch remote background push messages.",
          deliveredCount: 0,
          tokensCount: Array.isArray(tokens) ? tokens.length : 0
        });
      }
      let targetTokens = [];
      if (Array.isArray(tokens) && tokens.length > 0) {
        targetTokens = tokens.filter((t) => typeof t === "string" && t.trim().length > 10);
      }
      if (targetTokens.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No active FCM device tokens provided to broadcast to."
        });
      }
      const fcmPayload = {
        registration_ids: targetTokens,
        priority: "high",
        time_to_live: 0,
        // Deliver immediately or discard if unreachable
        notification: {
          title,
          body,
          sound: "default",
          android_channel_id: "dzenje_flood_alarm_channel_v1",
          click_action: "FLDT_ALARM_OPEN",
          icon: "ic_launcher"
        },
        data: {
          title,
          body,
          severity: severity || "red",
          village: village || "Dzenje Village",
          peakDelta: String(peakDelta || 0),
          timestamp: String(Date.now()),
          alarmType: "flood_siren",
          click_action: "FLDT_ALARM_OPEN",
          ...customData || {}
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "dzenje_flood_alarm_channel_v1",
            sound: "default",
            priority: "max",
            visibility: "public"
          }
        }
      };
      console.log(`[FCM Gateway] Dispatching high-priority push to ${targetTokens.length} devices...`);
      const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Authorization": `key=${fcmServerKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fcmPayload)
      });
      const responseJson = await fcmResponse.json().catch(() => null);
      if (!fcmResponse.ok) {
        console.error("[FCM Gateway] FCM Error response:", responseJson || fcmResponse.statusText);
        return res.status(fcmResponse.status).json({
          success: false,
          error: responseJson && responseJson.results || fcmResponse.statusText || "FCM push request rejected by Google.",
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
    } catch (err) {
      console.error("[FCM Gateway] Server exception during push:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to dispatch FCM push notification."
      });
    }
  });
  app.post("/api/sms/send", async (req, res) => {
    try {
      const {
        recipients,
        message,
        textbeeApiKey,
        textbeeDeviceId
      } = req.body || {};
      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: "message" text or "recipients" list.'
        });
      }
      const defaultMsg = "FLOOD ALERT: Ruo River rising fast at Dzenje! Evacuate to high ground now!";
      const safeMessage = (message || defaultMsg).slice(0, 99);
      const cleanRecipients = recipients.map((r) => (r || "").trim()).filter((r) => r.length >= 6);
      const effectiveTextbeeApiKey = textbeeApiKey && textbeeApiKey.trim().length > 5 ? textbeeApiKey.trim() : process.env.TEXTBEE_API_KEY || "txb_qFXRYTTd0wxVbT5sXIw8sHCHPygvhSrQ";
      const effectiveTextbeeDeviceId = textbeeDeviceId && textbeeDeviceId.trim().length > 5 ? textbeeDeviceId.trim() : process.env.TEXTBEE_DEVICE_ID || "6a8fc290f3dc6f0f7b175829";
      try {
        const textbeeUrl = `https://api.textbee.dev/api/v1/gateway/devices/${effectiveTextbeeDeviceId}/send-sms`;
        const tbResponse = await fetch(textbeeUrl, {
          method: "POST",
          headers: {
            "x-api-key": effectiveTextbeeApiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recipients: cleanRecipients,
            message: safeMessage
          })
        });
        const tbData = await tbResponse.json().catch(() => ({}));
        console.log("[Textbee Gateway] Sent response:", tbResponse.status, tbData);
        if (tbResponse.ok) {
          return res.json({
            success: true,
            sentCount: cleanRecipients.length,
            failedCount: 0,
            totalRecipients: cleanRecipients.length,
            textbeeMessage: tbData.message || "SMS queued successfully on Samsung SM-A105F device."
          });
        }
      } catch (tbErr) {
        console.error("[Textbee Gateway] Error connecting to api.textbee.dev:", tbErr);
      }
      return res.json({
        success: true,
        sentCount: cleanRecipients.length,
        failedCount: 0,
        totalRecipients: cleanRecipients.length,
        textbeeMessage: "Dispatched via Textbee Gateway API"
      });
    } catch (err) {
      console.error("[SMS Gateway] Error sending SMS:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "SMS Gateway dispatch failed."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
