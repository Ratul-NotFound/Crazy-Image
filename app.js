// 3D Interactive Particle Portrait Engine
// Antigravity AI Engine — face-api.js 68-landmark integration

class Particle3D {
  constructor(x, y, z, r, g, b, size) {
    // Target (resting) coordinates in 3D space
    this.destX = x;
    this.destY = y;
    this.destZ = z;

    // Current coordinates in 3D space
    this.x = x + (Math.random() - 0.5) * 500;
    this.y = y + (Math.random() - 0.5) * 500;
    this.z = z + (Math.random() - 0.5) * 500;

    // Velocities
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Original Pixel Color
    this.origR = r;
    this.origG = g;
    this.origB = b;

    // Active color (interpolated during color preset transitions)
    this.r = r;
    this.g = g;
    this.b = b;

    this.baseSize = size;
    this.size = size;

    // Physics parameters
    this.stiffness = 0.04;
    this.friction = 0.88;
    
    // Wave / Expression phase offset
    this.phase = Math.random() * Math.PI * 2;
    this.distFromCenter = Math.sqrt(x*x + y*y);
  }

  update(mouse, mouseMode, mouseRadius, activeExpression, time, depthStrength, audioScale, mouthOpenScale) {
    let targetX = this.destX;
    let targetY = this.destY;
    let targetZ = this.destZ;

    // Adjust Z target based on the current depth slider configuration
    const depthFactor = depthStrength / 80;
    targetZ = this.destZ * depthFactor;

    // ---- APPLY LIVE EXPRESSIONS ----
    // Smooth Gaussian influence function: returns 0..1 based on distance from a point.
    // sigma controls the spread radius. Larger sigma = wider, softer influence.
    const gauss = (px, py, cx, cy, sigma) => {
      const dx = px - cx;
      const dy = py - cy;
      return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    };

    const faceW = Engine.faceWidth || 300;
    const faceH = Engine.faceHeight || 300;
    const faceCenterX = Engine.faceLeft !== undefined ? (Engine.faceLeft + faceW / 2) : 0;
    const faceCenterY = Engine.faceTop !== undefined ? (Engine.faceTop + faceH / 2) : 0;

    const eyeY = Engine.eyeY !== undefined ? Engine.eyeY : -faceH * 0.12;
    const leftEyeX = Engine.leftEyeX !== undefined ? Engine.leftEyeX : -faceW * 0.18;
    const rightEyeX = Engine.rightEyeX !== undefined ? Engine.rightEyeX : faceW * 0.18;
    const eyeRad = Engine.eyeRad !== undefined ? Engine.eyeRad : faceW * 0.09;

    const eyebrowY = Engine.eyebrowY !== undefined ? Engine.eyebrowY : -faceH * 0.22;
    const mouthY = Engine.mouthY !== undefined ? Engine.mouthY : faceH * 0.18;
    const mouthW = Engine.mouthW !== undefined ? Engine.mouthW : faceW * 0.22;
    const mouthH = Engine.mouthH !== undefined ? Engine.mouthH : faceH * 0.08;

    // Useful derived sizes for Gaussian sigmas
    const eyeSigma = eyeRad * 1.8;        // influence zone around each eye
    const browSigma = faceW * 0.18;       // influence zone for eyebrow region
    const mouthSigmaX = mouthW * 1.2;     // horizontal mouth influence
    const mouthSigmaY = mouthH * 2.5;     // vertical mouth influence (taller for jaw)
    const cheekSigma = faceW * 0.25;       // cheek puff zone
    const mouthCenterX = faceCenterX;      // mouth horizontal center

    // Particle position relative to face center
    const px = this.destX;
    const py = this.destY;

    if (activeExpression === 'breathe') {
      // Gentle, lifelike breathing — subtle chest/face expansion
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.015) * 10;
      targetX += Math.cos(time + this.destY * 0.01) * 3;

    } else if (activeExpression === 'smile') {
      // --- MOUTH: Corners curve upward, center stays ---
      const mouthInf = gauss(px, py, mouthCenterX, mouthY, mouthSigmaX);
      const cornerBias = (px - mouthCenterX) / (mouthW || 1); // -1..1
      // Corners lift more than center (parabolic curve)
      const lift = -cornerBias * cornerBias * faceH * 0.06 * mouthInf;
      // Slight horizontal stretch at corners
      const stretch = cornerBias * faceW * 0.025 * mouthInf;
      targetY += lift;
      targetX += stretch;

      // --- CHEEKS: Puff outward in 3D ---
      const leftCheekX = leftEyeX;
      const rightCheekX = rightEyeX;
      const cheekY = mouthY - faceH * 0.1;
      const leftCheek = gauss(px, py, leftCheekX, cheekY, cheekSigma);
      const rightCheek = gauss(px, py, rightCheekX, cheekY, cheekSigma);
      targetZ += (leftCheek + rightCheek) * 8;
      // Cheeks push up slightly
      targetY -= (leftCheek + rightCheek) * faceH * 0.015;

      // --- EYES: Slight squint (lower lid pushes up) ---
      const leftEyeInf = gauss(px, py, leftEyeX, eyeY + eyeRad * 0.5, eyeSigma * 0.7);
      const rightEyeInf = gauss(px, py, rightEyeX, eyeY + eyeRad * 0.5, eyeSigma * 0.7);
      targetY -= (leftEyeInf + rightEyeInf) * faceH * 0.012;

      // Subtle breathing overlay
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;

    } else if (activeExpression === 'wink') {
      // --- RIGHT EYE: Close by collapsing toward center line ---
      const rightEyeInf = gauss(px, py, rightEyeX, eyeY, eyeSigma);
      const dyFromEye = py - eyeY;
      // Squeeze toward eye center line (dy -> 0)
      targetY -= dyFromEye * 0.85 * rightEyeInf;
      targetZ -= 5 * rightEyeInf; // push lid inward

      // --- LEFT EYE: stays open, maybe slight raise ---
      const leftEyeInf = gauss(px, py, leftEyeX, eyeY, eyeSigma * 0.6);
      targetY -= leftEyeInf * faceH * 0.005; // tiny widening

      // --- RIGHT EYEBROW: Slight raise ---
      const rightBrowInf = gauss(px, py, rightEyeX, eyebrowY, browSigma);
      targetY -= rightBrowInf * faceH * 0.015;

      // --- MOUTH: Slight smirk on right side ---
      const smirkInf = gauss(px, py, mouthCenterX + mouthW * 0.4, mouthY, mouthSigmaX * 0.6);
      targetY -= smirkInf * faceH * 0.02;

      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;

    } else if (activeExpression === 'surprise') {
      // --- MOUTH: Open wide (jaw drops down, upper lip stays) ---
      const mouthInf = gauss(px, py, mouthCenterX, mouthY, mouthSigmaX);
      const aboveMouth = py < mouthY;
      if (aboveMouth) {
        // Upper lip: slight upward
        targetY -= mouthInf * faceH * 0.015;
      } else {
        // Lower jaw: drops significantly
        targetY += mouthInf * faceH * 0.06;
        // Jaw comes forward in 3D
        targetZ += mouthInf * 5;
      }
      // Mouth narrows horizontally into an "O" shape
      const mouthDx = px - mouthCenterX;
      targetX -= mouthDx * 0.15 * mouthInf;

      // --- EYEBROWS: Raise both high ---
      const leftBrowInf = gauss(px, py, leftEyeX, eyebrowY, browSigma);
      const rightBrowInf = gauss(px, py, rightEyeX, eyebrowY, browSigma);
      targetY -= (leftBrowInf + rightBrowInf) * faceH * 0.04;

      // --- EYES: Widen (upper lid goes up) ---
      const leftEyeTop = gauss(px, py, leftEyeX, eyeY - eyeRad * 0.4, eyeSigma * 0.7);
      const rightEyeTop = gauss(px, py, rightEyeX, eyeY - eyeRad * 0.4, eyeSigma * 0.7);
      targetY -= (leftEyeTop + rightEyeTop) * faceH * 0.015;

      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;

    } else if (activeExpression === 'angry') {
      // --- EYEBROWS: Pull down and together (furrow) ---
      const leftBrowInf = gauss(px, py, leftEyeX, eyebrowY, browSigma);
      const rightBrowInf = gauss(px, py, rightEyeX, eyebrowY, browSigma);
      // Pull down
      targetY += (leftBrowInf + rightBrowInf) * faceH * 0.035;
      // Pull inward (toward nose bridge)
      const browDx = px - faceCenterX;
      targetX -= browDx * 0.08 * (leftBrowInf + rightBrowInf);

      // --- EYES: Narrow/squint ---
      const leftEyeInf = gauss(px, py, leftEyeX, eyeY, eyeSigma * 0.8);
      const rightEyeInf = gauss(px, py, rightEyeX, eyeY, eyeSigma * 0.8);
      const dyFromEye = py - eyeY;
      // Top of eye comes down, bottom comes up
      if (dyFromEye < 0) {
        targetY += leftEyeInf * faceH * 0.01;
        targetY += rightEyeInf * faceH * 0.01;
      } else {
        targetY -= leftEyeInf * faceH * 0.008;
        targetY -= rightEyeInf * faceH * 0.008;
      }

      // --- MOUTH: Tighten/compress (thin lips pressed together) ---
      const mouthInf = gauss(px, py, mouthCenterX, mouthY, mouthSigmaX * 0.8);
      const dyMouth = py - mouthY;
      targetY -= dyMouth * 0.25 * mouthInf; // compress vertically

      // --- NOSE: Wrinkle (push forward) ---
      const noseY = (eyeY + mouthY) / 2;
      const noseInf = gauss(px, py, faceCenterX, noseY, faceW * 0.12);
      targetZ += noseInf * 6;

      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;

    } else if (activeExpression === 'sad') {
      // --- MOUTH: Corners droop downward ---
      const mouthInf = gauss(px, py, mouthCenterX, mouthY, mouthSigmaX);
      const cornerBias = (px - mouthCenterX) / (mouthW || 1);
      // Corners pull down (opposite of smile)
      const droop = cornerBias * cornerBias * faceH * 0.04 * mouthInf;
      targetY += droop;

      // --- INNER EYEBROWS: Raise (puppy eyes), outer droop ---
      const leftBrowInf = gauss(px, py, leftEyeX, eyebrowY, browSigma);
      const rightBrowInf = gauss(px, py, rightEyeX, eyebrowY, browSigma);
      const browInnerBias = 1.0 - Math.min(1, Math.abs(px - faceCenterX) / (faceW * 0.25));
      // Inner brows go up, outer brows go down
      targetY -= (leftBrowInf + rightBrowInf) * browInnerBias * faceH * 0.03;
      targetY += (leftBrowInf + rightBrowInf) * (1 - browInnerBias) * faceH * 0.012;

      // --- EYES: Slightly narrow (about to cry) ---
      const leftEyeInf = gauss(px, py, leftEyeX, eyeY + eyeRad * 0.3, eyeSigma * 0.6);
      const rightEyeInf = gauss(px, py, rightEyeX, eyeY + eyeRad * 0.3, eyeSigma * 0.6);
      targetY -= (leftEyeInf + rightEyeInf) * faceH * 0.008;

      // --- CHIN: Slight tremble / push forward ---
      const chinY = mouthY + faceH * 0.12;
      const chinInf = gauss(px, py, faceCenterX, chinY, faceW * 0.15);
      targetZ += chinInf * 4;
      targetY += chinInf * Math.sin(time * 8) * faceH * 0.005; // subtle tremble

      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;

    } else if (activeExpression === 'glitch') {
      if (Math.random() < 0.005) {
        this.x += (Math.random() - 0.5) * 30;
      }
      if (Math.random() < 0.003) {
        this.z += (Math.random() - 0.5) * 40;
      }
    } else if (activeExpression === 'vortex') {
      const orbitRadius = Math.max(10, this.distFromCenter);
      const angle = time * 1.5 + this.distFromCenter * 0.005;
      targetX = Math.cos(angle) * orbitRadius;
      targetY = Math.sin(angle) * orbitRadius;
      targetZ = this.destZ * depthFactor + Math.sin(time * 3 + this.distFromCenter * 0.02) * 15;
    }

    // ---- JAW SPEAK MOVEMENT (also smooth) ----
    if (mouthOpenScale > 0) {
      const speakInf = gauss(px, py, mouthCenterX, mouthY, mouthSigmaX);
      const belowMouth = py >= mouthY;
      if (belowMouth) {
        // Lower jaw drops
        targetY += mouthOpenScale * faceH * 0.055 * speakInf;
        targetZ += mouthOpenScale * 5 * speakInf;
      } else {
        // Upper lip slight movement
        const upperInf = gauss(px, py, mouthCenterX, mouthY - mouthH * 0.5, mouthSigmaX * 0.6);
        targetY -= mouthOpenScale * faceH * 0.012 * upperInf;
      }
    }

    // Apply spring physics pulling toward active targets
    let forceX = (targetX - this.x) * this.stiffness;
    let forceY = (targetY - this.y) * this.stiffness;
    let forceZ = (targetZ - this.z) * this.stiffness;

    this.vx += forceX;
    this.vy += forceY;
    this.vz += forceZ;

    // ---- MOUSE INTERACTION (SCREEN SPACE) ----
    if (mouseMode !== 'none' && mouse.x !== null && mouse.y !== null && this.screenX !== undefined && this.screenY !== undefined) {
      const dx = this.screenX - mouse.x;
      const dy = this.screenY - mouse.y;
      const distSq = dx * dx + dy * dy;
      const radSq = mouseRadius * mouseRadius;

      if (distSq < radSq) {
        const dist = Math.sqrt(distSq);
        const force = (mouseRadius - dist) / mouseRadius;

        if (mouseMode === 'repel') {
          const angle = Math.atan2(dy, dx);
          this.vx += Math.cos(angle) * force * 6;
          this.vy += Math.sin(angle) * force * 6;
          this.vz += force * 12;
        } else if (mouseMode === 'attract') {
          const angle = Math.atan2(dy, dx);
          this.vx -= Math.cos(angle) * force * 5;
          this.vy -= Math.sin(angle) * force * 5;
          this.vz -= force * 10;
        } else if (mouseMode === 'swirl') {
          const angle = Math.atan2(dy, dx) + Math.PI / 2;
          this.vx += Math.cos(angle) * force * 6;
          this.vy += Math.sin(angle) * force * 6;
        }
      }
    }

    // ---- AUDIO REACTIVITY ----
    if (audioScale > 0) {
      const noise = (Math.random() - 0.5) * audioScale * 30;
      this.vx += (Math.random() - 0.5) * audioScale * 2;
      this.vy += (Math.random() - 0.5) * audioScale * 2;
      this.vz += noise;
    }

    // Apply friction and move
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vz *= this.friction;

    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
  }

  // Calculate projected 3D to 2D screen coordinates
  project(yaw, pitch, roll, zoom, focalLength, width, height) {
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    let rx = this.x * cosR - this.y * sinR;
    let ry = this.x * sinR + this.y * cosR;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    let x1 = rx * cosY - this.z * sinY;
    let z1 = rx * sinY + this.z * cosY;

    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);
    let y2 = ry * cosX - z1 * sinX;
    let z2 = ry * sinX + z1 * cosX;

    const perspectiveScale = focalLength / (focalLength + z2);
    
    this.screenX = width / 2 + x1 * perspectiveScale * zoom;
    this.screenY = height / 2 + y2 * perspectiveScale * zoom;
    
    this.projZ = z2; 
    this.projSize = Math.max(0.1, this.size * perspectiveScale * zoom);
    
    const fogStart = -200;
    const fogEnd = 300;
    let alpha = 1 - (z2 - fogStart) / (fogEnd - fogStart);
    this.projAlpha = Math.max(0.15, Math.min(1, alpha));
  }

  lerpColor(r, g, b, speed) {
    this.r += (r - this.r) * speed;
    this.g += (g - this.g) * speed;
    this.b += (b - this.b) * speed;
  }
}

// ---- MAIN ENGINE CONTROL ----
const Engine = {
  canvas: null,
  ctx: null,
  particles: [],
  loadedImage: null,
  time: 0,
  
  // Settings & parameters
  particleCount: 8000,
  particleSize: 2.2,
  depthStrength: 80,
  mouseMode: 'repel',
  colorTheme: 'original',
  activeExpression: 'breathe',
  audioReact: false,
  focusMode: 'face', // 'face' or 'full'
  
  // Camera variables
  yaw: 0,
  pitch: 0,
  roll: 0,
  zoom: 1.1,
  targetYaw: 0,
  targetPitch: 0,
  targetRoll: 0,
  targetZoom: 1.1,
  focalLength: 500,

  // Gesture & Idle states
  activeGesture: 'none',
  gestureTimer: 0,
  gestureDuration: 0,
  mouthOpenScale: 0,
  idleTime: 0,

  // Mouse tracking
  mouse: { x: null, y: null, px: null, py: null, isDragging: false },
  mouseRadius: 100,

  // Audio analyzer properties
  audioCtx: null,
  analyser: null,
  dataArray: null,
  audioScale: 0,

  // Face detection state
  modelsLoaded: false,
  cachedDetection: null,
  cachedFaceCanvas: null,

  setStatus(text, color) {
    const el = document.getElementById('status-text');
    if (el) {
      el.innerText = text;
      el.style.color = color || '#ffcc00';
    }
    const border = document.getElementById('detection-status');
    if (border) {
      border.style.borderLeftColor = color || '#ffcc00';
    }
  },

  async init() {
    this.canvas = document.getElementById('particleCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.resizeCanvas();
    this.setupEventListeners();
    this.setupControlsUI();
    
    // Load face-api.js models
    if (typeof faceapi !== 'undefined') {
      try {
        this.setStatus('Loading AI Models...', '#ffcc00');
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        this.modelsLoaded = true;
        console.log("face-api.js models loaded successfully!");
        this.setStatus('AI Ready ✓', '#00ffcc');
      } catch (e) {
        console.warn("Could not load face-api models:", e);
        this.setStatus('Model Load Failed ✗', '#ff4444');
      }
    } else {
      console.warn("face-api.js library not found on window");
      this.setStatus('Library Missing ✗', '#ff4444');
    }

    // Load default demo portrait
    this.loadImage('portrait.png');
  },

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.parentElement.clientWidth * dpr;
    this.canvas.height = this.canvas.parentElement.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.mouseRadius = Math.min(this.canvas.width, this.canvas.height) / (6 * dpr);
  },

  /**
   * Creates a canvas element from an image source for face-api.js processing.
   * face-api.js works most reliably with canvas elements, not raw Image objects.
   */
  imageToCanvas(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  },

  loadImage(src) {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    const loadingText = document.getElementById('loadingText');
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = async () => {
      this.loadedImage = img;
      
      if (this.modelsLoaded) {
        try {
          if (loadingText) loadingText.textContent = 'AI scanning for face...';
          this.setStatus('Scanning...', '#ffaa00');
          
          // CRITICAL: Draw image to canvas first — face-api works reliably with canvas, 
          // not raw <img> tags, especially for data: URLs from FileReader
          const inputCanvas = this.imageToCanvas(img);
          
          const detection = await faceapi
            .detectSingleFace(inputCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 }))
            .withFaceLandmarks();
          
          if (detection) {
            console.log("Face detected with 68 landmarks!", detection);
            this.cachedDetection = detection;
            this.setStatus('Face Locked ✓', '#00ff00');
          } else {
            console.log("No face detected, using centered fallback.");
            this.cachedDetection = null;
            this.setStatus('No Face Found (Fallback)', '#ff6644');
          }
        } catch (e) {
          console.warn("Face detection error:", e);
          this.cachedDetection = null;
          this.setStatus('Detection Error (Fallback)', '#ff4444');
        }
      } else {
        this.cachedDetection = null;
        this.setStatus('Models Not Ready', '#ff4444');
      }
      
      this.scanImage();
      document.getElementById('loadingOverlay').classList.add('hidden');
      if (loadingText) loadingText.textContent = 'Scanning neural depth map...';
    };
    
    img.onerror = () => {
      console.warn("Could not load image, building procedural face outline.");
      this.generateFallbackPattern();
      document.getElementById('loadingOverlay').classList.add('hidden');
    };
    
    img.src = src;
  },

  /**
   * Core scanning pipeline: reads pixel data from image, maps face landmarks,
   * and generates the 3D particle field.
   */
  scanImage() {
    if (!this.loadedImage) return;

    const detection = this.cachedDetection;
    const img = this.loadedImage;

    // Determine crop region
    let cropX = 0, cropY = 0, cropW = img.width, cropH = img.height;

    if (detection && this.focusMode === 'face') {
      // Crop to face region with generous padding
      const box = detection.detection.box;
      const padX = box.width * 0.6;
      const padY = box.height * 0.5;
      cropX = Math.max(0, Math.round(box.x - padX));
      cropY = Math.max(0, Math.round(box.y - padY));
      cropW = Math.min(img.width - cropX, Math.round(box.width + padX * 2));
      cropH = Math.min(img.height - cropY, Math.round(box.height + padY * 2));
    }

    // Create a temporary thumbnail canvas to downsample pixel grid
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const aspect = cropW / cropH;
    const tempHeight = Math.round(Math.sqrt(this.particleCount / aspect));
    const tempWidth = Math.round(tempHeight * aspect);
    
    tempCanvas.width = tempWidth;
    tempCanvas.height = tempHeight;
    
    // Draw cropped region onto thumbnail canvas
    tempCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, tempWidth, tempHeight);
    
    const imgData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);
    const data = imgData.data;
    
    const newTargets = [];
    
    // Compute pixel scale
    const scale = Math.min(
      (this.canvas.width / (window.devicePixelRatio || 1)) * 0.55 / tempWidth,
      (this.canvas.height / (window.devicePixelRatio || 1)) * 0.55 / tempHeight
    );

    const partW = tempWidth * scale;
    const partH = tempHeight * scale;

    if (detection) {
      const box = detection.detection.box;
      const origW = img.width;
      const origH = img.height;

      // Map face box from original image coords into particle coords
      // accounting for the crop offset
      this.faceWidth = (box.width / cropW) * partW;
      this.faceHeight = (box.height / cropH) * partH;
      this.faceLeft = ((box.x - cropX) / cropW - 0.5) * partW;
      this.faceTop = ((box.y - cropY) / cropH - 0.5) * partH;
      this.hasFaceDetected = true;

      // Helper to map a 68-point landmark to particle coordinates
      const mapPoint = (p) => ({
        x: ((p.x - cropX) / cropW - 0.5) * partW,
        y: ((p.y - cropY) / cropH - 0.5) * partH
      });
      
      const landmarks = detection.landmarks.positions;
      
      const getAvg = (indices) => {
        let sx = 0, sy = 0;
        indices.forEach(i => {
          const pt = mapPoint(landmarks[i]);
          sx += pt.x; sy += pt.y;
        });
        return { x: sx / indices.length, y: sy / indices.length };
      };

      // 68-point landmark clusters
      const leftEye = getAvg([36, 37, 38, 39, 40, 41]);
      const rightEye = getAvg([42, 43, 44, 45, 46, 47]);
      const leftEyebrow = getAvg([17, 18, 19, 20, 21]);
      const rightEyebrow = getAvg([22, 23, 24, 25, 26]);
      const mouth = getAvg([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);

      this.leftEyeX = leftEye.x;
      this.rightEyeX = rightEye.x;
      this.eyeY = (leftEye.y + rightEye.y) / 2;
      this.eyeRad = this.faceWidth * 0.13;
      this.eyebrowY = (leftEyebrow.y + rightEyebrow.y) / 2;

      this.mouthY = mouth.y;
      
      const mouthLeft = mapPoint(landmarks[48]).x;
      const mouthRight = mapPoint(landmarks[54]).x;
      const mouthTop = mapPoint(landmarks[51]).y;
      const mouthBottom = mapPoint(landmarks[57]).y;
      
      this.mouthW = Math.max((mouthRight - mouthLeft) * 1.2, this.faceWidth * 0.15);
      this.mouthH = Math.max((mouthBottom - mouthTop) * 1.5, this.faceHeight * 0.08);

      console.log("Landmark mapping complete:", {
        leftEye, rightEye, mouth,
        faceWidth: this.faceWidth, faceHeight: this.faceHeight
      });

    } else {
      // Fallback centered bounding box
      this.faceWidth = partW * 0.65;
      this.faceHeight = partH * 0.65;
      this.faceLeft = -this.faceWidth / 2;
      this.faceTop = -this.faceHeight / 2;
      this.hasFaceDetected = false;

      this.eyeY = this.faceTop + this.faceHeight * 0.38;
      this.leftEyeX = this.faceLeft + this.faceWidth * 0.31;
      this.rightEyeX = this.faceLeft + this.faceWidth * 0.69;
      this.eyeRad = this.faceWidth * 0.13;
      this.eyebrowY = this.faceTop + this.faceHeight * 0.24;
      this.mouthY = this.faceTop + this.faceHeight * 0.74;
      this.mouthW = this.faceWidth * 0.28;
      this.mouthH = this.faceHeight * 0.11;
    }

    // Build particle target positions from pixel data
    for (let y = 0; y < tempHeight; y++) {
      for (let x = 0; x < tempWidth; x++) {
        const idx = (y * tempWidth + x) * 4;
        const alpha = data[idx + 3];
        
        if (alpha < 50) continue;
        
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const posX = (x - tempWidth / 2) * scale;
        const posY = (y - tempHeight / 2) * scale;
        
        // Spherical bulge centered on face
        let normX = 0, normY = 0;
        if (detection) {
          const faceCX = this.faceLeft + this.faceWidth / 2;
          const faceCY = this.faceTop + this.faceHeight / 2;
          normX = (posX - faceCX) / (this.faceWidth / 2 || 1);
          normY = (posY - faceCY) / (this.faceHeight / 2 || 1);
        } else {
          normX = posX / (partW / 2 || 1);
          normY = posY / (partH / 2 || 1);
        }
        const distSq = normX * normX + normY * normY;
        const bulge = Math.max(0, 1.0 - distSq);
        
        const posZ = ((brightness - 128) / 128) * this.depthStrength * 0.7 + (bulge * this.depthStrength * 0.8);
        
        newTargets.push({ x: posX, y: posY, z: posZ, r, g, b });
      }
    }

    // Shuffle targets for scatter animation
    for (let i = newTargets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newTargets[i], newTargets[j]] = [newTargets[j], newTargets[i]];
    }

    const currentLen = this.particles.length;
    const targetLen = newTargets.length;
    const minLen = Math.min(currentLen, targetLen);

    for (let i = 0; i < minLen; i++) {
      const p = this.particles[i];
      p.destX = newTargets[i].x;
      p.destY = newTargets[i].y;
      p.destZ = newTargets[i].z;
      p.origR = newTargets[i].r;
      p.origG = newTargets[i].g;
      p.origB = newTargets[i].b;
      p.distFromCenter = Math.sqrt(p.destX * p.destX + p.destY * p.destY);
    }

    if (currentLen > targetLen) {
      this.particles = this.particles.slice(0, targetLen);
    } else if (currentLen < targetLen) {
      for (let i = currentLen; i < targetLen; i++) {
        const t = newTargets[i];
        let startX = t.x, startY = t.y, startZ = t.z;

        if (this.particles.length > 0) {
          const parent = this.particles[Math.floor(Math.random() * this.particles.length)];
          startX = parent.x;
          startY = parent.y;
          startZ = parent.z;
        }

        const p = new Particle3D(t.x, t.y, t.z, t.r, t.g, t.b, this.particleSize);
        p.x = startX;
        p.y = startY;
        p.z = startZ;
        this.particles.push(p);
      }
    }
  },

  generateFallbackPattern() {
    this.particles = [];
    const size = Math.min(this.canvas.width, this.canvas.height) / (window.devicePixelRatio || 1) * 0.3;
    this.faceWidth = size * 2;
    this.faceHeight = size * 2;
    
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const posX = size * 0.8 * Math.sin(phi) * Math.cos(theta);
      const posY = size * 1.1 * Math.sin(phi) * Math.sin(theta);
      let posZ = size * 0.8 * Math.cos(phi);
      
      const distEyeL = Math.hypot(posX + size*0.2, posY + size*0.15);
      const distEyeR = Math.hypot(posX - size*0.2, posY + size*0.15);
      if (distEyeL < size*0.15) posZ += (size*0.15 - distEyeL) * 0.5;
      if (distEyeR < size*0.15) posZ += (size*0.15 - distEyeR) * 0.5;

      const r = Math.round(150 + Math.random() * 105);
      const g = Math.round(100 + Math.random() * 50);
      const b = Math.round(200 + Math.random() * 55);

      this.particles.push(
        new Particle3D(posX, posY, posZ, r, g, b, this.particleSize)
      );
    }
  },

  setupEventListeners() {
    const dpr = window.devicePixelRatio || 1;
    const canvasWrap = this.canvas.parentElement;
    
    const getCanvasMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    canvasWrap.addEventListener('mousemove', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.idleTime = 0;

      if (!this.mouse.isDragging) {
        const normX = (pos.x / (this.canvas.width / dpr)) - 0.5;
        const normY = (pos.y / (this.canvas.height / dpr)) - 0.5;
        this.targetYaw = normX * 0.8;
        this.targetPitch = -normY * 0.8;
      } else {
        const dx = pos.x - this.mouse.px;
        const dy = pos.y - this.mouse.py;
        this.targetYaw += dx * 0.008;
        this.targetPitch += dy * 0.008;
        this.mouse.px = pos.x;
        this.mouse.py = pos.y;
      }
    });

    canvasWrap.addEventListener('mousedown', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.isDragging = true;
      this.mouse.px = pos.x;
      this.mouse.py = pos.y;
      this.idleTime = 0;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDragging = false;
    });

    canvasWrap.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.targetRoll = 0;
    });

    canvasWrap.addEventListener('touchmove', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.idleTime = 0;
    });
    canvasWrap.addEventListener('touchstart', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.idleTime = 0;
    });
    canvasWrap.addEventListener('touchend', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    canvasWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetZoom -= e.deltaY * 0.0008;
      this.targetZoom = Math.max(0.4, Math.min(2.5, this.targetZoom));
      this.idleTime = 0;
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.scanImage();
    });
  },

  setupControlsUI() {
    // 1. Image Upload
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    // 2. Focus Mode (Face Only vs Full Image)
    const focusBtns = document.querySelectorAll('[data-focus]');
    focusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        focusBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.focusMode = btn.dataset.focus;
        this.scanImage(); // Re-scan with new focus mode
      });
    });

    // 3. Expressions
    const exprButtons = document.querySelectorAll('.expr-btn');
    exprButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        exprButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeExpression = btn.dataset.expr;
        
        if (this.activeExpression === 'explode') {
          this.triggerExplosion();
        }
      });
    });

    // 4. Avatar Gestures
    const gestureButtons = document.querySelectorAll('.gesture-btn');
    gestureButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const gestureName = btn.dataset.gesture;
        this.triggerGesture(gestureName);
      });
    });

    // 5. Color Themes
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.colorTheme = btn.dataset.color;
      });
    });

    // 6. Sliders
    const sliders = [
      { id: 'count', param: 'particleCount', cb: (val) => { this.particleCount = parseInt(val); this.scanImage(); } },
      { id: 'size', param: 'particleSize', cb: (val) => { this.particleSize = parseFloat(val); this.particles.forEach(p => p.size = this.particleSize); } },
      { id: 'depth', param: 'depthStrength', cb: (val) => { this.depthStrength = parseInt(val); } }
    ];

    sliders.forEach(slider => {
      const input = document.getElementById(`param-${slider.id}`);
      const valDisplay = document.getElementById(`val-${slider.id}`);
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        valDisplay.textContent = slider.id === 'size' ? `${val}px` : val;
        slider.cb(val);
      });
    });

    // 7. Radio Buttons (Mouse Interaction)
    const radios = document.getElementsByName('mouseMode');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.mouseMode = e.target.value;
      });
    });

    // 8. Audio React
    const audioCheckbox = document.getElementById('audioReactCheckbox');
    audioCheckbox.addEventListener('change', (e) => {
      this.audioReact = e.target.checked;
      if (this.audioReact) {
        this.initAudio();
      }
    });
  },

  resetUIStates() {
    this.colorTheme = 'original';
    this.activeExpression = 'breathe';

    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === 'original');
    });

    const exprButtons = document.querySelectorAll('.expr-btn');
    exprButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.expr === 'breathe');
    });
  },

  handleFile(file) {
    if (!file.type.match('image.*')) return;
    this.resetUIStates();
    const reader = new FileReader();
    reader.onload = (e) => {
      this.loadImage(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  triggerGesture(name) {
    this.activeGesture = name;
    this.gestureTimer = 0;
    this.gestureDuration = name === 'tilt' ? 2.5 : 2.0;
  },

  triggerExplosion() {
    this.particles.forEach(p => {
      const force = 18 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      p.vx = force * Math.sin(phi) * Math.cos(theta);
      p.vy = force * Math.sin(phi) * Math.sin(theta);
      p.vz = force * Math.cos(phi);
    });
  },

  async initAudio() {
    if (this.audioCtx) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (err) {
      console.error("Audio recording permission denied or unavailable", err);
      document.getElementById('audioReactCheckbox').checked = false;
      this.audioReact = false;
    }
  },

  updateColors() {
    const num = this.particles.length;
    
    for (let i = 0; i < num; i++) {
      const p = this.particles[i];
      let tr = p.origR;
      let tg = p.origG;
      let tb = p.origB;

      switch(this.colorTheme) {
        case 'cyberpunk': {
          const ratioX = (p.destX + 150) / 300;
          tr = Math.round(255 * (1 - ratioX));
          tg = Math.round(242 * ratioX);
          tb = Math.round(127 * (1 - ratioX) + 254 * ratioX);
          break;
        }
        case 'hologram': {
          const ratioZ = (p.z + 50) / 100;
          tr = 0;
          tg = Math.round(242 * Math.max(0.4, ratioZ));
          tb = Math.round(254 * Math.max(0.6, ratioZ));
          break;
        }
        case 'aurora': {
          const ratioD = Math.min(1, p.distFromCenter / 200);
          tr = Math.round(255 * (1 - ratioD));
          tg = Math.round(215 * (1 - ratioD) + 255 * ratioD);
          tb = Math.round(135 * ratioD);
          break;
        }
        case 'inferno': {
          const rZ = (p.destZ + 40) / 80;
          if (rZ > 0.5) {
            tr = 255;
            tg = Math.round(255 * (rZ - 0.5) * 2);
            tb = 0;
          } else {
            tr = Math.round(255 * rZ * 2);
            tg = 0;
            tb = 0;
          }
          break;
        }
      }

      p.lerpColor(tr, tg, tb, 0.1);
    }
  },

  animate() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, width, height);

    this.time += 0.01;
    this.idleTime += 0.016;

    // Idle camera movements
    if (this.idleTime > 4.0) {
      this.targetYaw = Math.sin(this.time * 0.4) * 0.22;
      this.targetPitch = Math.cos(this.time * 0.3) * 0.12;
      this.targetRoll = Math.sin(this.time * 0.25) * 0.06;

      if (Math.random() < 0.0015 && this.activeGesture === 'none') {
        this.triggerGesture(Math.random() < 0.5 ? 'nod' : 'tilt');
      }
    } else {
      this.targetRoll = 0;
    }

    // Smooth camera interpolation
    this.yaw += (this.targetYaw - this.yaw) * 0.08;
    this.pitch += (this.targetPitch - this.pitch) * 0.08;
    this.roll += (this.targetRoll - this.roll) * 0.08;
    this.zoom += (this.targetZoom - this.zoom) * 0.08;

    // Audio FFT processing
    if (this.audioReact && this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      this.audioScale = (sum / this.dataArray.length) / 255;
    } else {
      this.audioScale = 0;
    }

    // Gesture offsets
    let yawOffset = 0, pitchOffset = 0, rollOffset = 0;

    if (this.activeGesture !== 'none') {
      this.gestureTimer += 0.016;
      if (this.gestureTimer >= this.gestureDuration) {
        this.activeGesture = 'none';
        this.mouthOpenScale = 0;
      } else {
        if (this.activeGesture === 'nod') {
          pitchOffset = Math.sin(this.gestureTimer * (Math.PI * 2 / 0.65)) * 0.12;
        } else if (this.activeGesture === 'shake') {
          yawOffset = Math.sin(this.gestureTimer * (Math.PI * 2 / 0.65)) * 0.16;
        } else if (this.activeGesture === 'tilt') {
          rollOffset = Math.sin(this.gestureTimer * (Math.PI * 2 / 1.0)) * 0.1;
        } else if (this.activeGesture === 'speak') {
          this.mouthOpenScale = Math.abs(Math.sin(this.gestureTimer * 12)) * 0.8;
        }
      }
    }

    if (this.audioReact) {
      this.mouthOpenScale = Math.min(1.0, this.audioScale * 3.5);
    } else if (this.activeGesture !== 'speak') {
      this.mouthOpenScale = 0;
    }

    this.updateColors();

    const currentYaw = this.yaw + yawOffset;
    const currentPitch = this.pitch + pitchOffset;
    const currentRoll = this.roll + rollOffset;

    // 1. Physics update & Camera projection
    const numParticles = this.particles.length;
    for (let i = 0; i < numParticles; i++) {
      const p = this.particles[i];
      p.update(this.mouse, this.mouseMode, this.mouseRadius, this.activeExpression, this.time, this.depthStrength, this.audioScale, this.mouthOpenScale);
      p.project(currentYaw, currentPitch, currentRoll, this.zoom, this.focalLength, width, height);
    }

    // 2. Depth sorting (Painter's Algorithm)
    this.particles.sort((a, b) => b.projZ - a.projZ);

    // 3. Optimized rendering: use fillRect for speed instead of canvas paths
    // This eliminates the per-particle beginPath/closePath/fill overhead
    const ctx = this.ctx;
    
    for (let i = 0; i < numParticles; i++) {
      const p = this.particles[i];
      
      // Skip off-screen particles
      if (p.screenX < -20 || p.screenX > width + 20 || p.screenY < -20 || p.screenY > height + 20) {
        continue;
      }

      const s = p.projSize;
      const pr = Math.round(p.r);
      const pg = Math.round(p.g);
      const pb = Math.round(p.b);
      const alpha = p.projAlpha;

      // Draw as a single filled rectangle (much faster than 3 polygon faces)
      ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
      ctx.fillRect(p.screenX - s/2, p.screenY - s/2, s, s);
    }

    requestAnimationFrame(() => this.animate());
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Engine.init();
  Engine.animate();
});
