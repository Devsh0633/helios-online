import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { CAMERA_MODES } from '../utils/Constants.js';

const starsVertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (1400.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starsFragmentShader = `
  varying vec3 vColor;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(centered);

    if (distanceToCenter > 0.5) {
      discard;
    }

    float alpha = smoothstep(0.5, 0.0, distanceToCenter);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function smootherstep(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

export default class SceneManager {
  constructor(container, textureFactory) {
    this.container = container;
    this.textureFactory = textureFactory;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.01,
      300_000
    );
    this.camera.position.set(0, 560, 4300);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.sortObjects = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 12_000;
    this.controls.minDistance = 0.4;
    this.controls.maxPolarAngle = Math.PI * 0.99;
    this.controls.target.set(0, 0, 0);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selectionHandler = null;
    this.selectableObjects = [];
    this.focusedBody = null;
    this.focusTransition = null;
    this.cameraMode = CAMERA_MODES.SYSTEM_VIEW;
    this.dragStart = null;
    this.dragDistance = 0;
    this.pointerButton = 0;

    this.frustum = new THREE.Frustum();
    this.projectionViewMatrix = new THREE.Matrix4();
    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();

    this.ambientLight = new THREE.AmbientLight('#8aa2c0', 0.02);
    this.scene.add(this.ambientLight);

    this.starField = this.createStarField();
    this.milkyWay = this.createMilkyWayPanorama();
    this.scene.add(this.milkyWay);
    this.scene.add(this.starField);

    this.bindEvents();
  }

  createStarField() {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const radius = 9000 + Math.random() * 16_000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const sinPhi = Math.sin(phi);
      const x = radius * sinPhi * Math.cos(theta);
      const y = radius * Math.cos(phi) * 0.65;
      const z = radius * sinPhi * Math.sin(theta);
      const brightness = 0.55 + Math.random() * 0.45;
      const hue = 190 + Math.random() * 45;
      const color = new THREE.Color(`hsl(${hue}, 90%, ${75 + Math.random() * 20}%)`);

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      colors[index * 3] = color.r * brightness;
      colors[index * 3 + 1] = color.g * brightness;
      colors[index * 3 + 2] = color.b * brightness;
      sizes[index] = 2.0 + Math.random() * 7.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: starsVertexShader,
      fragmentShader: starsFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  createMilkyWayPanorama() {
    const geometry = new THREE.SphereGeometry(26_000, 64, 32);
    const material = new THREE.MeshBasicMaterial({
      map: this.textureFactory.createMilkyWayTexture(),
      side: THREE.BackSide,
      depthWrite: false
    });

    return new THREE.Mesh(geometry, material);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());

    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.dragDistance = 0;
      this.pointerButton = event.button;
    });

    this.renderer.domElement.addEventListener('pointermove', (event) => {
      if (!this.dragStart) {
        return;
      }

      const dx = event.clientX - this.dragStart.x;
      const dy = event.clientY - this.dragStart.y;
      this.dragDistance = Math.sqrt(dx * dx + dy * dy);
    });

    this.renderer.domElement.addEventListener('pointerup', (event) => {
      if (!this.dragStart) {
        return;
      }

      if (this.dragDistance < 6 && this.pointerButton === 0) {
        this.handleSelection(event);
      }

      this.dragStart = null;
      this.dragDistance = 0;
      this.pointerButton = 0;
    });
  }

  handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleSelection(event) {
    if (!this.selectionHandler || this.selectableObjects.length === 0) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersections = this.raycaster.intersectObjects(this.selectableObjects, false);

    if (intersections.length === 0) {
      return;
    }

    const body = intersections[0].object.userData.body;

    if (body) {
      this.selectionHandler(body);
    }
  }

  setSelectionHandler(handler) {
    this.selectionHandler = handler;
  }

  registerSelectableObjects(objects) {
    this.selectableObjects = objects;
  }

  getFrustum() {
    this.projectionViewMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projectionViewMatrix);
    return this.frustum;
  }

  worldToScreen(worldPosition, out = { x: 0, y: 0, visible: false }) {
    this.tmpVector.copy(worldPosition).project(this.camera);

    out.x = (this.tmpVector.x * 0.5 + 0.5) * this.container.clientWidth;
    out.y = (-this.tmpVector.y * 0.5 + 0.5) * this.container.clientHeight;
    out.visible = this.tmpVector.z > -1 && this.tmpVector.z < 1;

    return out;
  }

  focusOn(body) {
    this.focusedBody = body;

    const targetPosition = body.getWorldPosition(this.tmpVector);
    const direction = this.camera.position.clone().sub(this.controls.target);

    if (direction.lengthSq() < 0.001) {
      direction.set(1, 0.35, 1);
    }

    direction.normalize();

    const distance = body.getFocusDistance ? body.getFocusDistance() : 12;
    const endPosition = targetPosition
      .clone()
      .addScaledVector(direction, distance)
      .add(new THREE.Vector3(0, distance * 0.18, 0));

    this.focusTransition = {
      startPosition: this.camera.position.clone(),
      endPosition,
      startTarget: this.controls.target.clone(),
      endTarget: targetPosition.clone(),
      elapsed: 0,
      duration: 1.75
    };
  }

  focusSystemView() {
    this.focusedBody = null;
    this.focusTransition = {
      startPosition: this.camera.position.clone(),
      endPosition: new THREE.Vector3(0, 560, 4300),
      startTarget: this.controls.target.clone(),
      endTarget: new THREE.Vector3(0, 0, 0),
      elapsed: 0,
      duration: 1.6
    };
  }

  update(deltaSeconds, elapsedTimeSeconds) {
    if (this.focusTransition) {
      this.focusTransition.elapsed += deltaSeconds;
      const progress = smootherstep(this.focusTransition.elapsed / this.focusTransition.duration);

      this.camera.position.lerpVectors(
        this.focusTransition.startPosition,
        this.focusTransition.endPosition,
        progress
      );
      this.controls.target.lerpVectors(
        this.focusTransition.startTarget,
        this.focusTransition.endTarget,
        progress
      );

      if (progress >= 1) {
        this.focusTransition = null;
      }
    }

    this.controls.update();

    this.milkyWay.position.copy(this.camera.position);
    this.starField.position.copy(this.camera.position);
    this.starField.rotation.y = elapsedTimeSeconds * 0.0025;

    if (!this.focusedBody) {
      this.cameraMode = CAMERA_MODES.SYSTEM_VIEW;
      return;
    }

    const bodyPosition = this.focusedBody.getWorldPosition(this.tmpVector2);
    const distance = this.camera.position.distanceTo(bodyPosition);
    const surfaceApproachThreshold = this.focusedBody.visualRadius * 7.5;

    if (distance <= surfaceApproachThreshold) {
      this.cameraMode = CAMERA_MODES.SURFACE_APPROACH;
    } else {
      this.cameraMode = CAMERA_MODES.PLANET_ORBIT;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
