// 3D Interactive Particle Portrait Engine
// Antigravity AI Engine

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
    // The scanned z value is pre-normalized, so scale it dynamically
    const depthFactor = depthStrength / 80; // normalized to default 80
    targetZ = this.destZ * depthFactor;

    // ---- APPLY LIVE EXPRESSIONS ----
    const faceW = Engine.faceWidth || 300;
    const faceH = Engine.faceHeight || 300;

    const eyeY = -faceH * 0.12;
    const leftEyeX = -faceW * 0.18;
    const rightEyeX = faceW * 0.18;
    const eyeRad = faceW * 0.09;

    const eyebrowY = -faceH * 0.22;
    const mouthY = faceH * 0.18;
    const mouthW = faceW * 0.22;
    const mouthH = faceH * 0.08;

    if (activeExpression === 'breathe') {
      // Gentle, lifelike breathing motion using sinusoidal offsets
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.015) * 10;
      targetX += Math.cos(time + this.destY * 0.01) * 3;
    } else if (activeExpression === 'smile') {
      // Smile: Pull corners of mouth upwards and outwards
      const dxMouth = this.destX;
      const dyMouth = this.destY - mouthY;
      if (Math.abs(dxMouth) < mouthW && Math.abs(dyMouth) < mouthH) {
        const xRatio = dxMouth / mouthW; // -1 to 1
        const lift = -Math.pow(xRatio, 2) * (faceH * 0.065); // curve up
        const stretch = xRatio * (faceW * 0.03); // pull corners out
        targetY += lift;
        targetX += stretch;
        targetZ += Math.abs(xRatio) * 6; // push cheeks out in 3D
      }
      // Gentle breathe overlay
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;
    } else if (activeExpression === 'wink') {
      // Wink: Close the right eye by collapsing it vertically
      const dxEye = this.destX - rightEyeX;
      const dyEye = this.destY - eyeY;
      if (dxEye * dxEye + dyEye * dyEye < eyeRad * eyeRad) {
        targetY = eyeY + dyEye * 0.12;
        targetZ -= 4; // push eyelid back slightly
      }
      // Gentle breathe overlay
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;
    } else if (activeExpression === 'surprise') {
      // Surprise: Open mouth (jaw down) and raise eyebrows
      const dxMouth = this.destX;
      const dyMouth = this.destY - mouthY;
      if (Math.abs(dxMouth) < mouthW && Math.abs(dyMouth) < mouthH) {
        if (this.destY < mouthY) {
          targetY -= faceH * 0.02;
        } else {
          targetY += faceH * 0.07;
        }
        targetX *= 0.95; // narrow mouth
      }
      // Eyebrows up
      if (Math.abs(this.destX) < faceW * 0.3 && this.destY < eyebrowY + 15 && this.destY > eyebrowY - 15) {
        targetY -= faceH * 0.05;
      }
      // Gentle breathe overlay
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;
    } else if (activeExpression === 'angry') {
      // Angry: Pull eyebrows down and together, tighten mouth
      if (Math.abs(this.destX) < faceW * 0.3 && this.destY < eyebrowY + 15 && this.destY > eyebrowY - 15) {
        targetY += faceH * 0.035;
        targetX += (this.destX > 0 ? -1 : 1) * (faceW * 0.025);
      }
      // Tight mouth
      const dxMouth = this.destX;
      const dyMouth = this.destY - mouthY;
      if (Math.abs(dxMouth) < mouthW && Math.abs(dyMouth) < mouthH) {
        targetY = mouthY + dyMouth * 0.4;
      }
      // Gentle breathe overlay
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.01) * 4;
    } else if (activeExpression === 'sad') {
      // Sad: Pull mouth corners down, raise inner eyebrows
      const dxMouth = this.destX;
      const dyMouth = this.destY - mouthY;
      if (Math.abs(dxMouth) < mouthW && Math.abs(dyMouth) < mouthH) {
        const xRatio = dxMouth / mouthW;
        const droop = Math.pow(xRatio, 2) * (faceH * 0.045);
        targetY += droop;
      }
      // Inner eyebrows up, outer eyebrows down
      if (Math.abs(this.destX) < faceW * 0.3 && this.destY < eyebrowY + 15 && this.destY > eyebrowY - 15) {
        const xRatio = Math.abs(this.destX) / (faceW * 0.3);
        const lift = (1 - xRatio) * (faceH * 0.035) - xRatio * (faceH * 0.01);
        targetY -= lift;
      }
      // Gentle breathe overlay
    } else if (activeExpression === 'glitch') {
      // Electronic digital glitching (horizontal jumps and color splits)
      if (Math.random() < 0.005) {
        this.x += (Math.random() - 0.5) * 30;
      }
      if (Math.random() < 0.003) {
        this.z += (Math.random() - 0.5) * 40;
      }
    } else if (activeExpression === 'vortex') {
      // Orbiting around Z-axis forming a 3D cyclone
      const orbitRadius = Math.max(10, this.distFromCenter);
      const angle = time * 1.5 + this.distFromCenter * 0.005;
      targetX = Math.cos(angle) * orbitRadius;
      targetY = Math.sin(angle) * orbitRadius;
      targetZ = this.destZ * depthFactor + Math.sin(time * 3 + this.distFromCenter * 0.02) * 15;
    }

    // ---- JAW SPEAK MOVEMENT ----
    if (mouthOpenScale > 0) {
      const dxMouth = this.destX;
      const dyMouth = this.destY - mouthY;
      if (Math.abs(dxMouth) < mouthW && Math.abs(dyMouth) < mouthH) {
        if (this.destY >= mouthY) {
          // Lower jaw/lip goes down
          targetY += mouthOpenScale * (faceH * 0.06);
          targetZ += mouthOpenScale * 4; // jut jaw slightly forward
        } else {
          // Upper lip moves up slightly
          targetY -= mouthOpenScale * (faceH * 0.015);
        }
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
        const force = (mouseRadius - dist) / mouseRadius; // 0 to 1

        if (mouseMode === 'repel') {
          // Push particles away (Z goes forwards, X & Y push out)
          const angle = Math.atan2(dy, dx);
          this.vx += Math.cos(angle) * force * 6;
          this.vy += Math.sin(angle) * force * 6;
          this.vz += force * 12; // push forward in 3D depth
        } else if (mouseMode === 'attract') {
          // Pull particles in
          const angle = Math.atan2(dy, dx);
          this.vx -= Math.cos(angle) * force * 5;
          this.vy -= Math.sin(angle) * force * 5;
          this.vz -= force * 10;
        } else if (mouseMode === 'swirl') {
          // Tangential swirl force
          const angle = Math.atan2(dy, dx) + Math.PI / 2;
          this.vx += Math.cos(angle) * force * 6;
          this.vy += Math.sin(angle) * force * 6;
        }
      }
    }

    // ---- AUDIO REACTIVITY ----
    if (audioScale > 0) {
      // Microphone frequencies drive turbulence and slight size scaling
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
    // 3D rotation matrix around Z (roll)
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    let rx = this.x * cosR - this.y * sinR;
    let ry = this.x * sinR + this.y * cosR;

    // 3D rotation matrix around Y (yaw)
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    let x1 = rx * cosY - this.z * sinY;
    let z1 = rx * sinY + this.z * cosY;

    // 3D rotation matrix around X (pitch)
    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);
    let y2 = ry * cosX - z1 * sinX;
    let z2 = ry * sinX + z1 * cosX;

    // Perspective scale calculation
    const perspectiveScale = focalLength / (focalLength + z2);
    
    // Final 2D Screen projection
    this.screenX = width / 2 + x1 * perspectiveScale * zoom;
    this.screenY = height / 2 + y2 * perspectiveScale * zoom;
    
    // Depth Cueing (Z-Sorting depth)
    this.projZ = z2; 
    
    // Scale size and opacity based on Z depth
    this.projSize = Math.max(0.1, this.size * perspectiveScale * zoom);
    
    // Depth fog: particles far away are darker, close ones are bright
    const fogStart = -200;
    const fogEnd = 300;
    let alpha = 1 - (z2 - fogStart) / (fogEnd - fogStart);
    this.projAlpha = Math.max(0.15, Math.min(1, alpha));
  }

  // Linear color interpolation
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

  init() {
    this.canvas = document.getElementById('particleCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.resizeCanvas();
    this.setupEventListeners();
    this.setupControlsUI();
    
    // Load default demo portrait
    this.loadImage('portrait.png');
  },

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.parentElement.clientWidth * dpr;
    this.canvas.height = this.canvas.parentElement.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    
    // Adjust mouse interaction radius relative to size
    this.mouseRadius = Math.min(this.canvas.width, this.canvas.height) / (6 * dpr);
  },

  loadImage(src) {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.loadedImage = img;
      this.scanImage();
      document.getElementById('loadingOverlay').classList.add('hidden');
    };
    img.onerror = () => {
      // In case default image fails, generate a fallback circular design
      console.warn("Could not load image, building procedural face outline.");
      this.generateFallbackPattern();
      document.getElementById('loadingOverlay').classList.add('hidden');
    };
    img.src = src;
  },

  scanImage() {
    if (!this.loadedImage) return;

    // Create a temporary thumbnail canvas to downsample pixel grid
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Scale image down so we read roughly the targeted number of pixels
    const aspect = this.loadedImage.width / this.loadedImage.height;
    
    // Calculate grid dimensions based on target particle count
    // width * height ~ particleCount, and width/height = aspect
    const tempHeight = Math.round(Math.sqrt(this.particleCount / aspect));
    const tempWidth = Math.round(tempHeight * aspect);
    
    tempCanvas.width = tempWidth;
    tempCanvas.height = tempHeight;
    
    // Draw image onto thumbnail canvas
    tempCtx.drawImage(this.loadedImage, 0, 0, tempWidth, tempHeight);
    
    const imgData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);
    const data = imgData.data;
    
    const newTargets = [];
    
    // Compute pixel scale to draw particles at correct proportion
    const scale = Math.min(
      (this.canvas.width / (window.devicePixelRatio || 1)) * 0.55 / tempWidth,
      (this.canvas.height / (window.devicePixelRatio || 1)) * 0.55 / tempHeight
    );

    this.faceWidth = tempWidth * scale;
    this.faceHeight = tempHeight * scale;

    for (let y = 0; y < tempHeight; y++) {
      for (let x = 0; x < tempWidth; x++) {
        const idx = (y * tempWidth + x) * 4;
        const alpha = data[idx + 3];
        
        // Skip fully transparent pixels
        if (alpha < 50) continue;
        
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Grayscale brightness representation for depth displacement
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Center coordinates around (0, 0, 0)
        const posX = (x - tempWidth / 2) * scale;
        const posY = (y - tempHeight / 2) * scale;
        
        // Calculate normalized distance from center (from 0 to 1) for spherical bulge
        const normX = posX / ((tempWidth * scale) / 2 || 1);
        const normY = posY / ((tempHeight * scale) / 2 || 1);
        const distSq = normX * normX + normY * normY;
        const bulge = Math.max(0, 1.0 - distSq); // dome shape
        
        // Map brightness to depth Z coordinate, combined with the spherical bulge
        // This gives flat pictures a real 3D head-like roundness!
        const posZ = ((brightness - 128) / 128) * this.depthStrength * 0.7 + (bulge * this.depthStrength * 0.8);
        
        newTargets.push({ x: posX, y: posY, z: posZ, r: r, g: g, b: b });
      }
    }

    // Shuffle targets to scatter the particles during morphing transition
    for (let i = newTargets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = newTargets[i];
      newTargets[i] = newTargets[j];
      newTargets[j] = temp;
    }

    const currentLen = this.particles.length;
    const targetLen = newTargets.length;
    const minLen = Math.min(currentLen, targetLen);

    // Reposition current particles to new locations
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
      // Discard excess particles
      this.particles = this.particles.slice(0, targetLen);
    } else if (currentLen < targetLen) {
      // Bud/Split new particles from random existing particle spots
      for (let i = currentLen; i < targetLen; i++) {
        const t = newTargets[i];
        let startX = t.x;
        let startY = t.y;
        let startZ = t.z;

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

  // Fallback in case of local load or CORS errors
  generateFallbackPattern() {
    this.particles = [];
    const size = Math.min(this.canvas.width, this.canvas.height) / (window.devicePixelRatio || 1) * 0.3;
    this.faceWidth = size * 2;
    this.faceHeight = size * 2;
    
    // Generate a simple procedural mesh resembling a holographic face mask
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      // Ellipsoid approximation of a face
      const posX = size * 0.8 * Math.sin(phi) * Math.cos(theta);
      const posY = size * 1.1 * Math.sin(phi) * Math.sin(theta);
      let posZ = size * 0.8 * Math.cos(phi);
      
      // Dent the eye orbits and mouth to make it look structural
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

    // Hover & interaction coordinate trackers
    canvasWrap.addEventListener('mousemove', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.idleTime = 0; // Reset idle timer

      // Camera tilt parallax effect when not dragging
      if (!this.mouse.isDragging) {
        const normX = (pos.x / (this.canvas.width / dpr)) - 0.5;
        const normY = (pos.y / (this.canvas.height / dpr)) - 0.5;
        this.targetYaw = normX * 0.8;
        this.targetPitch = -normY * 0.8;
      } else {
        // Orbit mode dragging
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
      this.idleTime = 0; // Reset idle timer
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDragging = false;
    });

    canvasWrap.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
      // Reset tilt slowly
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.targetRoll = 0;
    });

    // Touch support for mobiles
    canvasWrap.addEventListener('touchmove', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.idleTime = 0; // Reset idle timer
    });
    canvasWrap.addEventListener('touchstart', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.idleTime = 0; // Reset idle timer
    });
    canvasWrap.addEventListener('touchend', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    // Scroll to Zoom camera
    canvasWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetZoom -= e.deltaY * 0.0008;
      this.targetZoom = Math.max(0.4, Math.min(2.5, this.targetZoom));
      this.idleTime = 0; // Reset idle timer
    }, { passive: false });

    // Handle Window Resize
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

    // 2. Expressions
    const exprButtons = document.querySelectorAll('.expr-btn');
    exprButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        exprButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeExpression = btn.dataset.expr;
        
        // Explode triggers a sudden force burst in velocities
        if (this.activeExpression === 'explode') {
          this.triggerExplosion();
        }
      });
    });

    // 3. Avatar Gestures
    const gestureButtons = document.querySelectorAll('.gesture-btn');
    gestureButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const gestureName = btn.dataset.gesture;
        this.triggerGesture(gestureName);
      });
    });

    // 3. Color Themes
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.colorTheme = btn.dataset.color;
      });
    });

    // 4. Sliders
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

    // 5. Radio Buttons (Mouse Interaction)
    const radios = document.getElementsByName('mouseMode');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.mouseMode = e.target.value;
      });
    });

    // 6. Audio React
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

    // Reset color theme buttons in UI
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
      if (btn.dataset.color === 'original') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Reset expression buttons in UI
    const exprButtons = document.querySelectorAll('.expr-btn');
    exprButtons.forEach(btn => {
      if (btn.dataset.expr === 'breathe') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  handleFile(file) {
    if (!file.type.match('image.*')) return;
    this.resetUIStates(); // Automatically restore default original colors and breathing movement
    const reader = new FileReader();
    reader.onload = (e) => {
      this.loadImage(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  triggerGesture(name) {
    this.activeGesture = name;
    this.gestureTimer = 0;
    this.gestureDuration = name === 'tilt' ? 2.5 : 2.0; // seconds
  },

  triggerExplosion() {
    this.particles.forEach(p => {
      // Explode outwards in random 3D vectors
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
    
    // Theme color algorithms mapping coordinates to styling palettes
    for (let i = 0; i < num; i++) {
      const p = this.particles[i];
      let tr = p.origR;
      let tg = p.origG;
      let tb = p.origB;

      switch(this.colorTheme) {
        case 'cyberpunk':
          // Gradient between Neon Pink and Cyber Cyan along X axis
          const ratioX = (p.destX + 150) / 300;
          tr = Math.round(255 * (1 - ratioX) + 0 * ratioX);
          tg = Math.round(0 * (1 - ratioX) + 242 * ratioX);
          tb = Math.round(127 * (1 - ratioX) + 254 * ratioX);
          break;
        case 'hologram':
          // Pure Holographic Cyan, brightness mapped to Z coordinate
          const ratioZ = (p.z + 50) / 100;
          tr = Math.round(0 * ratioZ);
          tg = Math.round(242 * Math.max(0.4, ratioZ));
          tb = Math.round(254 * Math.max(0.6, ratioZ));
          break;
        case 'aurora':
          // Aurora Green-Gold based on distance from center
          const ratioD = Math.min(1, p.distFromCenter / 200);
          tr = Math.round(255 * (1 - ratioD) + 0 * ratioD);
          tg = Math.round(215 * (1 - ratioD) + 255 * ratioD);
          tb = Math.round(0 * (1 - ratioD) + 135 * ratioD);
          break;
        case 'inferno':
          // Firestorm Red, Yellow, Orange based on Z displacement
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
        default:
          // 'original' - do nothing, already set
          break;
      }

      // Smooth color transitions
      p.lerpColor(tr, tg, tb, 0.1);
    }
  },

  animate() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, width, height);

    this.time += 0.01;

    // Increment idle timer (approx 60fps delta)
    this.idleTime += 0.016;

    // Trigger slow camera looking-around movements when idle
    if (this.idleTime > 4.0) {
      this.targetYaw = Math.sin(this.time * 0.4) * 0.22;
      this.targetPitch = Math.cos(this.time * 0.3) * 0.12;
      this.targetRoll = Math.sin(this.time * 0.25) * 0.06;

      // Randomly trigger standard gestures during idle (nod or tilt head)
      if (Math.random() < 0.0015 && this.activeGesture === 'none') {
        this.triggerGesture(Math.random() < 0.5 ? 'nod' : 'tilt');
      }
    } else {
      this.targetRoll = 0; // lock roll when mouse moves
    }

    // Smoothly interpolate camera yaw, pitch, and roll
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
      const avg = sum / this.dataArray.length;
      this.audioScale = avg / 255;
    } else {
      this.audioScale = 0;
    }

    // Compute active gesture offsets and mouth speaker scaling
    let yawOffset = 0;
    let pitchOffset = 0;
    let rollOffset = 0;

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

    // Connect voice/sound pulse to mouth opening
    if (this.audioReact) {
      this.mouthOpenScale = Math.min(1.0, this.audioScale * 3.5);
    } else if (this.activeGesture !== 'speak') {
      this.mouthOpenScale = 0;
    }

    // Update color states
    this.updateColors();

    // Combined angles for projection and voxel rotations
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

    // 3. 3D Voxel/Cube Axis Rotations & Lighting Calculations
    const size = this.particleSize;
    const d = size; // half-side size

    // Helper rotation function for unit axes
    const rotate3D = (x, y, z, yaw, pitch, roll) => {
      const cosR = Math.cos(roll);
      const sinR = Math.sin(roll);
      const rx = x * cosR - y * sinR;
      const ry = x * sinR + y * cosR;

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = rx * cosY - z * sinY;
      const z1 = rx * sinY + z * cosY;

      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      const y2 = ry * cosX - z1 * sinX;
      const z2 = ry * sinX + z1 * cosX;
      return { x: x1, y: y2, z: z2 };
    };

    // Rotated unit axes
    const uRot = rotate3D(d, 0, 0, currentYaw, currentPitch, currentRoll);
    const vRot = rotate3D(0, d, 0, currentYaw, currentPitch, currentRoll);
    const wRot = rotate3D(0, 0, d, currentYaw, currentPitch, currentRoll);

    // Directional light vector pointing from top-right-front in 3D
    const Lx = 0.577;
    const Ly = -0.577;
    const Lz = 0.577;

    // Face shading intensities: dot product of light vector with normal vectors of three faces
    const intensityZ = Math.max(0.2, Math.min(1.0, 0.55 + 0.45 * (wRot.x * Lx + wRot.y * Ly + wRot.z * Lz) / d));
    const intensityX = Math.max(0.2, Math.min(1.0, 0.55 + 0.45 * (uRot.x * Lx + uRot.y * Ly + uRot.z * Lz) / d));
    const intensityY = Math.max(0.2, Math.min(1.0, 0.55 + 0.45 * (vRot.x * Lx + vRot.y * Ly + vRot.z * Lz) / d));

    // 4. Render projected particles as 3D Voxel Cubes
    for (let i = 0; i < numParticles; i++) {
      const p = this.particles[i];
      // Skip drawing if particle has fallen off screen boundaries
      if (p.screenX < -20 || p.screenX > width + 20 || p.screenY < -20 || p.screenY > height + 20) {
        continue;
      }

      // Calculate scale factor incorporating camera zoom and perspective depth
      const scaleFactor = (p.projSize / p.size);

      // Project the rotated half-axes to screen space
      const du = { x: uRot.x * scaleFactor, y: uRot.y * scaleFactor };
      const dv = { x: vRot.x * scaleFactor, y: vRot.y * scaleFactor };
      const dw = { x: wRot.x * scaleFactor, y: wRot.y * scaleFactor };

      // Calculate screen start corner to center the cube around p.screenX, p.screenY
      const startX = p.screenX - (du.x + dv.x + dw.x) / 2;
      const startY = p.screenY - (du.y + dv.y + dw.y) / 2;

      // Color with depth fog
      const pr = Math.round(p.r);
      const pg = Math.round(p.g);
      const pb = Math.round(p.b);
      const alpha = p.projAlpha;

      // Draw the three visible faces of the 3D Voxel Cube:
      
      // Face 1 (Z-face / Top-like): color modulated by intensityZ
      this.ctx.fillStyle = `rgba(${Math.round(pr * intensityZ)}, ${Math.round(pg * intensityZ)}, ${Math.round(pb * intensityZ)}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX + du.x, startY + du.y);
      this.ctx.lineTo(startX + du.x + dv.x, startY + du.y + dv.y);
      this.ctx.lineTo(startX + dv.x, startY + dv.y);
      this.ctx.closePath();
      this.ctx.fill();

      // Face 2 (X-face / Left-like): color modulated by intensityX
      this.ctx.fillStyle = `rgba(${Math.round(pr * intensityX)}, ${Math.round(pg * intensityX)}, ${Math.round(pb * intensityX)}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX + dv.x, startY + dv.y);
      this.ctx.lineTo(startX + dv.x + dw.x, startY + dv.y + dv.y);
      this.ctx.lineTo(startX + dw.x, startY + dw.y);
      this.ctx.closePath();
      this.ctx.fill();

      // Face 3 (Y-face / Right-like): color modulated by intensityY
      this.ctx.fillStyle = `rgba(${Math.round(pr * intensityY)}, ${Math.round(pg * intensityY)}, ${Math.round(pb * intensityY)}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX + dw.x, startY + dw.y);
      this.ctx.lineTo(startX + dw.x + du.x, startY + dw.y + du.y);
      this.ctx.lineTo(startX + du.x, startY + du.y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Engine.init();
  Engine.animate();
});
