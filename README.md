# SHADOW GATE AR — MISSION 001
> **WebAR Poster-Tracked Dark-Fantasy Prototype (Milestone 001)**

An original dark-fantasy browser-based WebAR experience built with **MindAR**, **Three.js**, and vanilla web standards. No native app installation required.

---

## 🌌 Project Overview

* **Title:** SHADOW GATE
* **Subtitle:** A GAMEATHON AR EXPERIENCE
* **Goal:** A user opens the mobile website, starts the camera, points it at the supplied Gameathon poster artwork, and sees a glowing procedural 3D Shadow Gate stably anchored to the detected image.

---

## 📁 Project Structure

```
shadow-gate-ar/
├── public/
│   ├── index.html                   # Semantic HTML5 entry point & WebAR viewport
│   ├── css/
│   │   └── styles.css               # Dark-fantasy design system (matte-black, neon cyan, deep violet)
│   ├── js/
│   │   ├── ar-controller.js         # MindAR session management, lifecycle & UI transitions
│   │   └── gate-mesh.js             # Procedural 3D Shadow Gate with concentric rotating rings & runes
│   ├── assets/
│   │   ├── gameathon-poster.png     # Official Gameathon dark-fantasy poster artwork
│   │   └── gameathon-poster.mind    # Compiled MindAR feature descriptor target (146,292 bytes)
│   ├── preview-landing.png          # High-resolution mobile preview of landing screen
│   └── preview-poster-modal.png     # Preview of target artwork modal
├── server.cjs                       # Development server with correct MIME types & network IP
├── compiler-server.cjs              # Standalone HTTP service for running MindAR Image Compiler
├── compile-runner.cjs               # Automated Chrome/WebGL execution script for target compilation
├── test-smoke.cjs                   # Automated headless browser test suite
├── package.json                     # Project manifest and runner scripts
└── README.md                        # Documentation and testing instructions
```

---

## ⚡ How the Tracking Target Was Generated

In accordance with MindAR's documented target compiler (`MINDAR.IMAGE.Compiler`), the target was compiled directly from the supplied poster image (`public/assets/gameathon-poster.png`):

1. **Poster Sourcing:** The user confirmed `Screenshot 2026-10-15 193333.png` (840x832 dark-fantasy demonic gate with lightning strikes, skulls, and red magma fissures) as the official Gameathon poster artwork.
2. **Compiler Environment:** MindAR's compiler requires WebGL shaders for multi-scale feature point extraction (`BinomialFilter` kernel). A local compilation bridge (`compiler-server.cjs` and `compile-runner.cjs`) launched Chrome with WebGL hardware acceleration.
3. **Execution:** The image was fed into `new MINDAR.IMAGE.Compiler().compileImageTargets([img])`.
4. **Output:** The resulting multi-scale feature descriptors were exported via `compiler.exportData()` and saved as `public/assets/gameathon-poster.mind` (146,292 bytes).

---

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js (v18+ recommended; tested on v24.18.0)
- Any modern web browser (Google Chrome, Microsoft Edge, Safari)

### 1. Launch the Server
```bash
node server.cjs
```
The server will start on port `3000`:
- **Local URL:** `http://localhost:3000`
- **Network URL:** `http://<your-local-ip>:3000`

---

## 📱 How to Test on a Mobile Phone

WebAR camera access requires either `localhost` or an `HTTPS` connection.

### Method A: Chrome USB Port Forwarding (Recommended for Android)
This is the smoothest and most secure method used by WebAR developers:
1. Connect your Android phone to your PC via USB and enable **USB Debugging**.
2. Open desktop Google Chrome and navigate to `chrome://inspect/#devices`.
3. Click **Port forwarding...** and add rule:
   - Port: `3000`
   - IP address and port: `localhost:3000`
4. On your mobile phone's Chrome browser, navigate to `http://localhost:3000`.
5. Tap **AWAKEN THE GATE** and grant camera permissions.

### Method B: Testing on PC / Second Screen
1. On your PC, open `http://localhost:3000`.
2. Tap **VIEW TARGET POSTER** to open the artwork modal on one monitor (or display `public/assets/gameathon-poster.png` on a secondary screen/tablet).
3. Open `http://localhost:3000` on your testing device, click **AWAKEN THE GATE**, and point the camera at the poster.
4. When tracking locks on:
   - The scanning reticle turns green with locked corner brackets.
   - The status bar displays **"SHADOW GATE AWAKENED!"**.
   - The 3D Shadow Gate rises into view, rotating its concentric rings and pulsating with arcane violet and cyan energy.
5. Tap **STOP AR** at any time to cleanly terminate the camera stream and return to the landing screen.

---

## 🧪 Verification & Automated Checks

| Check | Status | Details |
| :--- | :--- | :--- |
| **Asset HTTP Endpoints** | ✅ PASS | `index.html`, `styles.css`, `ar-controller.js`, `gate-mesh.js`, `gameathon-poster.png`, `gameathon-poster.mind` all return HTTP 200 with proper MIME headers. |
| **Procedural 3D Gate** | ✅ PASS | 3 concentric rings, 8 floating orbital stone fragments, pulsing point light, canvas-generated cyan rune band, deep violet vortex, and central dark void. |
| **UI State Machine** | ✅ PASS | Verified landing screen -> requesting state -> scanning overlay -> STOP AR cleanup & session restoration. |
| **Poster Modal** | ✅ PASS | Verified opening, rendering, and dismissal of the target artwork helper. |
| **Target Compiler** | ✅ PASS | Generated real `gameathon-poster.mind` (146,292 bytes) using `MINDAR.IMAGE.Compiler`. |
| **Physical Optical Tracking** | ⚠️ Physical Device Required | Requires pointing a physical mobile camera at the printed poster or a secondary monitor display. |
