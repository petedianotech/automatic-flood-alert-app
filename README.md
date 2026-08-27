# Automatic Flood Alert App

**A Community-Centric Disaster Risk Reduction & Early Warning Innovation**  
Developed by the **Dzenje CDSS ADDA STEM Club**  
Presented at **Malawi University of Science and Technology (MUST)**

---

## 👥 Project Team & Leadership

- **Club Leader / Lead Innovator:** Peter Damiano ([Web Portfolio](https://peterdamiano.vercel.app))
- **STEM Club Patron / Mentor:** Mr. H. Skinner
- **Head Teacher & Institutional Advisor:** Mr. Palapandu  
  > *"You'll never fail till you stop trying."* — Mr. Palapandu
- **STEM Club Members:** 30 student innovators of the Dzenje CDSS ADDA STEM Club
- **Community Focus:** Dzenje Village, Ruo River Basin & surrounding vulnerable flood-prone communities in Malawi

---

## 🎯 About the Innovation

Malawi faces recurring, devastating seasonal floods along river basins like the Ruo River. Traditional early warning methods often fail to reach rural households in time or rely on high-cost proprietary infrastructure that is difficult to maintain locally.

The **Automatic Flood Alert App** is a low-cost, multi-channel disaster alert platform built to protect lives, livestock, and property in local communities. The application connects real-time river monitoring, local sensor nodes, community networks, and emergency SMS broadcasts directly to local residents in both **Chichewa (🇲🇼)** and **Simple English (🇬🇧)**.

---

## 🌟 Key Features

1. **Dual Detection Modes (Hardware & Acoustic)**:
   - **Vibration & Motion Detection:** Connects with physical river floats and sensor nodes via accelerometer thresholds to detect sudden water flow surges and motor triggers.
   - **Acoustic / Bell Resonance Sensor:** Listens for loud emergency village bells or siren frequencies.

2. **Multi-Channel Warning Dispatches**:
   - **Direct GSM SMS Gateway:** Dispatches instant, concise flood warnings to marked village SIM cards (e.g. `KUSEFUKIRA KWA MADZI: Nsinje wa Ruo madzi akusefukira pitani Kumalo okwera`).
   - **Web Push Notifications (PWA):** Service worker notifications for smartphones and tablets even when the app is running in the background.
   - **Emergency Audio Sirens:** High-frequency, attention-grabbing alert tones on resident devices with safety dismiss controls.

3. **Community Safety & Voice SOS**:
   - **Village Safety Network:** Real-time headcount of safe residents, trapped individuals, and evacuation shelters.
   - **Direct Voice SOS:** One-tap audio recording for villagers who cannot read or write to record their status or request rescue.

4. **Bilingual Support (Chichewa & Simple English)**:
   - Designed with simple, clear language tailored for rural residents and local authorities.

5. **Material 3 Clean Mobile Design**:
   - High-contrast, single-view mobile interface designed for readability in bright sunlight and on entry-level smartphones.

---

## 📱 Technology Stack

- **Frontend & App Shell:** React 18, TypeScript, Tailwind CSS, Vite, Material 3 Design
- **Offline & Storage:** Progressive Web App (PWA) Service Worker, Web Audio API, Device Motion & Orientation API
- **Cloud & Realtime Sync:** Firebase Firestore & Firebase Authentication
- **SMS Gateway Integration:** Textbee GSM Android SMS Gateway API
- **Target Deployment:** Web Application (SPA/PWA) & Android Mobile App (APK)

---

## 🏛️ Presentation & Academic Showcase

This innovation was designed and built as a practical school-led STEM project for disaster resilience, submitted and presented at the **Malawi University of Science and Technology (MUST)**.

---

## 📄 Terms of Service & Privacy Notice

- **Purpose:** Developed strictly for public safety, disaster education, and community early warning.
- **Data Privacy:** Resident phone numbers and location check-ins are stored solely for emergency notifications and community safety coordination.
- **Open Innovation:** Created by the Dzenje CDSS ADDA STEM Club to promote community safety in Malawi.
