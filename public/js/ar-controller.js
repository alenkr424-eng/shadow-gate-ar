/**
 * Shadow Gate AR — AR Controller
 * Handles MindAR lifecycle, camera permissions, UI state machine, and error recovery.
 */
import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import { ShadowGate } from './gate-mesh.js';

export class ARController {
  constructor() {
    this.container = document.getElementById('ar-container');
    this.landingScreen = document.getElementById('landing-screen');
    this.scanningOverlay = document.getElementById('scanning-overlay');
    this.statusBanner = document.getElementById('status-banner');
    this.statusText = document.getElementById('status-text');
    this.errorModal = document.getElementById('error-modal');
    this.errorMessage = document.getElementById('error-message');
    this.cameraBlockedModal = document.getElementById('camera-blocked-modal');
    this.stopBtn = document.getElementById('btn-stop-ar');
    this.awakenBtn = document.getElementById('btn-awaken');

    this.mindarThree = null;
    this.shadowGate = null;
    this.anchor = null;
    this.isSessionActive = false;
    this.isTargetDetected = false;
    this.clock = new THREE.Clock();

    this.checkProtocol();
    this.bindEvents();
  }

  checkProtocol() {
    if (window.location.protocol === 'file:') {
      const banner = document.getElementById('file-protocol-warning');
      if (banner) banner.classList.remove('hidden');
    }
  }

  bindEvents() {
    this.awakenBtn.addEventListener('click', () => this.startARSession());
    this.stopBtn.addEventListener('click', () => this.stopARSession());
    
    // Error modal close
    const closeErrorBtn = document.getElementById('btn-close-error');
    if (closeErrorBtn) {
      closeErrorBtn.addEventListener('click', () => {
        this.errorModal.classList.add('hidden');
      });
    }

    // Camera blocked modal buttons
    const btnRetryCamera = document.getElementById('btn-retry-camera');
    if (btnRetryCamera) {
      btnRetryCamera.addEventListener('click', () => {
        this.cameraBlockedModal.classList.add('hidden');
        this.startARSession();
      });
    }
    const btnDismissBlocked = document.getElementById('btn-dismiss-blocked');
    if (btnDismissBlocked) {
      btnDismissBlocked.addEventListener('click', () => {
        this.cameraBlockedModal.classList.add('hidden');
        this.stopARSession();
      });
    }

    // Modal for viewing poster on secondary screen
    const viewPosterBtn = document.getElementById('btn-view-poster');
    const posterModal = document.getElementById('poster-modal');
    const closePosterBtn = document.getElementById('btn-close-poster');
    
    if (viewPosterBtn && posterModal && closePosterBtn) {
      viewPosterBtn.addEventListener('click', () => posterModal.classList.remove('hidden'));
      closePosterBtn.addEventListener('click', () => posterModal.classList.add('hidden'));
    }

    // Mobile connect modal (QR code)
    const btnMobileConnect = document.getElementById('btn-mobile-connect');
    const mobileModal = document.getElementById('mobile-modal');
    const closeMobileBtn = document.getElementById('btn-close-mobile');
    if (btnMobileConnect && mobileModal && closeMobileBtn) {
      btnMobileConnect.addEventListener('click', () => mobileModal.classList.remove('hidden'));
      closeMobileBtn.addEventListener('click', () => mobileModal.classList.add('hidden'));
    }
  }

  updateStatus(message, state = 'info') {
    if (!this.statusText) return;
    this.statusText.textContent = message;
    
    this.statusBanner.className = 'status-banner';
    if (state === 'success') {
      this.statusBanner.classList.add('status-success');
    } else if (state === 'warning') {
      this.statusBanner.classList.add('status-warning');
    } else if (state === 'error') {
      this.statusBanner.classList.add('status-error');
    }
  }

  showError(message) {
    console.error('[AR Controller]', message);
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }
    if (this.errorModal) {
      this.errorModal.classList.remove('hidden');
    }
    this.updateStatus(message, 'error');
  }

  showCameraBlockedNotice() {
    console.warn('[AR Controller] Camera access blocked by browser.');
    if (this.cameraBlockedModal) {
      this.cameraBlockedModal.classList.remove('hidden');
    }
    this.stopARSession();
    this.updateStatus("CAMERA ACCESS BLOCKED — SEE INSTRUCTIONS", "error");
  }

  async startARSession() {
    if (this.isSessionActive) return;

    // 1. Check protocol
    if (window.location.protocol === 'file:') {
      this.showError("Camera tracking cannot run on file:// protocol due to browser security restrictions. Please run via http://localhost:3000 or https://localhost:3443!");
      return;
    }

    // 2. Check secure context (HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      this.showError("Camera access requires HTTPS or localhost. Please access via the HTTPS address provided by the server.");
      return;
    }

    // 3. Pre-verify camera permissions with clear error trapping
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        // Stop the test stream immediately so MindAR can bind it
        testStream.getTracks().forEach(track => track.stop());
      } else {
        throw new Error("navigator.mediaDevices.getUserMedia is not supported on this browser.");
      }
    } catch (permErr) {
      console.error('[AR Camera Pre-check Error]', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        this.showCameraBlockedNotice();
        return;
      } else if (permErr.name === 'NotFoundError' || permErr.name === 'DevicesNotFoundError') {
        this.showError("No camera device was detected on your system. Please connect a webcam or test on a mobile phone.");
        return;
      } else if (permErr.name === 'NotReadableError' || permErr.name === 'TrackStartError') {
        this.showError("Camera is currently in use by another application. Please close other camera apps and retry.");
        return;
      } else {
        this.showError("Camera permission error: " + permErr.message);
        return;
      }
    }

    // 4. UI: Transition to Scanning State
    this.landingScreen.classList.add('fade-out');
    setTimeout(() => {
      this.landingScreen.classList.add('hidden');
      this.scanningOverlay.classList.remove('hidden');
      this.scanningOverlay.classList.add('fade-in');
    }, 400);

    this.updateStatus("INITIALIZING TRACKING SENSORS...", "warning");

    try {
      // 5. Initialize MindARThree instance with optimal OneEuro motion filter
      this.mindarThree = new MindARThree({
        container: this.container,
        imageTargetSrc: './assets/gameathon-poster.mind',
        filterMinCF: 0.001,  // Smooth when still
        filterBeta: 1000,    // Responsive when moving (eliminates tracking lag)
        warmupTolerance: 5,
        missTolerance: 8     // Prevents dropped tracking during device tilt
      });

      const { renderer, scene, camera } = this.mindarThree;

      // High-performance mobile WebGL settings: clamp DPR to 1.5 to eliminate GPU fill-rate hitching
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping; // Skip costly full-screen tone-mapping shader pass
      renderer.powerPreference = 'high-performance';

      // Ambient arcane illumination
      const ambientLight = new THREE.AmbientLight(0x1a1a2e, 1.2);
      scene.add(ambientLight);

      // 6. Set up Anchor & Single Gate Instance
      this.anchor = this.mindarThree.addAnchor(0);
      
      // Prevent duplicate gate instances
      if (this.shadowGate) {
        this.anchor.group.remove(this.shadowGate.group);
        this.shadowGate = null;
      }

      this.shadowGate = new ShadowGate();
      this.shadowGate.setVisibility(false, true); // Hidden until recognized
      this.anchor.group.add(this.shadowGate.group);

      // 7. Anchor Event Listeners
      this.anchor.onTargetFound = () => {
        this.isTargetDetected = true;
        this.onTargetFound();
      };

      this.anchor.onTargetLost = () => {
        this.isTargetDetected = false;
        this.onTargetLost();
      };

      // 8. Start MindAR tracking engine
      this.updateStatus("STARTING CAMERA STREAM...", "warning");
      await this.mindarThree.start();
      this.isSessionActive = true;
      this.clock.start();

      this.updateStatus("SCANNING: ALIGN POSTER IN RETICLE", "info");

      // 9. Active Render Loop
      renderer.setAnimationLoop(() => {
        const delta = this.clock.getDelta();
        if (this.shadowGate && this.isTargetDetected) {
          this.shadowGate.update(delta);
        }
        renderer.render(scene, camera);
      });

    } catch (err) {
      console.error('[MindAR Initialization Error]', err);
      if (err.name === 'NotAllowedError') {
        this.showCameraBlockedNotice();
      } else {
        this.showError("Failed to start WebAR: " + (err.message || err));
      }
      this.stopARSession();
    }
  }

  onTargetFound() {
    console.log('[AR] Target detected: Gameathon Poster!');
    this.updateStatus("SHADOW GATE AWAKENED!", "success");

    const reticle = document.getElementById('scanning-reticle');
    if (reticle) reticle.classList.add('locked');

    const tip = document.querySelector('.hud-bottom-tip');
    if (tip) tip.classList.add('fade-out-tip');

    if (this.shadowGate) {
      this.shadowGate.setVisibility(true);
    }

    // Arcane Audio Stinger & Haptic Feedback
    this.playAwakenAudio();

    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 80]);
    }
  }

  onTargetLost() {
    console.log('[AR] Target lost');
    this.updateStatus("TARGET LOST — RE-ALIGN POSTER", "warning");

    const reticle = document.getElementById('scanning-reticle');
    if (reticle) reticle.classList.remove('locked');

    const tip = document.querySelector('.hud-bottom-tip');
    if (tip) tip.classList.remove('fade-out-tip');

    if (this.shadowGate) {
      this.shadowGate.setVisibility(false);
    }
  }

  playAwakenAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Low resonant arcane drone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(70, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 1.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      gain1.gain.setValueAtTime(0.28, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 2.0);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 2.1);

      // High mystic arcane chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain2.gain.setValueAtTime(0.12, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 1.3);
    } catch (e) {
      console.warn('[Audio] Non-fatal Web Audio stinger error:', e);
    }
  }

  stopARSession() {
    console.log('[AR] Stopping AR session and cleaning up resources...');
    this.isSessionActive = false;
    this.isTargetDetected = false;

    // 1. Stop MindAR and rendering
    if (this.mindarThree) {
      try {
        if (this.mindarThree.renderer) {
          this.mindarThree.renderer.setAnimationLoop(null);
        }
        this.mindarThree.stop();
      } catch (e) {
        console.warn('[AR] Cleanup warning:', e);
      }
      this.mindarThree = null;
    }

    // 2. Stop any remaining camera media streams
    const videos = this.container.querySelectorAll('video');
    videos.forEach(v => {
      if (v.srcObject) {
        const tracks = v.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        v.srcObject = null;
      }
      v.remove();
    });

    // 3. Remove canvases created by MindAR
    const canvases = this.container.querySelectorAll('canvas');
    canvases.forEach(c => c.remove());

    // 4. Reset UI
    this.scanningOverlay.classList.add('hidden');
    this.scanningOverlay.classList.remove('fade-in');
    
    this.landingScreen.classList.remove('hidden');
    this.landingScreen.classList.remove('fade-out');
    this.landingScreen.classList.add('fade-in');

    const reticle = document.getElementById('scanning-reticle');
    if (reticle) reticle.classList.remove('locked');

    this.updateStatus("AR SESSION ENDED", "info");
    console.log('[AR] Experience cleanly stopped and ready to awaken again.');
  }
}

// Robust instantiation supporting deferred module loading
function initAR() {
  if (!window.shadowGateAR) {
    window.shadowGateAR = new ARController();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAR);
} else {
  initAR();
}
