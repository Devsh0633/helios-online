import * as THREE from 'three';

const STYLE_ID = 'helios-online-warp-tunnel-style';
const STREAK_COUNT = 520;
const PARTICLE_COUNT = 720;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .helios-warp-tunnel {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity 220ms ease;
      overflow: hidden;
      z-index: 18;
    }

    .helios-warp-tunnel.visible {
      opacity: 1;
    }

    .helios-warp-tunnel canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .helios-warp-vignette,
    .helios-warp-flash,
    .helios-warp-caption {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .helios-warp-vignette {
      background:
        radial-gradient(circle at center, rgba(120, 198, 255, 0.02) 0%, rgba(40, 78, 150, 0.18) 35%, rgba(9, 10, 28, 0.76) 74%, rgba(1, 2, 8, 0.96) 100%);
      mix-blend-mode: screen;
    }

    .helios-warp-flash {
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.96) 0%, rgba(197, 225, 255, 0.82) 12%, rgba(133, 172, 255, 0.0) 42%);
      opacity: 0;
      transition: opacity 150ms ease;
    }

    .helios-warp-caption {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 0 24px 60px;
      color: #dff4ff;
      font-family: "Space Mono", "Consolas", monospace;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-size: 0.78rem;
      text-shadow: 0 0 18px rgba(56, 189, 248, 0.22);
      opacity: 0.92;
    }
  `;
  document.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
}

export default class WarpTunnelEffect {
  constructor(root) {
    ensureStyles();

    this.root = root;
    this.container = document.createElement('div');
    this.container.className = 'helios-warp-tunnel';

    this.vignette = document.createElement('div');
    this.vignette.className = 'helios-warp-vignette';

    this.flash = document.createElement('div');
    this.flash.className = 'helios-warp-flash';

    this.caption = document.createElement('div');
    this.caption.className = 'helios-warp-caption';
    this.caption.textContent = 'Warp vector charging';

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.pointerEvents = 'none';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 220);
    this.camera.position.set(0, 0, 22);

    this.streakGeometry = new THREE.BufferGeometry();
    this.streakPositions = new Float32Array(STREAK_COUNT * 2 * 3);
    this.streakGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(this.streakPositions, 3)
    );
    this.streakMaterial = new THREE.LineBasicMaterial({
      color: '#9ec9ff',
      transparent: true,
      opacity: 0.76,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.streaks = new THREE.LineSegments(this.streakGeometry, this.streakMaterial);
    this.streakMeta = [];

    for (let index = 0; index < STREAK_COUNT; index += 1) {
      this.streakMeta.push({
        radius: 1.6 + Math.random() * 12.8,
        angle: Math.random() * Math.PI * 2,
        depth: Math.random(),
        length: 0.8 + Math.random() * 4.8,
        wobble: Math.random() * Math.PI * 2
      });
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleColors = new Float32Array(PARTICLE_COUNT * 3);
    this.particleGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(this.particlePositions, 3)
    );
    this.particleGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(this.particleColors, 3)
    );
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleMeta = [];

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      this.particleMeta.push({
        radius: 0.6 + Math.random() * 8.4,
        angle: Math.random() * Math.PI * 2,
        depth: Math.random(),
        speed: 1 + Math.random() * 2.4
      });
    }

    this.scene.add(this.streaks);
    this.scene.add(this.particles);

    this.nearColor = new THREE.Color('#d0f0ff');
    this.farColor = new THREE.Color('#8b76ff');
    this.blendedColor = new THREE.Color();

    this.container.appendChild(this.renderer.domElement);
    this.container.appendChild(this.vignette);
    this.container.appendChild(this.flash);
    this.container.appendChild(this.caption);
    this.root.appendChild(this.container);

    this.elapsed = 0;
    this.progress = 0;
    this.duration = 3.6;
    this.active = false;
    this.visible = false;
    this.fadeOutRemaining = 0;
    this.fromLabel = '';
    this.toLabel = '';
    this.handleResize = this.handleResize.bind(this);
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  start({ fromLabel = 'Current position', toLabel = 'Target', duration = 3.6 } = {}) {
    this.elapsed = 0;
    this.progress = 0;
    this.duration = duration;
    this.active = true;
    this.visible = true;
    this.fadeOutRemaining = 0;
    this.fromLabel = fromLabel;
    this.toLabel = toLabel;
    this.caption.textContent = `Warping ${fromLabel} -> ${toLabel}`;
    this.flash.style.opacity = '0';
    this.container.classList.add('visible');
  }

  stop() {
    this.active = false;
    this.visible = false;
    this.progress = 0;
    this.fadeOutRemaining = 0;
    this.flash.style.opacity = '0';
    this.container.classList.remove('visible');
  }

  isActive() {
    return this.active;
  }

  handleResize() {
    const width = Math.max(this.root.clientWidth, window.innerWidth, 1);
    const height = Math.max(this.root.clientHeight, window.innerHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update(deltaSeconds) {
    if (!this.visible) {
      return;
    }

    this.elapsed += deltaSeconds;

    if (this.active) {
      this.progress = clamp(this.elapsed / Math.max(this.duration, 0.001), 0, 1);
    } else if (this.fadeOutRemaining <= 0) {
      this.progress = 0;
    }

    const acceleration = smoothstep(0, 0.6, this.progress);
    const deceleration = 1 - smoothstep(0.74, 1, this.progress);
    const intensity = clamp(acceleration * deceleration * 1.35 + 0.2, 0.12, 1.1);
    const streakSpeed = 24 + intensity * 60;

    for (let index = 0; index < STREAK_COUNT; index += 1) {
      const meta = this.streakMeta[index];
      const depth = ((this.elapsed * 0.5 * (1 + meta.depth) * streakSpeed) + meta.depth * 90) % 90;
      const zHead = 34 - depth;
      const zTail = zHead + meta.length * (1.3 + intensity * 3.6);
      const radius = meta.radius * (0.75 + intensity * 0.82);
      const angle = meta.angle + Math.sin(this.elapsed * 0.7 + meta.wobble) * 0.04;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const baseIndex = index * 6;

      this.streakPositions[baseIndex] = x;
      this.streakPositions[baseIndex + 1] = y;
      this.streakPositions[baseIndex + 2] = zHead;
      this.streakPositions[baseIndex + 3] = x * 0.85;
      this.streakPositions[baseIndex + 4] = y * 0.85;
      this.streakPositions[baseIndex + 5] = zTail;
    }

    this.streakGeometry.attributes.position.needsUpdate = true;
    this.streakMaterial.opacity = 0.32 + intensity * 0.56;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const meta = this.particleMeta[index];
      const stream = ((this.elapsed * meta.speed * (14 + intensity * 34)) + meta.depth * 48) % 48;
      const z = 20 - stream;
      const radius = meta.radius * (0.8 + intensity * 0.4);
      const angle = meta.angle + this.elapsed * 0.22;
      const positionIndex = index * 3;
      const colorIndex = index * 3;
      const blend = clamp(meta.depth * 0.8 + intensity * 0.25, 0, 1);
      const color = this.blendedColor.copy(this.nearColor).lerp(this.farColor, blend);

      this.particlePositions[positionIndex] = Math.cos(angle) * radius;
      this.particlePositions[positionIndex + 1] = Math.sin(angle) * radius;
      this.particlePositions[positionIndex + 2] = z;
      this.particleColors[colorIndex] = color.r;
      this.particleColors[colorIndex + 1] = color.g;
      this.particleColors[colorIndex + 2] = color.b;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleMaterial.opacity = 0.42 + intensity * 0.5;
    this.particleMaterial.size = 0.18 + intensity * 0.34;

    const vignetteOpacity = 0.22 + intensity * 0.58;
    this.vignette.style.opacity = String(vignetteOpacity);
    const flashWindow = smoothstep(0.9, 1, this.progress);
    this.flash.style.opacity = String(flashWindow * 0.95);

    if (this.active && this.progress >= 1) {
      this.active = false;
      this.fadeOutRemaining = 0.18;
      this.flash.style.opacity = '1';
    } else if (!this.active && this.fadeOutRemaining > 0) {
      this.fadeOutRemaining = Math.max(this.fadeOutRemaining - deltaSeconds, 0);
      this.vignette.style.opacity = String(this.fadeOutRemaining / 0.18);
      this.flash.style.opacity = String(this.fadeOutRemaining / 0.18);

      if (this.fadeOutRemaining <= 0) {
        this.stop();
      }
    }
  }

  render() {
    if (!this.visible) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
