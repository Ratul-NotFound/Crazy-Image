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
    this.stiffness = 0.07;
    this.friction = 0.82;
    
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
    // Particle position relative to face center
    const px = this.destX;
    const py = this.destY;

    // Apply 68-point Inverse Distance Weighting mesh deformation
    if (Engine.hasFaceDetected) {
      const warp = Engine.sampleDeformationGrid(px, py);
      targetX += warp.dx;
      targetY += warp.dy;
      targetZ += warp.dz;
      // Store color warp for rendering
      this.warpR = warp.dR;
      this.warpG = warp.dG;
      this.warpB = warp.dB;
    } else {
      this.warpR = 0;
      this.warpG = 0;
      this.warpB = 0;
    }

    // Procedural ambient animations (non-anatomical)
    if (activeExpression === 'breathe') {
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.015) * 8;
      targetX += Math.cos(time + this.destY * 0.01) * 2;
    } else if (activeExpression === 'glitch') {
      if (Math.random() < 0.005) this.x += (Math.random() - 0.5) * 30;
      if (Math.random() < 0.003) this.z += (Math.random() - 0.5) * 40;
    } else if (activeExpression === 'vortex') {
      const orbitRadius = Math.max(10, this.distFromCenter);
      const angle = time * 1.5 + this.distFromCenter * 0.005;
      targetX = Math.cos(angle) * orbitRadius;
      targetY = Math.sin(angle) * orbitRadius;
      targetZ = this.destZ * depthFactor + Math.sin(time * 3 + this.distFromCenter * 0.02) * 15;
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
  particleCount: 20000,
  particleSize: 1.6,
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
      // Crop tightly to face region — more particles on the face
      const box = detection.detection.box;
      const padX = box.width * 0.45;
      const padY = box.height * 0.4;
      cropX = Math.max(0, Math.round(box.x - padX));
      cropY = Math.max(0, Math.round(box.y - padY * 1.2)); // extra forehead
      cropW = Math.min(img.width - cropX, Math.round(box.width + padX * 2));
      cropH = Math.min(img.height - cropY, Math.round(box.height + padY * 2.4)); // extra chin
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
      (this.canvas.width / (window.devicePixelRatio || 1)) * 0.65 / tempWidth,
      (this.canvas.height / (window.devicePixelRatio || 1)) * 0.65 / tempHeight
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
      this.grid = null; // Force grid re-init with new face dimensions
      this.hasFaceDetected = true;

      // Helper to map a 68-point landmark to particle coordinates
      const mapPoint = (p) => ({
        x: ((p.x - cropX) / cropW - 0.5) * partW,
        y: ((p.y - cropY) / cropH - 0.5) * partH
      });
      
      const landmarks = detection.landmarks.positions;
      this.neutralLandmarks = landmarks.map(mapPoint);
      
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
      const noseTip = mapPoint(landmarks[30]);
      const noseBridge = mapPoint(landmarks[27]);
      const chin = mapPoint(landmarks[8]);
      const jawLeft = mapPoint(landmarks[4]);
      const jawRight = mapPoint(landmarks[12]);

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
      
      this.mouthW = Math.max((mouthRight - mouthLeft) * 1.3, this.faceWidth * 0.15);
      this.mouthH = Math.max((mouthBottom - mouthTop) * 1.8, this.faceHeight * 0.08);

      // Store landmark positions for anatomical depth sculpting
      this.noseTip = noseTip;
      this.noseBridge = noseBridge;
      this.chinPt = chin;
      this.jawLeft = jawLeft;
      this.jawRight = jawRight;
      this.leftEyePt = leftEye;
      this.rightEyePt = rightEye;

      console.log("Landmark mapping complete:", {
        leftEye, rightEye, mouth, noseTip,
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

    // Gaussian helper for depth sculpting
    const gaussXY = (px, py, cx, cy, sigma) => {
      const dx = px - cx, dy = py - cy;
      return Math.exp(-(dx*dx + dy*dy) / (2*sigma*sigma));
    };

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
        let faceCX = 0, faceCY = 0;
        if (detection) {
          faceCX = this.faceLeft + this.faceWidth / 2;
          faceCY = this.faceTop + this.faceHeight / 2;
          normX = (posX - faceCX) / (this.faceWidth / 2 || 1);
          normY = (posY - faceCY) / (this.faceHeight / 2 || 1);
        } else {
          normX = posX / (partW / 2 || 1);
          normY = posY / (partH / 2 || 1);
        }
        const distSq = normX * normX + normY * normY;
        const bulge = Math.max(0, 1.0 - distSq);
        
        let posZ = ((brightness - 128) / 128) * this.depthStrength * 0.5 + (bulge * this.depthStrength * 0.6);

        // --- ANATOMICAL DEPTH SCULPTING using 68 landmarks ---
        if (detection && this.noseTip) {
          const ds = this.depthStrength;
          const fW = this.faceWidth;
          
          // Nose protrudes the most — strong forward push
          const noseInf = gaussXY(posX, posY, this.noseTip.x, this.noseTip.y, fW * 0.10);
          posZ += noseInf * ds * 0.55;
          
          // Nose bridge ridge
          const bridgeInf = gaussXY(posX, posY, this.noseBridge.x, this.noseBridge.y, fW * 0.08);
          posZ += bridgeInf * ds * 0.35;
          
          // Eye sockets recede (negative depth)
          const leftEyeInf = gaussXY(posX, posY, this.leftEyePt.x, this.leftEyePt.y, fW * 0.08);
          const rightEyeInf = gaussXY(posX, posY, this.rightEyePt.x, this.rightEyePt.y, fW * 0.08);
          posZ -= (leftEyeInf + rightEyeInf) * ds * 0.25;
          
          // Forehead curves back gently
          const foreheadY = this.eyebrowY - this.faceHeight * 0.15;
          const foreheadInf = gaussXY(posX, posY, faceCX, foreheadY, fW * 0.30);
          posZ -= foreheadInf * ds * 0.15;
          
          // Cheekbones protrude
          const cheekLInf = gaussXY(posX, posY, this.jawLeft.x, this.leftEyePt.y + this.faceHeight * 0.1, fW * 0.12);
          const cheekRInf = gaussXY(posX, posY, this.jawRight.x, this.rightEyePt.y + this.faceHeight * 0.1, fW * 0.12);
          posZ += (cheekLInf + cheekRInf) * ds * 0.20;
          
          // Chin protrudes slightly
          const chinInf = gaussXY(posX, posY, this.chinPt.x, this.chinPt.y, fW * 0.10);
          posZ += chinInf * ds * 0.15;
        }
        
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

  initDeformationGrid() {
    this.gridCols = 30;
    this.gridRows = 30;
    this.gridChannels = 6; // dx, dy, dz, dR, dG, dB
    this.grid = new Float32Array(this.gridCols * this.gridRows * this.gridChannels);
    
    this.gridStartX = this.faceLeft - this.faceWidth * 0.55;
    this.gridStartY = this.faceTop - this.faceHeight * 0.55;
    this.gridWidth = this.faceWidth * 2.1;
    this.gridHeight = this.faceHeight * 2.1;
    this.gridStepX = this.gridWidth / (this.gridCols - 1);
    this.gridStepY = this.gridHeight / (this.gridRows - 1);
  },

  updateDeformationGrid(expression, mouthOpen, time) {
    if (!this.neutralLandmarks) return;
    
    // 1. Create target landmarks with color channels (dR, dG, dB = color tint shift)
    const targets = this.neutralLandmarks.map(p => ({ x: p.x, y: p.y, z: 0, dR: 0, dG: 0, dB: 0 }));
    const fW = this.faceWidth;
    const fH = this.faceHeight;
    
    // ============================================================
    // PIXEL-PERFECT EXPRESSION OFFSETS (boosted for visibility)
    // Each landmark: position (x,y,z) + color tint (dR,dG,dB)
    // dR/dG/dB: -30..+30 range, added to final RGB per pixel
    // ============================================================
    
    if (expression === 'smile') {
      // --- Mouth corners pull up and outward (strong) ---
      targets[48].y -= fH * 0.07; targets[48].x -= fW * 0.05;
      targets[54].y -= fH * 0.07; targets[54].x += fW * 0.05;
      targets[49].y -= fH * 0.05; targets[49].x -= fW * 0.03;
      targets[50].y -= fH * 0.035;
      targets[51].y -= fH * 0.025;
      targets[52].y -= fH * 0.035;
      targets[53].y -= fH * 0.05; targets[53].x += fW * 0.03;
      targets[55].y -= fH * 0.015; targets[55].x += fW * 0.02;
      targets[59].y -= fH * 0.015; targets[59].x -= fW * 0.02;
      // Inner mouth ring
      targets[60].y -= fH * 0.04; targets[60].x -= fW * 0.02;
      targets[61].y -= fH * 0.025;
      targets[62].y -= fH * 0.02;
      targets[63].y -= fH * 0.025;
      targets[64].y -= fH * 0.04; targets[64].x += fW * 0.02;
      targets[65].y -= fH * 0.01;
      targets[66].y -= fH * 0.01;
      targets[67].y -= fH * 0.01;
      
      // --- Cheeks push up strongly (nasolabial fold) ---
      targets[1].y -= fH * 0.015; targets[1].x -= fW * 0.008;
      targets[2].y -= fH * 0.025; targets[2].x -= fW * 0.012; targets[2].dR = 12; targets[2].dG = 4;
      targets[3].y -= fH * 0.02; targets[3].dR = 10; targets[3].dG = 3;
      targets[4].y -= fH * 0.01;
      targets[12].y -= fH * 0.01;
      targets[13].y -= fH * 0.02; targets[13].dR = 10; targets[13].dG = 3;
      targets[14].y -= fH * 0.025; targets[14].x += fW * 0.012; targets[14].dR = 12; targets[14].dG = 4;
      targets[15].y -= fH * 0.015; targets[15].x += fW * 0.008;
      
      // --- Duchenne eye squint ---
      targets[40].y -= fH * 0.02; targets[41].y -= fH * 0.02;
      targets[46].y -= fH * 0.02; targets[47].y -= fH * 0.02;
      targets[37].y += fH * 0.008; targets[38].y += fH * 0.008;
      targets[43].y += fH * 0.008; targets[44].y += fH * 0.008;
      
      // --- Nasolabial shadow ---
      targets[31].dR = -8; targets[31].dG = -8; targets[31].dB = -8;
      targets[35].dR = -8; targets[35].dG = -8; targets[35].dB = -8;
      // Nose bridge highlight
      targets[29].dR = 8; targets[29].dG = 8; targets[29].dB = 6;
      // Cheek warm highlight
      targets[30].dR = 5; targets[30].dG = 3;
      
    } else if (expression === 'surprise') {
      // --- Eyebrows raise high ---
      for(let i = 17; i <= 21; i++) { targets[i].y -= fH * 0.08; targets[i].dR = 6; targets[i].dG = 6; targets[i].dB = 5; }
      for(let i = 22; i <= 26; i++) { targets[i].y -= fH * 0.08; targets[i].dR = 6; targets[i].dG = 6; targets[i].dB = 5; }
      // Forehead wrinkle shadow
      targets[27].y -= fH * 0.03; targets[27].dR = -12; targets[27].dG = -12; targets[27].dB = -10;
      
      // --- Eyes widen significantly ---
      targets[37].y -= fH * 0.03; targets[38].y -= fH * 0.03;
      targets[43].y -= fH * 0.03; targets[44].y -= fH * 0.03;
      targets[40].y += fH * 0.015; targets[41].y += fH * 0.015;
      targets[46].y += fH * 0.015; targets[47].y += fH * 0.015;
      // Eye whites brighten
      targets[36].dR = 8; targets[36].dG = 8; targets[36].dB = 8;
      targets[39].dR = 8; targets[39].dG = 8; targets[39].dB = 8;
      targets[42].dR = 8; targets[42].dG = 8; targets[42].dB = 8;
      targets[45].dR = 8; targets[45].dG = 8; targets[45].dB = 8;
      
      // --- Jaw drops substantially ---
      for(let i = 5; i <= 11; i++) { targets[i].y += fH * 0.10; targets[i].z -= 8; targets[i].dR = -6; targets[i].dG = -6; targets[i].dB = -5; }
      targets[8].y += fH * 0.12; targets[8].z -= 10;
      
      // --- Mouth opens wide ---
      targets[51].y -= fH * 0.02;
      targets[57].y += fH * 0.09; targets[57].z -= 7;
      targets[56].y += fH * 0.07; targets[58].y += fH * 0.07;
      targets[55].y += fH * 0.06; targets[59].y += fH * 0.06;
      // Mouth interior deep shadow
      targets[62].dR = -20; targets[62].dG = -20; targets[62].dB = -18;
      targets[66].dR = -20; targets[66].dG = -20; targets[66].dB = -18;
      targets[61].dR = -15; targets[61].dG = -15; targets[61].dB = -12;
      targets[63].dR = -15; targets[63].dG = -15; targets[63].dB = -12;
      targets[65].dR = -18; targets[65].dG = -18; targets[65].dB = -15;
      targets[67].dR = -18; targets[67].dG = -18; targets[67].dB = -15;
      
    } else if (expression === 'angry') {
      // --- Brows pull down and inward (corrugator) ---
      targets[17].y += fH * 0.02; targets[17].x += fW * 0.015;
      targets[18].y += fH * 0.03; targets[18].x += fW * 0.02;
      targets[19].y += fH * 0.05; targets[19].x += fW * 0.035;
      targets[20].y += fH * 0.06; targets[20].x += fW * 0.04;
      targets[21].y += fH * 0.06; targets[21].x += fW * 0.04;
      targets[22].y += fH * 0.06; targets[22].x -= fW * 0.04;
      targets[23].y += fH * 0.06; targets[23].x -= fW * 0.04;
      targets[24].y += fH * 0.05; targets[24].x -= fW * 0.035;
      targets[25].y += fH * 0.03; targets[25].x -= fW * 0.02;
      targets[26].y += fH * 0.02; targets[26].x -= fW * 0.015;
      
      // Glabella deep furrow shadow
      targets[27].y += fH * 0.02; targets[27].dR = -25; targets[27].dG = -25; targets[27].dB = -20;
      targets[28].dR = -12; targets[28].dG = -12; targets[28].dB = -10;
      // Brow shadow
      for(let i = 19; i <= 24; i++) { targets[i].dR = -15; targets[i].dG = -18; targets[i].dB = -12; }
      
      // --- Eyes narrow aggressively ---
      targets[37].y += fH * 0.025; targets[38].y += fH * 0.025;
      targets[43].y += fH * 0.025; targets[44].y += fH * 0.025;
      targets[40].y -= fH * 0.02; targets[41].y -= fH * 0.02;
      targets[46].y -= fH * 0.02; targets[47].y -= fH * 0.02;
      // Eye area darkens
      targets[36].dR = -8; targets[36].dG = -10; targets[36].dB = -6;
      targets[39].dR = -8; targets[39].dG = -10; targets[39].dB = -6;
      targets[42].dR = -8; targets[42].dG = -10; targets[42].dB = -6;
      targets[45].dR = -8; targets[45].dG = -10; targets[45].dB = -6;
      
      // --- Lips tighten ---
      targets[48].y += fH * 0.008; targets[48].x += fW * 0.012;
      targets[54].y += fH * 0.008; targets[54].x -= fW * 0.012;
      targets[51].y += fH * 0.012;
      targets[57].y -= fH * 0.012;
      
      // --- Nostrils flare ---
      targets[31].x -= fW * 0.012; targets[35].x += fW * 0.012;
      targets[31].dR = -10; targets[31].dG = -10; targets[31].dB = -8;
      targets[35].dR = -10; targets[35].dG = -10; targets[35].dB = -8;
      
      // --- RED FLUSH on cheeks (anger) ---
      targets[2].dR = 18; targets[2].dG = -2; targets[2].dB = -4;
      targets[3].dR = 14; targets[3].dG = -1; targets[3].dB = -3;
      targets[13].dR = 14; targets[13].dG = -1; targets[13].dB = -3;
      targets[14].dR = 18; targets[14].dG = -2; targets[14].dB = -4;
      // Nose tip reddens
      targets[30].dR = 10; targets[30].dG = -2; targets[30].dB = -3;
      
    } else if (expression === 'sad') {
      // --- Mouth corners droop strongly ---
      targets[48].y += fH * 0.055; targets[48].x += fW * 0.008;
      targets[54].y += fH * 0.055; targets[54].x -= fW * 0.008;
      targets[49].y += fH * 0.035; targets[53].y += fH * 0.035;
      targets[55].y += fH * 0.02; targets[59].y += fH * 0.02;
      targets[57].y += fH * 0.015;
      targets[60].y += fH * 0.03; targets[64].y += fH * 0.03;
      // Mouth corner shadow
      targets[48].dR = -10; targets[48].dG = -10; targets[48].dB = -8;
      targets[54].dR = -10; targets[54].dG = -10; targets[54].dB = -8;
      
      // --- Inner brows raise (frontalis medialis) ---
      targets[20].y -= fH * 0.025; targets[20].x += fW * 0.008;
      targets[21].y -= fH * 0.045; targets[21].x += fW * 0.012;
      targets[22].y -= fH * 0.045; targets[22].x -= fW * 0.012;
      targets[23].y -= fH * 0.025; targets[23].x -= fW * 0.008;
      // Inner brow highlight
      targets[21].dR = 8; targets[21].dG = 8; targets[21].dB = 8;
      targets[22].dR = 8; targets[22].dG = 8; targets[22].dB = 8;
      // Outer brows droop
      targets[17].y += fH * 0.015; targets[26].y += fH * 0.015;
      targets[18].y += fH * 0.008; targets[25].y += fH * 0.008;
      
      // --- Eyes droop (heavy lids) ---
      targets[37].y += fH * 0.018; targets[38].y += fH * 0.018;
      targets[43].y += fH * 0.018; targets[44].y += fH * 0.018;
      // Under-eye BLUE shadow (sadness tint)
      targets[40].dR = -6; targets[40].dG = -4; targets[40].dB = 5;
      targets[41].dR = -6; targets[41].dG = -4; targets[41].dB = 5;
      targets[46].dR = -6; targets[46].dG = -4; targets[46].dB = 5;
      targets[47].dR = -6; targets[47].dG = -4; targets[47].dB = 5;
      
      // --- Chin dimple ---
      targets[8].y += fH * 0.008;
      targets[8].dR = -10; targets[8].dG = -10; targets[8].dB = -8;
      targets[7].dR = -6; targets[7].dG = -6; targets[7].dB = -5;
      targets[9].dR = -6; targets[9].dG = -6; targets[9].dB = -5;
      
      // --- Overall slight blue/cool tint ---
      targets[30].dR = -4; targets[30].dB = 3;
      targets[29].dR = -3; targets[29].dB = 2;
      
    } else if (expression === 'wink') {
      // --- Right eye closes firmly ---
      targets[43].y += fH * 0.045; targets[44].y += fH * 0.045;
      targets[46].y -= fH * 0.025; targets[47].y -= fH * 0.025;
      targets[42].y += fH * 0.015; targets[45].y += fH * 0.015;
      // Closed eye crease shadow
      targets[43].dR = -15; targets[43].dG = -15; targets[43].dB = -12;
      targets[44].dR = -15; targets[44].dG = -15; targets[44].dB = -12;
      targets[42].dR = -8; targets[42].dG = -8; targets[42].dB = -6;
      targets[45].dR = -8; targets[45].dG = -8; targets[45].dB = -6;
      
      // --- Right cheek pushes up ---
      targets[13].y -= fH * 0.02; targets[13].dR = 10; targets[13].dG = 6; targets[13].dB = 2;
      targets[14].y -= fH * 0.025; targets[14].dR = 12; targets[14].dG = 8; targets[14].dB = 3;
      targets[15].y -= fH * 0.015; targets[15].dR = 6; targets[15].dG = 4;
      
      // --- Left eye slight squint ---
      targets[40].y -= fH * 0.008; targets[41].y -= fH * 0.008;
      
      // --- Smirk (left corner up) ---
      targets[48].y -= fH * 0.035; targets[48].x -= fW * 0.015;
      targets[49].y -= fH * 0.02;
      targets[60].y -= fH * 0.02;
      targets[59].y -= fH * 0.01;
    }
    
    // Speech (mouth open)
    if (mouthOpen > 0) {
      for(let i = 5; i <= 11; i++) { 
        targets[i].y += fH * 0.06 * mouthOpen; 
        targets[i].z -= 5 * mouthOpen;
        targets[i].dR -= 5 * mouthOpen; targets[i].dG -= 5 * mouthOpen; targets[i].dB -= 4 * mouthOpen;
      }
      for(let i = 55; i <= 59; i++) { 
        targets[i].y += fH * 0.05 * mouthOpen; 
        targets[i].z -= 4 * mouthOpen;
      }
      targets[50].y -= fH * 0.008 * mouthOpen;
      targets[51].y -= fH * 0.012 * mouthOpen;
      targets[52].y -= fH * 0.008 * mouthOpen;
      // Deep mouth shadow
      targets[62].dR = -20 * mouthOpen; targets[62].dG = -20 * mouthOpen; targets[62].dB = -18 * mouthOpen;
      targets[66].dR = -20 * mouthOpen; targets[66].dG = -20 * mouthOpen; targets[66].dB = -18 * mouthOpen;
    }
    
    // ============================================================
    // 2. Compute IDW for each grid node (6 channels: dx, dy, dz, dR, dG, dB)
    // ============================================================
    let idx = 0;
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const gx = this.gridStartX + c * this.gridStepX;
        const gy = this.gridStartY + r * this.gridStepY;
        
        let dx = 0, dy = 0, dz = 0, dR = 0, dG = 0, dB = 0, wSum = 0;
        for (let i = 0; i < 68; i++) {
           const nl = this.neutralLandmarks[i];
           const tl = targets[i];
           const dSq = (gx - nl.x)**2 + (gy - nl.y)**2;
           const w = 1.0 / (dSq * dSq + 0.01); 
           dx += (tl.x - nl.x) * w;
           dy += (tl.y - nl.y) * w;
           dz += tl.z * w;
           dR += tl.dR * w;
           dG += tl.dG * w;
           dB += tl.dB * w;
           wSum += w;
        }
        this.grid[idx++] = dx / wSum;
        this.grid[idx++] = dy / wSum;
        this.grid[idx++] = dz / wSum;
        this.grid[idx++] = dR / wSum;
        this.grid[idx++] = dG / wSum;
        this.grid[idx++] = dB / wSum;
      }
    }
  },

  sampleDeformationGrid(px, py) {
    if (!this.grid) return { dx: 0, dy: 0, dz: 0, dR: 0, dG: 0, dB: 0 };
    
    const xRatio = (px - this.gridStartX) / this.gridStepX;
    const yRatio = (py - this.gridStartY) / this.gridStepY;
    
    if (xRatio < 0 || xRatio >= this.gridCols - 1 || yRatio < 0 || yRatio >= this.gridRows - 1) {
      return { dx: 0, dy: 0, dz: 0, dR: 0, dG: 0, dB: 0 };
    }
    
    const ch = this.gridChannels;
    const c0 = Math.floor(xRatio);
    const r0 = Math.floor(yRatio);
    const c1 = c0 + 1;
    const r1 = r0 + 1;
    
    const u = xRatio - c0;
    const v = yRatio - r0;
    
    const i00 = (r0 * this.gridCols + c0) * ch;
    const i10 = (r0 * this.gridCols + c1) * ch;
    const i01 = (r1 * this.gridCols + c0) * ch;
    const i11 = (r1 * this.gridCols + c1) * ch;
    
    const w00 = (1 - u) * (1 - v);
    const w10 = u * (1 - v);
    const w01 = (1 - u) * v;
    const w11 = u * v;
    
    return {
      dx: this.grid[i00]*w00 + this.grid[i10]*w10 + this.grid[i01]*w01 + this.grid[i11]*w11,
      dy: this.grid[i00+1]*w00 + this.grid[i10+1]*w10 + this.grid[i01+1]*w01 + this.grid[i11+1]*w11,
      dz: this.grid[i00+2]*w00 + this.grid[i10+2]*w10 + this.grid[i01+2]*w01 + this.grid[i11+2]*w11,
      dR: this.grid[i00+3]*w00 + this.grid[i10+3]*w10 + this.grid[i01+3]*w01 + this.grid[i11+3]*w11,
      dG: this.grid[i00+4]*w00 + this.grid[i10+4]*w10 + this.grid[i01+4]*w01 + this.grid[i11+4]*w11,
      dB: this.grid[i00+5]*w00 + this.grid[i10+5]*w10 + this.grid[i01+5]*w01 + this.grid[i11+5]*w11
    };
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

    // Update Deformation Grid (computes 68-point mesh warp for current expression)
    if (this.hasFaceDetected) {
      if (!this.grid) this.initDeformationGrid();
      this.updateDeformationGrid(this.activeExpression, this.mouthOpenScale, this.time);
    }

    // 1. Physics update & Camera projection
    const numParticles = this.particles.length;
    for (let i = 0; i < numParticles; i++) {
      const p = this.particles[i];
      p.update(this.mouse, this.mouseMode, this.mouseRadius, this.activeExpression, this.time, this.depthStrength, this.audioScale, this.mouthOpenScale);
      p.project(currentYaw, currentPitch, currentRoll, this.zoom, this.focalLength, width, height);
    }

    // 2. Depth sorting (Painter's Algorithm)
    this.particles.sort((a, b) => b.projZ - a.projZ);

    // 3. High-quality rendering with depth-based lighting + expression brightness
    const ctx = this.ctx;
    
    for (let i = 0; i < numParticles; i++) {
      const p = this.particles[i];
      
      // Skip off-screen particles
      if (p.screenX < -20 || p.screenX > width + 20 || p.screenY < -20 || p.screenY > height + 20) {
        continue;
      }

      const s = p.projSize;
      
      // Depth-based shading
      const depthShade = Math.max(0.4, Math.min(1.0, 0.7 + (p.projZ * -0.002)));
      
      // Per-pixel RGB color warp from expression grid
      const rShift = p.warpR || 0;
      const gShift = p.warpG || 0;
      const bShift = p.warpB || 0;
      
      const pr = Math.round(Math.min(255, Math.max(0, p.r * depthShade + rShift)));
      const pg = Math.round(Math.min(255, Math.max(0, p.g * depthShade + gShift)));
      const pb = Math.round(Math.min(255, Math.max(0, p.b * depthShade + bShift)));
      const alpha = p.projAlpha;

      ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
      
      if (s > 2.5) {
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, s * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.screenX - s/2, p.screenY - s/2, s, s);
      }
    }

    requestAnimationFrame(() => this.animate());
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Engine.init();
  Engine.animate();
});
