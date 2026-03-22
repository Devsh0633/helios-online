import * as THREE from 'three';

import { SURFACE_HAZARDS } from '../surface/HazardSystem.js';
import {
  AU_KM,
  BELT_CONFIGS,
  PLANETARY_DATA,
  SCALE_AU_TO_UNITS,
  clamp
} from '../utils/Constants.js';

const STYLE_ID = 'helios-online-system-map-style';
const UNITS_TO_KM = AU_KM / SCALE_AU_TO_UNITS;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .helios-system-map {
      position: absolute;
      inset: 0;
      display: none;
      pointer-events: auto;
      z-index: 16;
      color: #e5f6ff;
      font-family: "Space Mono", "Consolas", monospace;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background:
        radial-gradient(circle at center, rgba(14, 30, 58, 0.58) 0%, rgba(5, 11, 25, 0.88) 48%, rgba(1, 3, 8, 0.97) 100%);
      backdrop-filter: blur(12px);
    }

    .helios-system-map.visible {
      display: block;
    }

    .helios-system-map * {
      box-sizing: border-box;
    }

    .helios-system-map::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(56, 189, 248, 0.06), transparent 18%),
        repeating-linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.02) 0,
          rgba(255, 255, 255, 0.02) 1px,
          transparent 1px,
          transparent 5px
        );
      pointer-events: none;
      mix-blend-mode: screen;
      opacity: 0.4;
    }

    .helios-system-map-canvas {
      position: absolute;
      inset: 0;
    }

    .helios-system-map-canvas canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .helios-system-map-header,
    .helios-system-map-panel,
    .helios-system-map-footer {
      position: absolute;
      z-index: 1;
      border: 1px solid rgba(56, 189, 248, 0.26);
      background: linear-gradient(180deg, rgba(5, 14, 26, 0.88), rgba(4, 11, 20, 0.72));
      box-shadow:
        0 0 0 1px rgba(56, 189, 248, 0.04),
        0 18px 48px rgba(0, 0, 0, 0.34),
        inset 0 0 34px rgba(56, 189, 248, 0.08);
      border-radius: 18px;
      overflow: hidden;
    }

    .helios-system-map-header {
      top: 18px;
      left: 18px;
      right: 18px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .helios-system-map-filters {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .helios-system-map-filter,
    .helios-system-map-button {
      border: 1px solid rgba(56, 189, 248, 0.22);
      background: rgba(10, 22, 39, 0.72);
      color: #b9ebff;
      padding: 9px 13px;
      border-radius: 999px;
      font: inherit;
      cursor: pointer;
      transition: transform 140ms ease, border-color 140ms ease, opacity 140ms ease;
    }

    .helios-system-map-filter:hover,
    .helios-system-map-button:hover {
      transform: translateY(-1px);
      border-color: rgba(56, 189, 248, 0.44);
    }

    .helios-system-map-filter.active,
    .helios-system-map-button.primary {
      color: #effcff;
      border-color: rgba(56, 189, 248, 0.58);
      background: linear-gradient(180deg, rgba(17, 54, 83, 0.9), rgba(8, 26, 42, 0.86));
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.12);
    }

    .helios-system-map-button:disabled,
    .helios-system-map-filter:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      transform: none;
    }

    .helios-system-map-panel {
      top: 98px;
      right: 18px;
      width: min(360px, calc(100vw - 36px));
      padding: 18px;
    }

    .helios-system-map-panel .caption,
    .helios-system-map-header .caption,
    .helios-system-map-footer .caption {
      font-size: 0.68rem;
      color: rgba(145, 224, 255, 0.76);
    }

    .helios-system-map-panel .value,
    .helios-system-map-header .value,
    .helios-system-map-footer .value {
      color: #f3fcff;
    }

    .helios-system-map-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.55rem 0.75rem;
      margin-top: 1rem;
      font-size: 0.78rem;
    }

    .helios-system-map-footer {
      left: 18px;
      right: 18px;
      bottom: 18px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .helios-system-map-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .helios-system-map-title {
      display: flex;
      flex-direction: column;
      gap: 0.42rem;
    }

    .helios-system-map-title .value {
      font-size: 1.16rem;
    }

    @media (max-width: 900px) {
      .helios-system-map-header,
      .helios-system-map-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .helios-system-map-panel {
        left: 18px;
        right: 18px;
        top: auto;
        bottom: 108px;
        width: auto;
      }
    }
  `;

  document.head.appendChild(style);
}

function normalizeBodyKey(name) {
  return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return '--';
  }

  if (distanceKm >= AU_KM * 0.1) {
    return `${(distanceKm / AU_KM).toFixed(distanceKm / AU_KM < 10 ? 2 : 1)} AU`;
  }

  return `${Math.round(distanceKm).toLocaleString()} km`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds)) {
    return '--';
  }

  const total = Math.max(Math.round(seconds), 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function hazardSummaryForBody(body) {
  const hazard = SURFACE_HAZARDS[normalizeBodyKey(body?.data?.name)];

  if (!hazard) {
    return {
      score: 0,
      label: 'Low',
      note: 'No major surface hazards registered'
    };
  }

  const score = hazard.heatRate + hazard.pressureRate + hazard.radiationRate + hazard.toxicRate;

  if (score >= 8) {
    return { score, label: 'Extreme', note: hazard.note };
  }

  if (score >= 3) {
    return { score, label: 'High', note: hazard.note };
  }

  if (score > 0) {
    return { score, label: 'Moderate', note: hazard.note };
  }

  return { score, label: 'Low', note: hazard.note };
}

function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.96)');
  gradient.addColorStop(0.78, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createShipTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.translate(64, 64);
  context.fillStyle = '#eaf8ff';
  context.strokeStyle = '#38bdf8';
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(0, -42);
  context.lineTo(24, 24);
  context.lineTo(0, 10);
  context.lineTo(-24, 24);
  context.closePath();
  context.fill();
  context.stroke();
  return new THREE.CanvasTexture(canvas);
}

function createStructureTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.translate(64, 64);
  context.strokeStyle = '#ffe08a';
  context.fillStyle = 'rgba(255, 224, 138, 0.18)';
  context.lineWidth = 8;
  context.beginPath();
  context.rect(-24, -24, 48, 48);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(-34, 0);
  context.lineTo(34, 0);
  context.moveTo(0, -34);
  context.lineTo(0, 34);
  context.stroke();
  return new THREE.CanvasTexture(canvas);
}

function makeCirclePoints(radius, segments = 160) {
  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }

  return points;
}

export default class SystemMap {
  constructor(root, solarSystem, ship, warpSystem) {
    ensureStyles();

    this.root = root;
    this.solarSystem = solarSystem;
    this.ship = ship;
    this.warpSystem = warpSystem;
    this.surfaceStateProvider = () => null;
    this.selectionHandler = null;
    this.openChangeHandler = null;
    this.selectedBody = null;
    this.open = false;
    this.zoom = 1;
    this.targetZoom = 1;
    this.pan = new THREE.Vector3();
    this.targetPan = new THREE.Vector3();

    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.dragStart = null;
    this.dragDistance = 0;

    this.filters = {
      planets: true,
      moons: true,
      asteroids: true,
      structures: true
    };

    this.container = document.createElement('div');
    this.container.className = 'helios-system-map';
    this.container.innerHTML = `
      <div class="helios-system-map-canvas" data-map-canvas></div>
      <div class="helios-system-map-header">
        <div class="helios-system-map-title">
          <div class="caption">System Map</div>
          <div class="value">Helios Navigation Grid</div>
        </div>
        <div class="helios-system-map-filters">
          <button class="helios-system-map-filter active" data-filter="planets">Planets</button>
          <button class="helios-system-map-filter active" data-filter="moons">Moons</button>
          <button class="helios-system-map-filter active" data-filter="asteroids">Asteroids</button>
          <button class="helios-system-map-filter active" data-filter="structures">Structures</button>
        </div>
      </div>
      <div class="helios-system-map-panel">
        <div class="caption">Selected Destination</div>
        <div class="value" data-body-name style="font-size: 1.08rem; margin-top: 0.35rem;">None</div>
        <div class="caption" data-body-subtitle style="margin-top: 0.4rem;">Click a world to inspect it.</div>
        <div class="helios-system-map-grid">
          <div class="caption">Distance</div>
          <div class="value" data-body-distance>--</div>
          <div class="caption">Travel Time</div>
          <div class="value" data-body-travel-time>--</div>
          <div class="caption">Hazard Rating</div>
          <div class="value" data-body-hazard>--</div>
          <div class="caption">Status</div>
          <div class="value" data-body-status>Awaiting target lock</div>
        </div>
        <div class="caption" data-body-note style="margin-top: 1rem; line-height: 1.5;">No hazard analysis loaded.</div>
      </div>
      <div class="helios-system-map-footer">
        <div>
          <div class="caption">Controls</div>
          <div class="value" style="margin-top: 0.35rem; font-size: 0.8rem;">Drag to pan | Scroll to zoom | Click to inspect | W to engage warp</div>
        </div>
        <div class="helios-system-map-actions">
          <button class="helios-system-map-button" data-set-target disabled>Warp Here</button>
          <button class="helios-system-map-button primary" data-engage-warp disabled>Engage Warp</button>
          <button class="helios-system-map-button" data-close-map>Close Map</button>
        </div>
      </div>
    `;

    this.canvasHost = this.container.querySelector('[data-map-canvas]');
    this.bodyNameValue = this.container.querySelector('[data-body-name]');
    this.bodySubtitleValue = this.container.querySelector('[data-body-subtitle]');
    this.bodyDistanceValue = this.container.querySelector('[data-body-distance]');
    this.bodyTravelTimeValue = this.container.querySelector('[data-body-travel-time]');
    this.bodyHazardValue = this.container.querySelector('[data-body-hazard]');
    this.bodyStatusValue = this.container.querySelector('[data-body-status]');
    this.bodyNoteValue = this.container.querySelector('[data-body-note]');
    this.setTargetButton = this.container.querySelector('[data-set-target]');
    this.engageWarpButton = this.container.querySelector('[data-engage-warp]');
    this.closeButton = this.container.querySelector('[data-close-map]');
    this.filterButtons = new Map();

    for (const button of this.container.querySelectorAll('[data-filter]')) {
      this.filterButtons.set(button.dataset.filter, button);
      button.addEventListener('click', () => {
        const key = button.dataset.filter;
        this.filters[key] = !this.filters[key];
        button.classList.toggle('active', this.filters[key]);
        this.updateFilterVisibility();
      });
    }

    this.setTargetButton.addEventListener('click', () => this.lockTargetFromSelection());
    this.engageWarpButton.addEventListener('click', () => this.engageWarp());
    this.closeButton.addEventListener('click', () => this.setOpen(false));

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.sortObjects = true;
    this.canvasHost.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
    this.camera.position.set(0, 520, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight('#9ed9ff', 0.85));

    this.circleTexture = createCircleTexture();
    this.shipTexture = createShipTexture();
    this.structureTexture = createStructureTexture();

    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    this.orbitGroup = new THREE.Group();
    this.beltGroup = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.overlayGroup = new THREE.Group();
    this.worldRoot.add(this.orbitGroup);
    this.worldRoot.add(this.beltGroup);
    this.worldRoot.add(this.bodyGroup);
    this.worldRoot.add(this.overlayGroup);

    this.createOrbitGuides();
    this.createBeltGuides();
    this.bodyMarkers = new Map();
    this.selectableMarkers = [];
    this.createBodyMarkers();

    this.shipMarker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.shipTexture,
        color: '#ffffff',
        transparent: true,
        depthWrite: false
      })
    );
    this.shipMarker.scale.setScalar(22);
    this.overlayGroup.add(this.shipMarker);

    this.structureMarker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.structureTexture,
        color: '#fff4be',
        transparent: true,
        depthWrite: false,
        opacity: 0.9
      })
    );
    this.structureMarker.scale.setScalar(18);
    this.structureMarker.visible = false;
    this.overlayGroup.add(this.structureMarker);

    this.targetRing = new THREE.Mesh(
      new THREE.RingGeometry(8, 10.8, 40),
      new THREE.MeshBasicMaterial({
        color: '#73e3ff',
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.targetRing.rotation.x = -Math.PI * 0.5;
    this.targetRing.visible = false;
    this.overlayGroup.add(this.targetRing);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(6.6, 7.8, 40),
      new THREE.MeshBasicMaterial({
        color: '#ffd77a',
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.selectionRing.rotation.x = -Math.PI * 0.5;
    this.selectionRing.visible = false;
    this.overlayGroup.add(this.selectionRing);

    this.trajectoryLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: '#8fe8ff',
        dashSize: 9,
        gapSize: 4,
        transparent: true,
        opacity: 0.88
      })
    );
    this.trajectoryLine.visible = false;
    this.overlayGroup.add(this.trajectoryLine);

    this.bindEvents();
    this.root.appendChild(this.container);
    this.handleResize = this.handleResize.bind(this);
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  createOrbitGuides() {
    const material = new THREE.LineBasicMaterial({
      color: '#2f6a9a',
      transparent: true,
      opacity: 0.26
    });

    for (const planet of PLANETARY_DATA) {
      const radius = planet.orbitalElements.semiMajorAxisAu * SCALE_AU_TO_UNITS;
      const geometry = new THREE.BufferGeometry().setFromPoints(makeCirclePoints(radius));
      const orbit = new THREE.LineLoop(geometry, material.clone());
      orbit.userData.type = 'planet-orbit';
      this.orbitGroup.add(orbit);
    }
  }

  createBeltGuides() {
    for (const config of [BELT_CONFIGS.asteroid, BELT_CONFIGS.kuiper]) {
      const outer = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          makeCirclePoints(config.maxAu * SCALE_AU_TO_UNITS)
        ),
        new THREE.LineDashedMaterial({
          color: config === BELT_CONFIGS.asteroid ? '#b29d7e' : '#a9b6d3',
          dashSize: 8,
          gapSize: 5,
          transparent: true,
          opacity: 0.25
        })
      );
      const inner = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          makeCirclePoints(config.minAu * SCALE_AU_TO_UNITS)
        ),
        outer.material.clone()
      );

      outer.computeLineDistances();
      inner.computeLineDistances();
      outer.userData.filter = 'asteroids';
      inner.userData.filter = 'asteroids';
      this.beltGroup.add(outer);
      this.beltGroup.add(inner);
    }
  }

  createBodyMarkers() {
    const sun = this.solarSystem.sun;
    this.createMarkerForBody(sun, 30);

    for (const body of this.solarSystem.getAllBodies()) {
      if (body === sun) {
        continue;
      }

      const isMoon = Boolean(body.parentBody);
      const scale = isMoon ? 10 : body.data.type === 'dwarf-planet' ? 11 : 14;
      this.createMarkerForBody(body, scale);
    }
  }

  createMarkerForBody(body, scale) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.circleTexture,
        color: body.data.color ?? '#ffffff',
        transparent: true,
        opacity: 0.95,
        depthWrite: false
      })
    );
    sprite.scale.setScalar(scale);
    sprite.userData.body = body;
    this.bodyGroup.add(sprite);
    this.bodyMarkers.set(body.data.name, sprite);
    this.selectableMarkers.push(sprite);
  }

  bindEvents() {
    this.canvasHost.addEventListener('pointerdown', (event) => {
      if (!this.open) {
        return;
      }

      this.dragStart = {
        x: event.clientX,
        y: event.clientY,
        panX: this.targetPan.x,
        panZ: this.targetPan.z
      };
      this.dragDistance = 0;
      this.canvasHost.setPointerCapture?.(event.pointerId);
    });

    this.canvasHost.addEventListener('pointermove', (event) => {
      if (!this.open || !this.dragStart) {
        return;
      }

      const dx = event.clientX - this.dragStart.x;
      const dy = event.clientY - this.dragStart.y;
      this.dragDistance = Math.sqrt(dx * dx + dy * dy);
      const scale = this.getWorldUnitsPerPixel();
      this.targetPan.x = this.dragStart.panX - dx * scale;
      this.targetPan.z = this.dragStart.panZ + dy * scale;
    });

    this.canvasHost.addEventListener('pointerup', (event) => {
      if (!this.open || !this.dragStart) {
        return;
      }

      if (this.dragDistance < 6) {
        this.handleSelection(event);
      }

      this.dragStart = null;
      this.dragDistance = 0;
      this.canvasHost.releasePointerCapture?.(event.pointerId);
    });

    this.canvasHost.addEventListener(
      'wheel',
      (event) => {
        if (!this.open) {
          return;
        }

        event.preventDefault();
        const zoomFactor = event.deltaY > 0 ? 0.88 : 1.14;
        this.targetZoom = clamp(this.targetZoom * zoomFactor, 0.5, 12);
      },
      { passive: false }
    );

    window.addEventListener('keydown', (event) => {
      if (!this.open) {
        return;
      }

      if (event.code === 'KeyW' && !event.repeat) {
        event.preventDefault();
        this.engageWarp();
      }
    });
  }

  setSurfaceStateProvider(provider) {
    this.surfaceStateProvider = provider;
  }

  onSelection(handler) {
    this.selectionHandler = handler;
  }

  onOpenChange(handler) {
    this.openChangeHandler = handler;
  }

  isOpen() {
    return this.open;
  }

  setSelectedBody(body) {
    this.selectedBody = body ?? null;
  }

  toggle() {
    this.setOpen(!this.open);
  }

  setOpen(open) {
    this.open = Boolean(open);
    this.container.classList.toggle('visible', this.open);

    if (this.open) {
      this.selectedBody =
        this.selectedBody ??
        this.warpSystem.getTargetBody() ??
        this.solarSystem.selection ??
        null;
      this.handleResize();
    }

    if (this.openChangeHandler) {
      this.openChangeHandler(this.open);
    }
  }

  handleResize() {
    const width = Math.max(this.canvasHost.clientWidth, window.innerWidth, 1);
    const height = Math.max(this.canvasHost.clientHeight, window.innerHeight, 1);
    this.renderer.setSize(width, height, false);
    this.updateCameraFrustum();
  }

  getWorldUnitsPerPixel() {
    const width = Math.max(this.canvasHost.clientWidth, window.innerWidth, 1);
    const visibleWidth = (this.camera.right - this.camera.left) / this.camera.zoom;
    return visibleWidth / width;
  }

  updateCameraFrustum() {
    const width = Math.max(this.canvasHost.clientWidth, window.innerWidth, 1);
    const height = Math.max(this.canvasHost.clientHeight, window.innerHeight, 1);
    const aspect = width / height;
    const viewSize = 5000;
    this.camera.left = (-viewSize * aspect) * 0.5;
    this.camera.right = (viewSize * aspect) * 0.5;
    this.camera.top = viewSize * 0.5;
    this.camera.bottom = (-viewSize) * 0.5;
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();
  }

  isBodyVisibleForFilters(body) {
    if (body === this.solarSystem.sun) {
      return true;
    }

    const isMoon = Boolean(body.parentBody);

    if (isMoon && !this.filters.moons) {
      return false;
    }

    if (!isMoon && body.data.type !== 'star' && !this.filters.planets) {
      return false;
    }

    return true;
  }

  handleSelection(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersections = this.raycaster.intersectObjects(this.selectableMarkers, false);

    if (intersections.length === 0) {
      return;
    }

    const marker = intersections[0].object;
    const body = marker.userData.body;

    if (!body) {
      return;
    }

    this.setSelectedBody(body);

    if (this.selectionHandler) {
      this.selectionHandler(body);
    }
  }

  lockTargetFromSelection() {
    if (!this.selectedBody) {
      return;
    }

    const currentBody = this.ship.getState().nearestBody;

    if (currentBody && currentBody === this.selectedBody) {
      return;
    }

    this.warpSystem.setTarget(this.selectedBody);
  }

  engageWarp() {
    const engaged = this.warpSystem.requestWarp(this.surfaceStateProvider?.() ?? null);

    if (engaged) {
      this.setOpen(false);
    }
  }

  updateMarkers(elapsedTimeSeconds) {
    const pulse = 1 + Math.sin(elapsedTimeSeconds * 1.6) * 0.08;

    for (const marker of this.bodyMarkers.values()) {
      const body = marker.userData.body;
      const world = body.getWorldPosition(this.tmpVector);
      const baseScale = body === this.solarSystem.sun ? 30 : body.parentBody ? 10 : body.data.type === 'dwarf-planet' ? 11 : 14;

      marker.userData.baseScale = baseScale;
      marker.position.set(world.x, 0, world.z);
      marker.visible = this.isBodyVisibleForFilters(body);
      marker.material.opacity = this.selectedBody === body ? 1 : 0.88;

      const highlight = this.selectedBody === body ? 1.28 : this.warpSystem.getTargetBody() === body ? pulse * 1.14 : 1;
      marker.scale.setScalar(baseScale * highlight);
    }
  }

  updateShipMarker() {
    const shipPosition = this.ship.group.position;
    this.shipMarker.position.set(shipPosition.x, 0, shipPosition.z);
    const forward = this.ship.getForward(this.tmpVector).setY(0);
    const angle = forward.lengthSq() > 0.0001 ? Math.atan2(forward.x, forward.z) : 0;
    this.shipMarker.material.rotation = -angle;
  }

  updateStructureMarker(elapsedTimeSeconds) {
    const surfaceState = this.surfaceStateProvider?.() ?? null;
    const bodyName = surfaceState?.bodyName;
    const body = bodyName ? this.solarSystem.getBodyByName(bodyName) : null;

    if (!body || !this.filters.structures || !(surfaceState?.active || surfaceState?.inStructure)) {
      this.structureMarker.visible = false;
      return;
    }

    const bodyPosition = body.getWorldPosition(this.tmpVector);
    const pulse = 1 + Math.sin(elapsedTimeSeconds * 2.2) * 0.12;

    this.structureMarker.position.set(bodyPosition.x + 18, 0, bodyPosition.z + 18);
    this.structureMarker.scale.setScalar(18 * pulse);
    this.structureMarker.visible = true;
  }

  updateOverlay(elapsedTimeSeconds) {
    const targetBody = this.warpSystem.getTargetBody();

    if (targetBody) {
      const targetPosition = targetBody.getWorldPosition(this.tmpVector);
      const pulse = 1 + Math.sin(elapsedTimeSeconds * 2.8) * 0.12;
      this.targetRing.position.set(targetPosition.x, 0, targetPosition.z);
      this.targetRing.scale.setScalar((targetBody.parentBody ? 0.85 : 1.25) * pulse);
      this.targetRing.visible = true;

      const points = this.warpSystem.getTrajectoryPoints(
        this.ship.group.position,
        targetPosition,
        {
          count: 64,
          lateralArc: 0.18,
          verticalArc: 0
        }
      );
      this.trajectoryLine.geometry.setFromPoints(points.map((point) => new THREE.Vector3(point.x, 0, point.z)));
      this.trajectoryLine.computeLineDistances();
      this.trajectoryLine.visible = true;
    } else {
      this.targetRing.visible = false;
      this.trajectoryLine.visible = false;
    }

    if (this.selectedBody) {
      const selectedPosition = this.selectedBody.getWorldPosition(this.tmpVector2);
      this.selectionRing.position.set(selectedPosition.x, 0, selectedPosition.z);
      this.selectionRing.scale.setScalar(1 + Math.sin(elapsedTimeSeconds * 3.2) * 0.1);
      this.selectionRing.visible = true;
    } else {
      this.selectionRing.visible = false;
    }
  }

  updateFilterVisibility() {
    this.orbitGroup.visible = this.filters.planets;
    this.structureMarker.visible = this.structureMarker.visible && this.filters.structures;

    for (const child of this.beltGroup.children) {
      child.visible = this.filters.asteroids;
    }

    for (const [name, marker] of this.bodyMarkers.entries()) {
      marker.visible = this.isBodyVisibleForFilters(marker.userData.body);
    }
  }

  updateInfoPanel() {
    const warpState = this.warpSystem.getState();

    if (!this.selectedBody) {
      this.bodyNameValue.textContent = 'None';
      this.bodySubtitleValue.textContent = 'Click a world to inspect it.';
      this.bodyDistanceValue.textContent = '--';
      this.bodyTravelTimeValue.textContent = '--';
      this.bodyHazardValue.textContent = '--';
      this.bodyStatusValue.textContent = warpState.statusLabel;
      this.bodyNoteValue.textContent = 'No hazard analysis loaded.';
      this.setTargetButton.disabled = true;
      this.engageWarpButton.disabled = !warpState.warpReady;
      return;
    }

    const hazard = hazardSummaryForBody(this.selectedBody);
    const targetDistanceKm = this.ship.group.position.distanceTo(
      this.selectedBody.getWorldPosition(this.tmpVector)
    ) * UNITS_TO_KM;
    const etaSeconds = this.ship.getState().speedKmS > 0.01
      ? targetDistanceKm / this.ship.getState().speedKmS
      : Number.POSITIVE_INFINITY;
    const currentBody = this.ship.getState().nearestBody;
    const isCurrentLocation = currentBody && currentBody === this.selectedBody;
    const isTarget = warpState.targetBody === this.selectedBody;

    this.bodyNameValue.textContent = this.selectedBody.data.name;
    this.bodySubtitleValue.textContent = this.selectedBody.parentBody
      ? `Moon of ${this.selectedBody.parentBody.data.name}`
      : this.selectedBody.data.classification ?? this.selectedBody.data.type;
    this.bodyDistanceValue.textContent = formatDistance(targetDistanceKm);
    this.bodyTravelTimeValue.textContent = formatEta(etaSeconds);
    this.bodyHazardValue.textContent = `${hazard.label}${hazard.score > 0 ? ` (${hazard.score.toFixed(1)})` : ''}`;
    this.bodyStatusValue.textContent = isCurrentLocation
      ? 'Current local body'
      : isTarget
        ? 'Target locked'
        : 'Available for lock';
    this.bodyNoteValue.textContent = hazard.note;

    this.setTargetButton.disabled = isCurrentLocation;
    this.engageWarpButton.disabled = !warpState.warpReady || !isTarget;
  }

  update(deltaSeconds, elapsedTimeSeconds) {
    if (!this.open) {
      return;
    }

    this.zoom += (this.targetZoom - this.zoom) * Math.min(deltaSeconds * 8, 1);
    this.pan.lerp(this.targetPan, Math.min(deltaSeconds * 7, 1));

    this.updateCameraFrustum();
    this.camera.position.set(this.pan.x, 520, this.pan.z);
    this.camera.lookAt(this.pan.x, 0, this.pan.z);

    this.updateMarkers(elapsedTimeSeconds);
    this.updateShipMarker();
    this.updateStructureMarker(elapsedTimeSeconds);
    this.updateOverlay(elapsedTimeSeconds);
    this.updateFilterVisibility();
    this.updateInfoPanel();
    this.renderer.render(this.scene, this.camera);
  }
}
