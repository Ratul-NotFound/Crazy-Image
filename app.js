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

  update(mouse, mouseMode, mouseRadius, activeExpression, time, depthStrength, audioScale) {
    let targetX = this.destX;
    let targetY = this.destY;
    let targetZ = this.destZ;

    // Adjust Z target based on the current depth slider configuration
    // The scanned z value is pre-normalized, so scale it dynamically
    const depthFactor = depthStrength / 80; // normalized to default 80
    targetZ = this.destZ * depthFactor;

    // ---- APPLY LIVE EXPRESSIONS ----
    if (activeExpression === 'breathe') {
      // Gentle, lifelike breathing motion using sinusoidal offsets
      targetZ += Math.sin(time * 2 + this.distFromCenter * 0.015) * 10;
      targetX += Math.cos(time + this.destY * 0.01) * 3;
    } else if (activeExpression === 'wave') {
      // Concentric wave ripple outwards from center
      const waveSpeed = 6;
      const waveFreq = 0.025;
      const waveAmp = 25;
      targetZ += Math.sin(time * waveSpeed - this.distFromCenter * waveFreq) * waveAmp;
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
  project(yaw, pitch, zoom, focalLength, width, height) {
    // 3D rotation matrix around Y (yaw)
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    let x1 = this.x * cosY - this.z * sinY;
    let z1 = this.x * sinY + this.z * cosY;

    // 3D rotation matrix around X (pitch)
    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);
    let y2 = this.y * cosX - z1 * sinX;
    let z2 = this.y * sinX + z1 * cosX;

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
  zoom: 1.1,
  targetYaw: 0,
  targetPitch: 0,
  targetZoom: 1.1,
  focalLength: 500,

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
    });

    // Touch support for mobiles
    canvasWrap.addEventListener('touchmove', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
    });
    canvasWrap.addEventListener('touchstart', (e) => {
      const pos = getCanvasMousePos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
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

    // Smoothly interpolate camera yaw and pitch
    this.yaw += (this.targetYaw - this.yaw) * 0.08;
    this.pitch += (this.targetPitch - this.pitch) * 0.08;
    this.zoom += (this.targetZoom - this.zoom) * 0.08;

    // Audio FFT processing
    if (this.audioReact && this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const avg = sum / this.dataArray.length;
      // Scale dynamic response strength
      this.audioScale = avg / 255;
    } else {
      this.audioScale = 0;
    }

    // Update color states
    this.updateColors();

    // 1. Physics update & Camera projection
    const numParticles = this.particles.length;
    for (let i = 0; i < numParticles; i++) {
      const p = this.particles[i];
      p.update(this.mouse, this.mouseMode, this.mouseRadius, this.activeExpression, this.time, this.depthStrength, this.audioScale);
      p.project(this.yaw, this.pitch, this.zoom, this.focalLength, width, height);
    }

    // 2. Depth sorting (Painter's Algorithm)
    // Draw further particles (larger projected Z depth in screen coords) first,
    // so closer particles draw on top of them.
    this.particles.sort((a, b) => b.projZ - a.projZ);

    // 3. 3D Voxel/Cube Axis Rotations & Lighting Calculations
    const size = this.particleSize;
    const d = size; // half-side size

    // Cache cos/sin values for camera rotation
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const cosX = Math.cos(this.pitch);
    const sinX = Math.sin(this.pitch);

    // Rotated X unit axis u = (d, 0, 0)
    const uRot = {
      x: d * cosY,
      y: -d * sinY * sinX,
      z: d * sinY * cosX
    };

    // Rotated Y unit axis v = (0, d, 0)
    const vRot = {
      x: 0,
      y: d * cosX,
      z: d * sinX
    };

    // Rotated Z unit axis w = (0, 0, d)
    const wRot = {
      x: -d * sinY,
      y: -d * cosY * sinX,
      z: d * cosY * cosX
    };

    // Directional light vector pointing from top-right-front in 3D
    const Lx = 0.577;
    const Ly = -0.577;
    const Lz = 0.577;

    // Face shading intensities: dot product of light vector with normal vectors of three faces
    // Normals are uRot, vRot, wRot (all length d). We divide by d to normalize.
    // Base ambient light is 0.55, diffuse is 0.45
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
      const scaleFactor = (p.projSize / p.size) * (1 + this.audioScale * 2.0);

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
