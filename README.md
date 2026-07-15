# Crazy Image: 3D Voxel Particle Portrait Experience

An interactive 3D voxel graphics experience built from scratch using HTML5 2D Canvas and Vanilla JavaScript. This engine takes any 2D image (drag-and-dropped or loaded by default), scans its pixel colors and grayscale luminance, and morphs it into a volumetric 3D head-like relief made of thousands of interactive shaded voxel cubes.

## Live Demo & Experience
- **Interactive Camera**: Move your mouse across the canvas to orbit and tilt the camera in 3D (parallax view).
- **Zoom Control**: Scroll the mouse wheel to zoom in and out.
- **3D Voxel Rendering**: Every pixel is rendered as a 3D block with top, left, and right faces.
- **Directional Shading**: A virtual light source projects shadows and highlights across the voxel faces as the model rotates.
- **Spherical Bulge Warp**: Flat pictures are automatically projected onto a 3D spherical dome to simulate the volume of a human head.
- **Live Expressions**: Transition the model between animated states:
  - 💨 **Breathe**: Slow, organic idle breathing motion.
  - ⚡ **Glitch**: Horizontal electronic digital glitch and color splits.
  - 🌀 **Vortex**: Sweeps particles into a 3D cyclone spiral.
  - 🌊 **Wave Ripple**: Concentric wave depth ripples.
  - 💥 **Shatter**: Blows particles outward in 3D space, which then pull back under spring tension.
- **Custom Image Upload**: Drag & drop any image into the side panel to morph the particles into the new picture.
- **Sound Reactivity**: Toggle the voice pulse to make the voxel cubes dance to your microphone input.

---

## Technical Details

### 1. 3D Voxel Graphics Engine
Rather than relying on heavy WebGL libraries like Three.js, this app uses a custom perspective projection matrix running directly on an HTML5 2D Canvas context. The voxel shape is drawn as three adjacent parallelograms offset by projected orthogonal axes $\vec{u}, \vec{v}, \vec{w}$ relative to the pixel's camera-rotated $(x, y, z)$ position:
$$scale = \frac{focalLength}{focalLength + Z_{rotated}}$$

### 2. Custom Lighting Shader
Each of the three visible faces is shaded using a dynamic dot product calculation with a global light vector $\vec{L} = (0.577, -0.577, 0.577)$:
$$\text{intensity}_k = 0.55 + 0.45 \cdot \left(\frac{\vec{axis}_{rotated} \cdot \vec{Light}}{axis\_length}\right)$$

---

## How to Run Locally

1. Clone this repository.
2. Spin up a local server to bypass browser CORS policies for image loading.
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with http-server installed)
   npx http-server
   ```
3. Open your browser and navigate to `http://localhost:8000`.

---

## Author
Created by [Ratul-NotFound](https://github.com/Ratul-NotFound). Powered by Antigravity AI.
