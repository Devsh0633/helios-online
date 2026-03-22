import * as THREE from 'three';

import { AU_KM, clamp, degToRad, radToDeg } from '../utils/Constants.js';
import SimplexNoise from './SimplexNoise.js';

const GRID_SIZE = 16;
const TILE_SIZE_KM = 1;
const TILE_SEGMENTS = 14;
const SKY_RADIUS = 74;
const SURFACE_KM_TO_UNITS = 0.75;

const skyVertexShader = `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const skyFragmentShader = `
  uniform vec3 sunDirection;
  uniform float rayleighCoeff;
  uniform float mieCoeff;
  uniform float sunIntensity;
  uniform float scatteringScale;
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  uniform vec3 sunsetColor;
  uniform float hazeAmount;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    float sunAmount = max(dot(viewDir, normalize(sunDirection)), 0.0);
    float horizon = pow(clamp(1.0 - max(viewDir.y, -0.2), 0.0, 1.0), 1.6);
    float zenith = pow(clamp(max(viewDir.y, 0.0), 0.0, 1.0), 0.55);
    float rayleighPhase = 0.75 * (1.0 + dot(viewDir, normalize(sunDirection)) * dot(viewDir, normalize(sunDirection)));
    float miePhase = pow(sunAmount, mix(4.0, 18.0, clamp(mieCoeff * 2.0, 0.0, 1.0)));

    vec3 baseSky = mix(horizonColor, zenithColor, zenith);
    vec3 sunset = sunsetColor * pow(1.0 - max(normalize(sunDirection).y, 0.0), 1.4) * horizon;
    vec3 scatter = baseSky * rayleighPhase * rayleighCoeff * scatteringScale;
    vec3 sunGlow = vec3(1.0, 0.85, 0.65) * miePhase * mieCoeff * sunIntensity * 0.085;
    vec3 haze = mix(baseSky, horizonColor, hazeAmount * horizon * 0.85);
    vec3 color = mix(scatter + sunset, haze, hazeAmount * 0.32) + sunGlow;
    float alpha = clamp(0.72 + horizon * 0.22 + hazeAmount * 0.15, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

const gasVertexShader = `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const gasFragmentShader = `
  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform vec3 colorC;
  uniform float turbulence;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition - cameraPosition);
    float bands = sin(dir.y * 48.0 + time * 0.4) * 0.5 + 0.5;
    float finer = sin(dir.y * 120.0 - time * 0.8 + dir.x * 12.0) * 0.5 + 0.5;
    float storm = sin((dir.x + dir.z) * 26.0 + time * 0.6) * 0.5 + 0.5;
    float mixAB = smoothstep(0.18, 0.82, bands);
    vec3 color = mix(colorA, colorB, mixAB);
    color = mix(color, colorC, finer * 0.32 + storm * turbulence * 0.65);
    float alpha = 0.78 + turbulence * 0.18 + finer * 0.08;
    gl_FragColor = vec4(color, alpha);
  }
`;

const SURFACE_PROFILES = {
  Earth: {
    type: 'solid',
    terrain: 'earth',
    triggerKm: 220,
    exitKm: 320,
    maxHeightKm: 8.8,
    waterLevelKm: 0.02,
    atmosphere: true,
    cloudHeightKm: 2,
    clouds: true,
    trees: true,
    sky: { rayleighCoeff: 1.0, mieCoeff: 0.005, sunIntensity: 20, scatteringScale: 1.0 },
    zenithColor: '#0b4d9b',
    horizonColor: '#b9dfff',
    sunsetColor: '#ffb269',
    fogColor: '#8bc9ff',
    fogDensity: 0.00014,
    hazeAmount: 0.18,
    ambientIntensity: 1.0,
    sunIntensity: 2.2,
    structure: true,
    hazardName: 'Earth'
  },
  Moon: {
    type: 'solid',
    terrain: 'moon',
    triggerKm: 110,
    exitKm: 170,
    maxHeightKm: 3.6,
    atmosphere: false,
    showStars: true,
    ambientIntensity: 0.16,
    sunIntensity: 1.8,
    skyBody: 'Earth',
    structure: true,
    hazardName: 'Moon',
    tidalSunLock: true
  },
  Mars: {
    type: 'solid',
    terrain: 'mars',
    triggerKm: 380,
    exitKm: 520,
    maxHeightKm: 16,
    atmosphere: true,
    sky: { rayleighCoeff: 0.3, mieCoeff: 0.05, sunIntensity: 8, scatteringScale: 1.5 },
    zenithColor: '#8d513d',
    horizonColor: '#ffb58a',
    sunsetColor: '#ff9d74',
    fogColor: '#d8885e',
    fogDensity: 0.00055,
    hazeAmount: 0.36,
    ambientIntensity: 0.6,
    sunIntensity: 1.55,
    dustStorms: true,
    satellites: ['Phobos', 'Deimos'],
    structure: true,
    hazardName: 'Mars'
  },
  Venus: {
    type: 'solid',
    terrain: 'venus',
    triggerKm: 620,
    exitKm: 800,
    maxHeightKm: 5.2,
    atmosphere: true,
    sky: { rayleighCoeff: 0.1, mieCoeff: 0.5, sunIntensity: 3, scatteringScale: 0.3 },
    zenithColor: '#81562b',
    horizonColor: '#f1c26f',
    sunsetColor: '#ff8e4a',
    fogColor: '#e1a54d',
    fogDensity: 0.0021,
    hazeAmount: 0.78,
    ambientIntensity: 0.55,
    sunIntensity: 0.72,
    lavaCracks: true,
    structure: true,
    hazardName: 'Venus'
  },
  Mercury: {
    type: 'solid',
    terrain: 'mercury',
    triggerKm: 90,
    exitKm: 145,
    maxHeightKm: 5.1,
    atmosphere: false,
    showStars: true,
    ambientIntensity: 0.1,
    sunIntensity: 2.6,
    enlargedSunFactor: 3.0,
    structure: true,
    hazardName: 'Mercury'
  },
  Jupiter: {
    type: 'gas',
    terrain: 'jupiter',
    triggerKm: 12000,
    exitKm: 15000,
    atmosphere: true,
    sky: { rayleighCoeff: 0.05, mieCoeff: 0.18, sunIntensity: 7, scatteringScale: 0.4 },
    zenithColor: '#80573a',
    horizonColor: '#f2c698',
    sunsetColor: '#ff9c69',
    fogColor: '#b97d5c',
    fogDensity: 0.00075,
    hazeAmount: 0.74,
    ambientIntensity: 0.32,
    sunIntensity: 0.9,
    gasColors: ['#7b5a44', '#d1ae85', '#f0dcc4'],
    turbulence: 0.035,
    crushDepthKm: 100,
    hazardName: null
  },
  Saturn: {
    type: 'gas',
    terrain: 'saturn',
    triggerKm: 11000,
    exitKm: 14000,
    atmosphere: true,
    sky: { rayleighCoeff: 0.08, mieCoeff: 0.14, sunIntensity: 6, scatteringScale: 0.45 },
    zenithColor: '#7d6841',
    horizonColor: '#ead29f',
    sunsetColor: '#ffb673',
    fogColor: '#caa36c',
    fogDensity: 0.00065,
    hazeAmount: 0.66,
    ambientIntensity: 0.36,
    sunIntensity: 0.8,
    gasColors: ['#736040', '#cbb079', '#f2e3bd'],
    turbulence: 0.024,
    crushDepthKm: 100,
    ringShadow: true,
    ringImpacts: true,
    hazardName: null
  },
  Io: {
    type: 'solid',
    terrain: 'io',
    triggerKm: 120,
    exitKm: 190,
    maxHeightKm: 7.8,
    atmosphere: false,
    showStars: true,
    ambientIntensity: 0.18,
    sunIntensity: 1.55,
    skyBody: 'Jupiter',
    skyBodyAngleDeg: 19.5,
    volcanoes: true,
    structure: true,
    hazardName: 'Io'
  },
  Europa: {
    type: 'solid',
    terrain: 'europa',
    triggerKm: 120,
    exitKm: 190,
    maxHeightKm: 2.8,
    atmosphere: false,
    showStars: true,
    ambientIntensity: 0.18,
    sunIntensity: 1.45,
    skyBody: 'Jupiter',
    skyBodyAngleDeg: 11.5,
    structure: true,
    hazardName: 'Europa'
  },
  Titan: {
    type: 'solid',
    terrain: 'titan',
    triggerKm: 1200,
    exitKm: 1600,
    maxHeightKm: 2.1,
    atmosphere: true,
    waterLevelKm: -0.08,
    sky: { rayleighCoeff: 0.8, mieCoeff: 0.2, sunIntensity: 5, scatteringScale: 0.5 },
    zenithColor: '#8f5d25',
    horizonColor: '#f0b05e',
    sunsetColor: '#ff8f41',
    fogColor: '#c77d32',
    fogDensity: 0.00125,
    hazeAmount: 0.88,
    ambientIntensity: 0.46,
    sunIntensity: 0.9,
    methaneLakes: true,
    dunes: true,
    skyBody: 'Saturn',
    skyBodyAngleDeg: 5.7,
    structure: true,
    hazardName: 'Titan'
  },
  Triton: {
    type: 'solid',
    terrain: 'triton',
    triggerKm: 120,
    exitKm: 180,
    maxHeightKm: 3.4,
    atmosphere: false,
    showStars: true,
    ambientIntensity: 0.14,
    sunIntensity: 1.05,
    skyBody: 'Neptune',
    skyBodyAngleDeg: 14.4,
    geysers: true,
    structure: true,
    hazardName: 'Triton'
  },
  Pluto: {
    type: 'solid',
    terrain: 'pluto',
    triggerKm: 70,
    exitKm: 120,
    maxHeightKm: 4.6,
    atmosphere: true,
    sky: { rayleighCoeff: 0.14, mieCoeff: 0.03, sunIntensity: 1.8, scatteringScale: 0.18 },
    zenithColor: '#20253b',
    horizonColor: '#6a7ca8',
    sunsetColor: '#d9b9d7',
    fogColor: '#59668b',
    fogDensity: 0.00008,
    hazeAmount: 0.12,
    ambientIntensity: 0.1,
    sunIntensity: 0.45,
    showStars: true,
    skyBody: 'Charon',
    skyBodyAngleDeg: 3.8,
    structure: true,
    hazardName: 'Pluto'
  }
};

function createColor(value) {
  return new THREE.Color(value);
}

function wrapLongitudeDegrees(value) {
  let result = value;

  while (result > 180) {
    result -= 360;
  }

  while (result < -180) {
    result += 360;
  }

  return result;
}

function shortestLongitudeDeltaDegrees(a, b) {
  return wrapLongitudeDegrees(b - a);
}

function latLngToSphere(latDeg, lngDeg, target = new THREE.Vector3()) {
  const lat = degToRad(latDeg);
  const lng = degToRad(lngDeg);
  target.set(
    Math.cos(lat) * Math.cos(lng),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lng)
  );
  return target;
}

function localOffsetsToLatLng(radiusKm, centerLatDeg, centerLngDeg, eastKm, northKm) {
  const deltaLat = radToDeg(northKm / Math.max(radiusKm, 1));
  const cosLat = Math.max(Math.cos(degToRad(centerLatDeg)), 0.15);
  const deltaLng = radToDeg(eastKm / Math.max(radiusKm * cosLat, 1));

  return {
    latDeg: clamp(centerLatDeg + deltaLat, -89.5, 89.5),
    lngDeg: wrapLongitudeDegrees(centerLngDeg + deltaLng)
  };
}

function makeBasisQuaternion(xAxis, yAxis, zAxis, target = new THREE.Quaternion()) {
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(xAxis, yAxis, zAxis);
  return target.setFromRotationMatrix(matrix);
}

function pseudoRandom2D(x, y, seed = 1) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 17.23) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothstep(min, max, value) {
  const t = clamp((value - min) / Math.max(max - min, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
}

export default class SurfaceManager {
  constructor(sceneManager, solarSystem, textureFactory) {
    this.sceneManager = sceneManager;
    this.solarSystem = solarSystem;
    this.textureFactory = textureFactory;
    this.noiseByBody = new Map();

    this.surfaceRoot = new THREE.Group();
    this.surfaceRoot.visible = false;
    this.sceneManager.scene.add(this.surfaceRoot);

    this.terrainGroup = new THREE.Group();
    this.effectGroup = new THREE.Group();
    this.proxyGroup = new THREE.Group();
    this.surfaceRoot.add(this.terrainGroup);
    this.surfaceRoot.add(this.effectGroup);
    this.surfaceRoot.add(this.proxyGroup);

    this.surfaceAmbient = new THREE.AmbientLight('#ffffff', 0.25);
    this.surfaceSunLight = new THREE.DirectionalLight('#fff5d5', 1.5);
    this.surfaceLightTarget = new THREE.Object3D();
    this.surfaceRoot.add(this.surfaceAmbient);
    this.surfaceRoot.add(this.surfaceSunLight);
    this.surfaceRoot.add(this.surfaceLightTarget);
    this.surfaceSunLight.target = this.surfaceLightTarget;

    this.skyDome = this.createSkyDome();
    this.gasDome = this.createGasDome();
    this.sunDisc = this.createSunDisc();
    this.cloudLayer = this.createCloudLayer();
    this.structure = this.createStructure();
    this.redSpotSprite = this.createStormSprite('#b84d31');
    this.ringShadowBand = this.createBand('#000000', 0.16, 42, 8);
    this.surfaceRoot.add(this.skyDome);
    this.surfaceRoot.add(this.gasDome);
    this.surfaceRoot.add(this.sunDisc);
    this.surfaceRoot.add(this.cloudLayer);
    this.surfaceRoot.add(this.structure);
    this.surfaceRoot.add(this.redSpotSprite);
    this.surfaceRoot.add(this.ringShadowBand);

    this.treeMeshes = this.createTreeMeshes();
    this.effectSystems = this.createEffectSystems();
    this.effectGroup.add(this.effectSystems.dust);
    this.effectGroup.add(this.effectSystems.volcanoes);
    this.effectGroup.add(this.effectSystems.geysers);
    this.effectGroup.add(this.effectSystems.ringImpacts);

    this.tileMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: false
    });

    this.tileWorldSize = null;
    this.tilePool = [];
    this.tileColor = new THREE.Color();
    this.sampleVector = new THREE.Vector3();
    this.tempVector = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempVector3 = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempQuaternion2 = new THREE.Quaternion();
    this.tempMatrix = new THREE.Matrix4();

    this.currentBody = null;
    this.currentProfile = null;
    this.currentLatLng = { latDeg: 0, lngDeg: 0 };
    this.lastSampleCenter = null;
    this.transition = null;
    this.isActive = false;
    this.starsWereVisible = true;
    this.originalFog = this.sceneManager.scene.fog;
    this.lockedSunDirection = null;
    this.structureLocalPosition = new THREE.Vector3(3.6, 0, -2.2);
    this.treeCapacity = 220;

    this.state = {
      active: false,
      bodyName: null,
      mode: 'ORBIT',
      transitionActive: false,
      transitionProgress: 0,
      transitionStage: '',
      inStructure: false,
      hazardBodyName: null,
      hazardActive: false,
      note: 'Cruising in orbital space.',
      depthKm: 0
    };
  }

  createSkyDome() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(SKY_RADIUS, 48, 32),
      new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: new THREE.Vector3(0.3, 0.8, 0.2) },
          rayleighCoeff: { value: 1 },
          mieCoeff: { value: 0.01 },
          sunIntensity: { value: 12 },
          scatteringScale: { value: 1 },
          zenithColor: { value: createColor('#0d4ea3') },
          horizonColor: { value: createColor('#b2ddff') },
          sunsetColor: { value: createColor('#ffb46c') },
          hazeAmount: { value: 0.25 }
        },
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
  }

  createGasDome() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(SKY_RADIUS * 0.92, 48, 28),
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          colorA: { value: createColor('#7b5a44') },
          colorB: { value: createColor('#d1ae85') },
          colorC: { value: createColor('#f0dcc4') },
          turbulence: { value: 0.2 }
        },
        vertexShader: gasVertexShader,
        fragmentShader: gasFragmentShader,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
    mesh.visible = false;
    return mesh;
  }

  createSunDisc() {
    const texture = this.textureFactory.createHaloTexture(
      'surface-sun-disc',
      'rgba(255, 247, 205, 0.95)',
      'rgba(255, 160, 77, 0.0)'
    );
    return new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
  }

  createCloudLayer() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 180; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 24 + Math.random() * 82;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.65, 'rgba(255,255,255,0.3)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(12, 40),
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        color: '#f6fbff'
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.visible = false;
    mesh.userData.texture = texture;
    return mesh;
  }

  createStructure() {
    const group = new THREE.Group();
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: '#8ea7b3',
      metalness: 0.48,
      roughness: 0.42
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: '#dde7f2',
      metalness: 0.8,
      roughness: 0.22
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.24, 18), baseMaterial);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 18, 14),
      new THREE.MeshStandardMaterial({
        color: '#b6efff',
        emissive: '#52c6ff',
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.72,
        roughness: 0.12
      })
    );
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), trimMaterial);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      trimMaterial
    );

    dome.position.y = 0.22;
    dome.scale.y = 0.72;
    antenna.position.set(0.18, 0.48, -0.1);
    dish.position.set(0.18, 0.72, -0.1);
    dish.rotation.x = Math.PI;

    group.add(base);
    group.add(dome);
    group.add(antenna);
    group.add(dish);
    group.visible = false;
    return group;
  }

  createBand(color, opacity, width, height) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.visible = false;
    return mesh;
  }

  createStormSprite(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.translate(256, 256);

    for (let ring = 0; ring < 26; ring += 1) {
      context.beginPath();
      context.strokeStyle = `rgba(255, ${120 + ring * 3}, ${80 + ring}, ${0.28 - ring * 0.008})`;
      context.lineWidth = 10 - ring * 0.25;
      context.arc(0, 0, 30 + ring * 6, ring * 0.22, ring * 0.22 + Math.PI * 1.65);
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color,
        transparent: true,
        depthWrite: false,
        opacity: 0.75
      })
    );
    sprite.visible = false;
    return sprite;
  }

  createTreeMeshes() {
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.18, 6),
      new THREE.MeshStandardMaterial({
        color: '#5f4227',
        roughness: 0.95
      }),
      220
    );
    const crowns = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.1, 0.28, 6),
      new THREE.MeshStandardMaterial({
        color: '#2d6a3e',
        roughness: 0.88
      }),
      220
    );

    trunks.visible = false;
    crowns.visible = false;
    this.effectGroup.add(trunks);
    this.effectGroup.add(crowns);

    return { trunks, crowns };
  }

  createEffectSystems() {
    return {
      dust: this.createParticleField(260, '#ffb178'),
      volcanoes: this.createParticleField(140, '#ff7f36'),
      geysers: this.createParticleField(120, '#d7f2ff'),
      ringImpacts: this.createParticleField(170, '#f8f2d2')
    };
  }

  createParticleField(count, color) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.12,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    points.userData.count = count;
    return points;
  }

  getNoise(bodyName) {
    if (!this.noiseByBody.has(bodyName)) {
      let seed = 0;

      for (const character of bodyName) {
        seed = ((seed << 5) - seed + character.charCodeAt(0)) | 0;
      }

      this.noiseByBody.set(bodyName, new SimplexNoise(Math.abs(seed) + 1));
    }

    return this.noiseByBody.get(bodyName);
  }

  update(deltaSeconds, elapsedTimeSeconds, ship) {
    const nearestBody = ship.getState().nearestBody;
    const body = nearestBody ?? this.currentBody;
    const profile = body ? this.resolveProfile(body) : null;
    const environment = body
      ? this.solarSystem.getBodyEnvironment(body, ship.group.position, ship.getShipHeight())
      : this.solarSystem.getEmptyEnvironment();

    const withinSurfaceRange = body && profile
      ? environment.altitudeKm <= this.getActivationDistanceKm(body, profile)
      : false;
    const beyondExitRange = body && profile
      ? environment.altitudeKm > this.getExitDistanceKm(body, profile)
      : true;

    if (!this.isActive && !this.transition && withinSurfaceRange && profile) {
      this.beginTransition(body, profile, 'enter');
    } else if (this.isActive && (!profile || body !== this.currentBody || beyondExitRange) && !this.transition) {
      this.beginTransition(this.currentBody, this.currentProfile, 'exit');
    }

    if (this.transition) {
      this.updateTransition(deltaSeconds);
    }

    if (this.isActive && this.currentBody && this.currentProfile) {
      const activeEnvironment = this.solarSystem.getBodyEnvironment(
        this.currentBody,
        ship.group.position,
        ship.getShipHeight()
      );

      if (this.currentProfile.type === 'gas') {
        this.updateGasEnvironment(deltaSeconds, elapsedTimeSeconds, ship, activeEnvironment);
      } else {
        this.updateSolidEnvironment(deltaSeconds, elapsedTimeSeconds, ship, activeEnvironment);
      }

      if (this.currentProfile.type === 'gas' && activeEnvironment.depthKm >= this.currentProfile.crushDepthKm) {
        ship.respawnToSafePosition();
      }

      this.updateState(activeEnvironment, ship);
      return;
    }

    this.state = {
      active: false,
      bodyName: null,
      mode: 'ORBIT',
      transitionActive: Boolean(this.transition),
      transitionProgress: this.transition?.progress ?? 0,
      transitionStage: this.transition?.stage ?? '',
      inStructure: false,
      hazardBodyName: null,
      hazardActive: false,
      note: 'Cruising in orbital space.',
      depthKm: 0
    };
  }

  resolveProfile(body) {
    if (SURFACE_PROFILES[body.data.name]) {
      return SURFACE_PROFILES[body.data.name];
    }

    if (body.data.classification?.includes('Gas') || body.data.classification?.includes('Ice Giant')) {
      return {
        ...SURFACE_PROFILES.Saturn,
        gasColors: ['#577a91', '#96c2d8', '#d8f4ff']
      };
    }

    if (body.data.parent || body.data.type === 'moon') {
      return {
        ...SURFACE_PROFILES.Moon,
        hazardName: body.data.name
      };
    }

    return {
      ...SURFACE_PROFILES.Mercury,
      hazardName: body.data.name
    };
  }

  getActivationDistanceKm(body, profile) {
    if (profile.triggerKm) {
      return profile.triggerKm;
    }

    const atmosphereHeight = body.getAtmosphereHeightKm?.() ?? 0;
    return atmosphereHeight > 0 ? atmosphereHeight * 2 : 120;
  }

  getExitDistanceKm(body, profile) {
    if (profile.exitKm) {
      return profile.exitKm;
    }

    return this.getActivationDistanceKm(body, profile) * 1.3;
  }

  beginTransition(body, profile, direction) {
    if (!body || !profile) {
      return;
    }

    this.currentBody = body;
    this.currentProfile = profile;
    this.transition = {
      direction,
      progress: direction === 'enter' ? 0 : 1,
      duration: direction === 'enter' ? 1.8 : 1.35,
      stage: direction === 'enter' ? `Surface load: ${body.data.name}` : `Returning to orbit: ${body.data.name}`
    };

    if (direction === 'enter') {
      this.prepareSceneForBody(body, profile);
    }
  }

  updateTransition(deltaSeconds) {
    const delta = deltaSeconds / Math.max(this.transition.duration, 0.0001);
    this.transition.progress += this.transition.direction === 'enter' ? delta : -delta;
    this.transition.progress = clamp(this.transition.progress, 0, 1);

    if (this.transition.direction === 'enter') {
      if (!this.isActive && this.transition.progress >= 0.34) {
        this.activateSurfaceScene();
      }

      if (this.transition.progress >= 1) {
        this.transition = null;
      }
      return;
    }

    if (this.isActive && this.transition.progress <= 0.28) {
      this.deactivateSurfaceScene();
    }

    if (this.transition.progress <= 0) {
      this.transition = null;
      this.currentBody = null;
      this.currentProfile = null;
      this.lastSampleCenter = null;
    }
  }

  activateSurfaceScene() {
    this.isActive = true;
    this.surfaceRoot.visible = true;
    this.solarSystem.root.visible = false;
    this.starsWereVisible = this.sceneManager.starField.visible;
    const showStars = !this.currentProfile?.atmosphere || this.currentProfile?.showStars;
    this.sceneManager.starField.visible = showStars;
    this.sceneManager.milkyWay.visible = showStars;
  }

  deactivateSurfaceScene() {
    this.isActive = false;
    this.surfaceRoot.visible = false;
    this.solarSystem.root.visible = true;
    this.sceneManager.starField.visible = this.starsWereVisible;
    this.sceneManager.milkyWay.visible = this.starsWereVisible;
    this.sceneManager.scene.fog = this.originalFog;
    this.structure.visible = false;
    this.cloudLayer.visible = false;
    this.gasDome.visible = false;
    this.skyDome.visible = false;
    this.sunDisc.visible = false;
    this.redSpotSprite.visible = false;
    this.ringShadowBand.visible = false;
    this.proxyGroup.clear();
    this.setTreesVisible(false);
    this.setEffectVisible('dust', false);
    this.setEffectVisible('volcanoes', false);
    this.setEffectVisible('geysers', false);
    this.setEffectVisible('ringImpacts', false);
  }

  prepareSceneForBody(body, profile) {
    this.surfaceAmbient.intensity = profile.ambientIntensity ?? 0.25;
    this.surfaceSunLight.intensity = profile.sunIntensity ?? 1.3;
    this.surfaceAmbient.color.set(profile.atmosphere ? '#ffffff' : '#c7d4ff');

    if (profile.atmosphere) {
      this.sceneManager.scene.fog = new THREE.FogExp2(
        profile.fogColor ?? '#7aa7d7',
        profile.fogDensity ?? 0.0002
      );
    } else {
      this.sceneManager.scene.fog = null;
    }

    this.skyDome.visible = profile.type !== 'gas' && Boolean(profile.atmosphere);
    this.gasDome.visible = profile.type === 'gas';
    this.terrainGroup.visible = profile.type !== 'gas';
    this.cloudLayer.visible = Boolean(profile.clouds);
    this.structure.visible = Boolean(profile.structure);
    this.redSpotSprite.visible = Boolean(profile.terrain === 'jupiter');
    this.ringShadowBand.visible = Boolean(profile.ringShadow);
    this.lockedSunDirection = null;

    if (profile.atmosphere) {
      this.skyDome.material.uniforms.rayleighCoeff.value = profile.sky.rayleighCoeff;
      this.skyDome.material.uniforms.mieCoeff.value = profile.sky.mieCoeff;
      this.skyDome.material.uniforms.sunIntensity.value = profile.sky.sunIntensity;
      this.skyDome.material.uniforms.scatteringScale.value = profile.sky.scatteringScale;
      this.skyDome.material.uniforms.zenithColor.value.set(profile.zenithColor);
      this.skyDome.material.uniforms.horizonColor.value.set(profile.horizonColor);
      this.skyDome.material.uniforms.sunsetColor.value.set(profile.sunsetColor);
      this.skyDome.material.uniforms.hazeAmount.value = profile.hazeAmount ?? 0.2;
    }

    if (profile.type === 'gas') {
      this.gasDome.material.uniforms.colorA.value.set(profile.gasColors[0]);
      this.gasDome.material.uniforms.colorB.value.set(profile.gasColors[1]);
      this.gasDome.material.uniforms.colorC.value.set(profile.gasColors[2]);
      this.gasDome.material.uniforms.turbulence.value = profile.turbulence ?? 0.2;
    }

    this.proxyGroup.clear();
    this.createSkyBodies(body, profile);
    this.updateChunkScale(body);
    this.lastSampleCenter = null;
  }

  createSkyBodies(body, profile) {
    if (profile.skyBody) {
      const targetBody = this.solarSystem.getBodyByName(profile.skyBody);

      if (targetBody) {
        this.proxyGroup.add(this.createProxyBody(targetBody, profile.skyBodyAngleDeg));
      }
    }

    if (profile.satellites) {
      for (const satelliteName of profile.satellites) {
        const targetBody = this.solarSystem.getBodyByName(satelliteName);

        if (targetBody) {
          this.proxyGroup.add(this.createProxyBody(targetBody));
        }
      }
    }
  }

  createProxyBody(body, fixedAngleDeg = null) {
    const texture = this.textureFactory.getBodyTexture(body.data);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xffffff
      })
    );
    mesh.userData.sourceBody = body;
    mesh.userData.fixedAngleDeg = fixedAngleDeg;
    return mesh;
  }

  updateChunkScale(body) {
    const nextTileWorldSize = TILE_SIZE_KM * SURFACE_KM_TO_UNITS;

    if (this.tileWorldSize && Math.abs(this.tileWorldSize - nextTileWorldSize) < 0.00001) {
      return;
    }

    this.tileWorldSize = nextTileWorldSize;

    for (const tile of this.tilePool) {
      this.terrainGroup.remove(tile.mesh);
      tile.mesh.geometry.dispose();
    }

    this.tilePool = [];

    for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
      const geometry = new THREE.PlaneGeometry(
        this.tileWorldSize,
        this.tileWorldSize,
        TILE_SEGMENTS,
        TILE_SEGMENTS
      );
      geometry.rotateX(-Math.PI * 0.5);
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3)
      );

      const mesh = new THREE.Mesh(geometry, this.tileMaterial);
      mesh.frustumCulled = false;
      this.terrainGroup.add(mesh);
      this.tilePool.push({ mesh });
    }
  }

  updateSolidEnvironment(deltaSeconds, elapsedTimeSeconds, ship, environment) {
    const body = this.currentBody;
    const profile = this.currentProfile;
    const latLng = body.getLatLngFromWorldPosition(ship.group.position);
    this.currentLatLng = latLng;

    const surfaceNormal = body.getWorldSurfaceNormalFromPosition(ship.group.position, this.tempVector).normalize();
    const east = body.getWorldEastDirectionFromLatLng(latLng.latDeg, latLng.lngDeg, this.tempVector2).normalize();
    const north = this.tempVector3.crossVectors(east, surfaceNormal).normalize();
    const centerTerrain = this.sampleTerrain(body, profile, latLng.latDeg, latLng.lngDeg);
    this.referenceTerrainHeightKm = centerTerrain.heightKm;
    const groundOffsetUnits =
      ship.getShipHeight() * 0.72 + Math.max(environment.altitudeKm, 0) * SURFACE_KM_TO_UNITS;

    makeBasisQuaternion(east, surfaceNormal, north, this.tempQuaternion);
    this.surfaceRoot.quaternion.copy(this.tempQuaternion);
    this.surfaceRoot.position.copy(ship.group.position).addScaledVector(surfaceNormal, -groundOffsetUnits);
    this.surfaceRoot.updateMatrixWorld(true);
    this.terrainGroup.visible = true;

    this.updateSunAndSky(body, profile, elapsedTimeSeconds);
    this.updateTerrainMesh(body, profile, latLng);
    this.updateClouds(body, profile, elapsedTimeSeconds);
    this.updateStructure(body, profile);
    this.updateSkyProxies(body);
    this.updateEffectsForSolidBody(profile, elapsedTimeSeconds);
    this.updateGasVisuals(false, elapsedTimeSeconds);
  }

  updateGasEnvironment(deltaSeconds, elapsedTimeSeconds, ship, environment) {
    const body = this.currentBody;
    const profile = this.currentProfile;
    const surfaceNormal = body.getWorldSurfaceNormalFromPosition(ship.group.position, this.tempVector).normalize();
    const east = this.tempVector2
      .set(1, 0, 0)
      .applyQuaternion(ship.group.quaternion)
      .projectOnPlane(surfaceNormal)
      .normalize();

    if (east.lengthSq() < 0.0001) {
      east.set(1, 0, 0).projectOnPlane(surfaceNormal).normalize();

      if (east.lengthSq() < 0.0001) {
        east.set(0, 0, 1).projectOnPlane(surfaceNormal).normalize();
      }
    }

    const north = this.tempVector3.crossVectors(east, surfaceNormal).normalize();

    makeBasisQuaternion(east, surfaceNormal, north, this.tempQuaternion);
    this.surfaceRoot.quaternion.copy(this.tempQuaternion);
    this.surfaceRoot.position.copy(ship.group.position);
    this.surfaceRoot.updateMatrixWorld(true);
    this.terrainGroup.visible = false;

    this.updateSunAndSky(body, profile, elapsedTimeSeconds);
    this.updateSkyProxies(body);
    this.updateGasVisuals(true, elapsedTimeSeconds);
    this.setTreesVisible(false);
    this.structure.visible = false;
    this.setEffectVisible('dust', false);
    this.setEffectVisible('volcanoes', false);
    this.setEffectVisible('geysers', false);

    if (profile.ringImpacts) {
      this.updateRingImpacts(elapsedTimeSeconds);
    } else {
      this.setEffectVisible('ringImpacts', false);
    }

    ship.applyEnvironmentalDrift(
      new THREE.Vector3(
        Math.sin(elapsedTimeSeconds * 1.8) * profile.turbulence,
        Math.cos(elapsedTimeSeconds * 1.2) * profile.turbulence * 0.75,
        Math.sin(elapsedTimeSeconds * 2.4 + 1.5) * profile.turbulence * 0.65
      ),
      deltaSeconds
    );
  }

  updateSunAndSky(body, profile, elapsedTimeSeconds) {
    const bodyPosition = body.getWorldPosition(this.tempVector);
    const sunPosition = this.solarSystem.sun.getWorldPosition(this.tempVector2);
    const sunDirectionWorld = sunPosition.sub(bodyPosition).normalize();

    if (profile.tidalSunLock && !this.lockedSunDirection) {
      this.lockedSunDirection = sunDirectionWorld.clone();
    } else if (!profile.tidalSunLock) {
      this.lockedSunDirection = null;
    }

    const effectiveSunDirection = this.lockedSunDirection ?? sunDirectionWorld;
    const sunDistance = this.surfaceRoot.position.distanceTo(this.solarSystem.sun.getWorldPosition(this.tempVector2));
    const sunDistanceKm = (sunDistance / 100) * AU_KM;
    const apparentAngle = 2 * Math.atan(this.solarSystem.sun.data.radiusKm / Math.max(sunDistanceKm, 1));
    const sunScale = Math.tan((profile.enlargedSunFactor ?? 1) * apparentAngle * 0.5) * SKY_RADIUS * 2.2;

    this.surfaceSunLight.position.copy(this.surfaceRoot.position).addScaledVector(effectiveSunDirection, 42);
    this.surfaceLightTarget.position.copy(this.surfaceRoot.position);

    const localSunDirection = this.tempVector3
      .copy(effectiveSunDirection)
      .applyQuaternion(this.tempQuaternion2.copy(this.surfaceRoot.quaternion).invert())
      .normalize();

    if (profile.atmosphere && profile.type !== 'gas') {
      this.skyDome.material.uniforms.sunDirection.value.copy(localSunDirection);
    }

    this.sunDisc.visible = true;
    this.sunDisc.position.copy(this.surfaceRoot.position).addScaledVector(effectiveSunDirection, SKY_RADIUS * 0.72);
    this.sunDisc.scale.setScalar(Math.max(sunScale, 0.12));
    this.sunDisc.material.opacity = profile.type === 'gas' ? 0.2 : profile.atmosphere ? 0.78 : 1;

    if (profile.ringShadow) {
      this.ringShadowBand.visible = true;
      this.ringShadowBand.position.set(0, 16, 0);
      this.ringShadowBand.rotation.z = Math.sin(elapsedTimeSeconds * 0.1) * 0.05;
    }

    if (profile.terrain === 'jupiter') {
      this.redSpotSprite.visible = true;
      this.redSpotSprite.position.set(-22, 4, -24);
      this.redSpotSprite.scale.setScalar(18);
      this.redSpotSprite.material.rotation = elapsedTimeSeconds * 0.07;
    } else {
      this.redSpotSprite.visible = false;
    }
  }

  updateTerrainMesh(body, profile, latLng) {
    if (!this.lastSampleCenter) {
      this.lastSampleCenter = { ...latLng };
      this.regenerateTerrain(body, profile, latLng);
      return;
    }

    const radius = Math.max(body.data.radiusKm, 1);
    const northShiftKm = degToRad(latLng.latDeg - this.lastSampleCenter.latDeg) * radius;
    const eastShiftKm =
      degToRad(shortestLongitudeDeltaDegrees(this.lastSampleCenter.lngDeg, latLng.lngDeg)) *
      radius *
      Math.max(Math.cos(degToRad(latLng.latDeg)), 0.15);

    if (Math.abs(northShiftKm) >= 0.25 || Math.abs(eastShiftKm) >= 0.25) {
      this.lastSampleCenter = { ...latLng };
      this.regenerateTerrain(body, profile, latLng);
    }
  }

  regenerateTerrain(body, profile, latLng) {
    const half = GRID_SIZE / 2;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const tile = this.tilePool[row * GRID_SIZE + column];
        const tileEastKm = (column - half + 0.5) * TILE_SIZE_KM;
        const tileNorthKm = (row - half + 0.5) * TILE_SIZE_KM;
        const geometry = tile.mesh.geometry;
        const positions = geometry.attributes.position.array;
        const colors = geometry.attributes.color.array;

        tile.mesh.position.set(
          tileEastKm * SURFACE_KM_TO_UNITS,
          0,
          tileNorthKm * SURFACE_KM_TO_UNITS
        );

        for (let vertex = 0; vertex < geometry.attributes.position.count; vertex += 1) {
          const vertexIndex = vertex * 3;
          const normalizedX = (positions[vertexIndex] / this.tileWorldSize) + 0.5;
          const normalizedZ = (positions[vertexIndex + 2] / this.tileWorldSize) + 0.5;
          const sampleEastKm = tileEastKm + (normalizedX - 0.5) * TILE_SIZE_KM;
          const sampleNorthKm = tileNorthKm + (normalizedZ - 0.5) * TILE_SIZE_KM;
          const sampleLatLng = localOffsetsToLatLng(
            body.data.radiusKm,
            latLng.latDeg,
            latLng.lngDeg,
            sampleEastKm,
            sampleNorthKm
          );
          const terrainSample = this.sampleTerrain(body, profile, sampleLatLng.latDeg, sampleLatLng.lngDeg);

          positions[vertexIndex + 1] =
            (terrainSample.heightKm - (this.referenceTerrainHeightKm ?? 0)) * SURFACE_KM_TO_UNITS;
          colors[vertexIndex] = terrainSample.color.r;
          colors[vertexIndex + 1] = terrainSample.color.g;
          colors[vertexIndex + 2] = terrainSample.color.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    }

    this.populateDecor(body, profile, latLng);
  }

  populateDecor(body, profile, latLng) {
    if (profile.trees) {
      this.populateTrees(body, profile, latLng);
    } else {
      this.setTreesVisible(false);
    }
  }

  populateTrees(body, profile, latLng) {
    const trunkMatrix = this.tempMatrix;
    const crownMatrix = new THREE.Matrix4();
    const trunkPosition = new THREE.Vector3();
    const trunkScale = new THREE.Vector3();
    const crownScale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    let count = 0;

    for (let index = 0; index < this.treeCapacity; index += 1) {
      const eastKm = (pseudoRandom2D(index, 7.1, 3) - 0.5) * (GRID_SIZE - 2);
      const northKm = (pseudoRandom2D(index, 18.4, 5) - 0.5) * (GRID_SIZE - 2);
      const sampleLatLng = localOffsetsToLatLng(
        body.data.radiusKm,
        latLng.latDeg,
        latLng.lngDeg,
        eastKm,
        northKm
      );
      const terrainSample = this.sampleTerrain(body, profile, sampleLatLng.latDeg, sampleLatLng.lngDeg);

      if (terrainSample.biome !== 'plains') {
        continue;
      }

      const heightUnits =
        (terrainSample.heightKm - (this.referenceTerrainHeightKm ?? 0)) * SURFACE_KM_TO_UNITS;
      trunkPosition.set(
        eastKm * SURFACE_KM_TO_UNITS,
        heightUnits + 0.09,
        northKm * SURFACE_KM_TO_UNITS
      );
      trunkScale.set(1, 1 + pseudoRandom2D(index, 12.5, 8) * 0.6, 1);
      crownScale.setScalar(0.85 + pseudoRandom2D(index, 22.5, 9) * 0.55);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pseudoRandom2D(index, 4.3, 10) * Math.PI * 2);

      trunkMatrix.compose(trunkPosition, rotation, trunkScale);
      crownMatrix.compose(
        trunkPosition.clone().add(new THREE.Vector3(0, 0.18 + pseudoRandom2D(index, 6.9, 11) * 0.08, 0)),
        rotation,
        crownScale
      );

      this.treeMeshes.trunks.setMatrixAt(count, trunkMatrix);
      this.treeMeshes.crowns.setMatrixAt(count, crownMatrix);
      count += 1;

      if (count >= this.treeCapacity) {
        break;
      }
    }

    this.treeMeshes.trunks.count = count;
    this.treeMeshes.crowns.count = count;
    this.treeMeshes.trunks.instanceMatrix.needsUpdate = true;
    this.treeMeshes.crowns.instanceMatrix.needsUpdate = true;
    this.setTreesVisible(count > 0);
  }

  setTreesVisible(visible) {
    this.treeMeshes.trunks.visible = visible;
    this.treeMeshes.crowns.visible = visible;
  }

  sampleTerrain(body, profile, latDeg, lngDeg) {
    const noise = this.getNoise(body.data.name);
    const spherical = latLngToSphere(latDeg, lngDeg, this.sampleVector);
    const octave = noise.octaveNoise3D(
      spherical.x * 0.85,
      spherical.y * 0.85,
      spherical.z * 0.85,
      body.data.name === 'Earth' ? 5 : 4,
      0.55,
      2.0
    );
    const fine = noise.octaveNoise3D(spherical.x * 3.4, spherical.y * 3.4, spherical.z * 3.4, 3, 0.52, 2.1);
    const ridged = 1 - Math.abs(noise.noise3D(spherical.x * 2.2, spherical.y * 2.2, spherical.z * 2.2));
    const out = {
      heightKm: 0,
      color: this.tileColor,
      biome: 'rock'
    };

    switch (profile.terrain) {
      case 'earth':
        this.sampleEarthTerrain(octave, fine, ridged, out);
        break;
      case 'moon':
        this.sampleMoonTerrain(latDeg, lngDeg, octave, fine, out);
        break;
      case 'mars':
        this.sampleMarsTerrain(body, latDeg, lngDeg, octave, fine, ridged, out);
        break;
      case 'venus':
        this.sampleVenusTerrain(octave, fine, out);
        break;
      case 'mercury':
        this.sampleMercuryTerrain(latDeg, lngDeg, octave, fine, out);
        break;
      case 'io':
        this.sampleIoTerrain(body, latDeg, lngDeg, octave, fine, out);
        break;
      case 'europa':
        this.sampleEuropaTerrain(octave, fine, ridged, out);
        break;
      case 'titan':
        this.sampleTitanTerrain(octave, fine, ridged, out);
        break;
      case 'triton':
        this.sampleTritonTerrain(octave, fine, out);
        break;
      case 'pluto':
        this.samplePlutoTerrain(body, latDeg, lngDeg, octave, fine, out);
        break;
      default:
        out.heightKm = octave * (profile.maxHeightKm ?? 4);
        out.color.set('#909090');
    }

    return out;
  }

  sampleEarthTerrain(octave, fine, ridged, out) {
    const height = octave * 4.6 + Math.pow(clamp(ridged, 0, 1), 2.5) * 4.2 - 1.8;

    if (height <= 0.05) {
      out.heightKm = 0;
      out.color.set(height < -0.55 ? '#0d3a74' : '#2f7db5');
      out.biome = 'ocean';
      return;
    }

    out.heightKm = height;

    if (height < 1.6) {
      out.color.set(height < 0.5 ? '#2f8d58' : '#5fa35f');
      out.biome = 'plains';
      return;
    }

    if (height > 4.8) {
      out.color.set('#f1f6fb');
      out.biome = 'snow';
      return;
    }

    out.color.set('#7c7f84');
    out.biome = 'mountain';
  }

  sampleMoonTerrain(latDeg, lngDeg, octave, fine, out) {
    const crater = this.sampleCraterField(latDeg, lngDeg, 0.5);
    out.heightKm = octave * 2.0 + fine * 0.45 - crater * 1.7;
    out.color.setScalar(0.46 + fine * 0.08);
    out.biome = 'crater';
  }

  sampleMarsTerrain(body, latDeg, lngDeg, octave, fine, ridged, out) {
    const olympusMask = this.featureMask(body, latDeg, lngDeg, 18.6, -133.8, 720);
    const canyonMask = this.canyonMask(body, latDeg, lngDeg, -14, -72, 2400, 260);
    out.heightKm = octave * 4.6 + ridged * 2.8 + olympusMask * 15 - canyonMask * 6;
    const warmth = 0.45 + fine * 0.2;
    out.color.setRGB(0.52 + warmth * 0.22, 0.23 + warmth * 0.16, 0.12 + warmth * 0.09);
    out.biome = canyonMask > 0.24 ? 'canyon' : olympusMask > 0.2 ? 'volcanic' : 'dust';
  }

  sampleVenusTerrain(octave, fine, out) {
    const cracks = Math.pow(1 - Math.abs(fine), 3);
    out.heightKm = octave * 2.4 + cracks * 1.2;
    out.color.set(cracks > 0.72 ? '#ff812f' : octave > 0.2 ? '#84502d' : '#64381e');
    out.biome = cracks > 0.72 ? 'lava' : 'volcanic';
  }

  sampleMercuryTerrain(latDeg, lngDeg, octave, fine, out) {
    const crater = this.sampleCraterField(latDeg, lngDeg, 0.7);
    out.heightKm = octave * 2.6 + fine * 0.32 - crater * 2.0;
    out.color.set(out.heightKm > 2 ? '#b3b3b6' : '#74767c');
    out.biome = 'crater';
  }

  sampleIoTerrain(body, latDeg, lngDeg, octave, fine, out) {
    const hotspot = Math.max(
      this.featureMask(body, latDeg, lngDeg, 12, 25, 520),
      this.featureMask(body, latDeg, lngDeg, -18, 148, 380),
      this.featureMask(body, latDeg, lngDeg, 42, -90, 420)
    );
    out.heightKm = octave * 3.8 + hotspot * 3.2;
    out.color.set(hotspot > 0.32 ? '#ff6f2d' : out.heightKm > 2.5 ? '#dbb84b' : '#f1dc6b');
    out.biome = hotspot > 0.32 ? 'volcano' : 'sulfur';
  }

  sampleEuropaTerrain(octave, fine, ridged, out) {
    const cracks = Math.pow(clamp(ridged, 0, 1), 4);
    out.heightKm = octave * 0.9 + fine * 0.28;
    out.color.set(cracks > 0.78 ? '#6ea0d8' : out.heightKm > 0.7 ? '#edf6ff' : '#cad8e6');
    out.biome = cracks > 0.78 ? 'crack' : 'ice';
  }

  sampleTitanTerrain(octave, fine, ridged, out) {
    const lakes = octave < -0.16;
    out.heightKm = lakes ? -0.06 : octave * 0.82 + ridged * 0.55;
    out.color.set(lakes ? '#151d26' : fine > 0.18 ? '#966a2f' : '#c98b39');
    out.biome = lakes ? 'lake' : 'dune';
  }

  sampleTritonTerrain(octave, fine, out) {
    out.heightKm = octave * 1.6 + fine * 0.42;
    out.color.set(out.heightKm > 0.9 ? '#ffe4ee' : '#e6edf7');
    out.biome = 'ice';
  }

  samplePlutoTerrain(body, latDeg, lngDeg, octave, fine, out) {
    const heartMask = this.heartMask(body, latDeg, lngDeg, 25, 180, 900);
    out.heightKm = heartMask > 0.22 ? 0.04 : octave * 2.7 + fine * 0.45;
    out.color.set(heartMask > 0.22 ? '#f5f7ff' : out.heightKm > 2.5 ? '#baa48d' : '#d7c6b0');
    out.biome = heartMask > 0.22 ? 'nitrogen-ice' : 'mountain';
  }

  sampleCraterField(latDeg, lngDeg, density) {
    const scaledLat = (latDeg + 90) * density;
    const scaledLng = (lngDeg + 180) * density;
    let craterDepth = 0;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const cellX = Math.floor(scaledLng) + offsetX;
        const cellY = Math.floor(scaledLat) + offsetY;
        const craterX = cellX + pseudoRandom2D(cellX, cellY, 3);
        const craterY = cellY + pseudoRandom2D(cellX, cellY, 7);
        const dx = scaledLng - craterX;
        const dy = scaledLat - craterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 0.16 + pseudoRandom2D(cellX, cellY, 11) * 0.58;
        craterDepth += Math.max(0, 1 - dist / radius) * Math.max(0, 1 - dist / radius);
      }
    }

    return craterDepth * 0.65;
  }

  featureMask(body, latDeg, lngDeg, featureLatDeg, featureLngDeg, radiusKm) {
    const dx =
      degToRad(shortestLongitudeDeltaDegrees(featureLngDeg, lngDeg)) *
      body.data.radiusKm *
      Math.max(Math.cos(degToRad((latDeg + featureLatDeg) * 0.5)), 0.12);
    const dz = degToRad(latDeg - featureLatDeg) * body.data.radiusKm;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return Math.exp(-(distance * distance) / Math.max(radiusKm * radiusKm, 1));
  }

  canyonMask(body, latDeg, lngDeg, featureLatDeg, featureLngDeg, lengthKm, widthKm) {
    const dx =
      degToRad(shortestLongitudeDeltaDegrees(featureLngDeg, lngDeg)) *
      body.data.radiusKm *
      Math.max(Math.cos(degToRad((latDeg + featureLatDeg) * 0.5)), 0.12);
    const dz = degToRad(latDeg - featureLatDeg) * body.data.radiusKm;
    const along = dx / lengthKm;
    const across = dz / widthKm;
    return Math.exp(-(along * along * 0.25 + across * across));
  }

  heartMask(body, latDeg, lngDeg, featureLatDeg, featureLngDeg, scaleKm) {
    const dx =
      degToRad(shortestLongitudeDeltaDegrees(featureLngDeg, lngDeg)) *
      body.data.radiusKm *
      Math.max(Math.cos(degToRad((latDeg + featureLatDeg) * 0.5)), 0.12);
    const dz = degToRad(latDeg - featureLatDeg) * body.data.radiusKm;
    const x = dx / scaleKm;
    const y = dz / scaleKm;
    const shape = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
    return clamp(1 - smoothstep(-0.8, 1.1, shape), 0, 1);
  }

  updateClouds(body, profile, elapsedTimeSeconds) {
    if (!profile.clouds) {
      this.cloudLayer.visible = false;
      return;
    }

    this.cloudLayer.visible = true;
    this.cloudLayer.scale.setScalar(24 * SURFACE_KM_TO_UNITS);
    this.cloudLayer.position.y = profile.cloudHeightKm * SURFACE_KM_TO_UNITS;
    this.cloudLayer.userData.texture.offset.x = elapsedTimeSeconds * 0.0035;
    this.cloudLayer.userData.texture.offset.y = elapsedTimeSeconds * 0.0016;
  }

  updateStructure(body, profile) {
    if (!profile.structure) {
      this.structure.visible = false;
      return;
    }

    const eastKm = this.structureLocalPosition.x;
    const northKm = this.structureLocalPosition.z;
    const sampleLatLng = localOffsetsToLatLng(
      body.data.radiusKm,
      this.currentLatLng.latDeg,
      this.currentLatLng.lngDeg,
      eastKm,
      northKm
    );
    const terrain = this.sampleTerrain(body, profile, sampleLatLng.latDeg, sampleLatLng.lngDeg);

    this.structure.visible = true;
    this.structure.position.set(
      eastKm * SURFACE_KM_TO_UNITS,
      (terrain.heightKm - (this.referenceTerrainHeightKm ?? 0)) * SURFACE_KM_TO_UNITS + 0.14,
      northKm * SURFACE_KM_TO_UNITS
    );
    this.structure.rotation.y = 0.5;
  }

  updateSkyProxies(body) {
    for (const proxy of this.proxyGroup.children) {
      const sourceBody = proxy.userData.sourceBody;
      const direction = sourceBody
        .getWorldPosition(this.tempVector)
        .sub(body.getWorldPosition(this.tempVector2))
        .normalize();
      const angleDeg = proxy.userData.fixedAngleDeg ?? this.estimateSkyBodyAngleDeg(body, sourceBody);
      const scale = Math.max(Math.tan(degToRad(angleDeg * 0.5)) * SKY_RADIUS * 2, 0.4);

      proxy.position.copy(this.surfaceRoot.position).addScaledVector(direction, SKY_RADIUS * 0.68);
      proxy.scale.setScalar(scale);
    }
  }

  estimateSkyBodyAngleDeg(body, sourceBody) {
    if (body.data.parent === sourceBody.data.name) {
      return radToDeg(2 * Math.atan(sourceBody.data.radiusKm / Math.max(body.data.distanceKm, 1)));
    }

    if (sourceBody.data.parent === body.data.name) {
      return radToDeg(2 * Math.atan(sourceBody.data.radiusKm / Math.max(sourceBody.data.distanceKm, 1)));
    }

    return 1.4;
  }

  updateEffectsForSolidBody(profile, elapsedTimeSeconds) {
    this.setEffectVisible('ringImpacts', false);

    if (profile.dustStorms) {
      this.updateDustStorm(elapsedTimeSeconds);
    } else {
      this.setEffectVisible('dust', false);
    }

    if (profile.volcanoes) {
      this.updateVolcanoes(elapsedTimeSeconds);
    } else {
      this.setEffectVisible('volcanoes', false);
    }

    if (profile.geysers) {
      this.updateGeysers(elapsedTimeSeconds);
    } else {
      this.setEffectVisible('geysers', false);
    }
  }

  updateGasVisuals(active, elapsedTimeSeconds) {
    this.gasDome.visible = active;

    if (active) {
      this.gasDome.material.uniforms.time.value = elapsedTimeSeconds;
    }
  }

  updateDustStorm(elapsedTimeSeconds) {
    this.setEffectVisible('dust', true);
    const positions = this.effectSystems.dust.geometry.attributes.position.array;

    for (let index = 0; index < this.effectSystems.dust.userData.count; index += 1) {
      const angle = elapsedTimeSeconds * 0.5 + index * 0.47;
      const radius = 2 + (index % 24) * 0.09;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = 0.3 + Math.sin(angle * 1.7) * 0.28;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }

    this.effectSystems.dust.geometry.attributes.position.needsUpdate = true;
  }

  updateVolcanoes(elapsedTimeSeconds) {
    this.setEffectVisible('volcanoes', true);
    const positions = this.effectSystems.volcanoes.geometry.attributes.position.array;

    for (let index = 0; index < this.effectSystems.volcanoes.userData.count; index += 1) {
      const fountain = index % 3;
      const height = ((elapsedTimeSeconds * 0.8 + index * 0.07) % 1) * 4;
      const baseX = fountain === 0 ? -3.5 : fountain === 1 ? 2.4 : 0.6;
      const baseZ = fountain === 0 ? 2.6 : fountain === 1 ? -2.8 : 3.5;
      positions[index * 3] = baseX + Math.sin(index * 1.3) * 0.18;
      positions[index * 3 + 1] = 0.3 + height;
      positions[index * 3 + 2] = baseZ + Math.cos(index * 0.9) * 0.18;
    }

    this.effectSystems.volcanoes.geometry.attributes.position.needsUpdate = true;
  }

  updateGeysers(elapsedTimeSeconds) {
    this.setEffectVisible('geysers', true);
    const positions = this.effectSystems.geysers.geometry.attributes.position.array;

    for (let index = 0; index < this.effectSystems.geysers.userData.count; index += 1) {
      const column = index % 4;
      const plumeHeight = ((elapsedTimeSeconds * 0.45 + index * 0.11) % 1) * 5.2;
      positions[index * 3] = -4 + column * 2.4 + Math.sin(index * 0.4) * 0.12;
      positions[index * 3 + 1] = plumeHeight;
      positions[index * 3 + 2] = -1.4 + Math.cos(index * 0.6) * 0.14;
    }

    this.effectSystems.geysers.geometry.attributes.position.needsUpdate = true;
  }

  updateRingImpacts(elapsedTimeSeconds) {
    this.setEffectVisible('ringImpacts', true);
    const positions = this.effectSystems.ringImpacts.geometry.attributes.position.array;

    for (let index = 0; index < this.effectSystems.ringImpacts.userData.count; index += 1) {
      const t = (elapsedTimeSeconds * 1.5 + index * 0.017) % 1;
      positions[index * 3] = (pseudoRandom2D(index, 1.7, 2) - 0.5) * 18;
      positions[index * 3 + 1] = 6 - t * 12;
      positions[index * 3 + 2] = (pseudoRandom2D(index, 5.4, 6) - 0.5) * 18;
    }

    this.effectSystems.ringImpacts.geometry.attributes.position.needsUpdate = true;
  }

  setEffectVisible(name, visible) {
    this.effectSystems[name].visible = visible;
  }

  updateState(environment, ship) {
    const localShipPosition = this.tempVector
      .copy(ship.group.position)
      .applyMatrix4(this.tempMatrix.copy(this.surfaceRoot.matrixWorld).invert());
    const structureDistance = this.structure.visible
      ? this.structure.position.distanceTo(localShipPosition)
      : Number.POSITIVE_INFINITY;
    const inStructure = this.currentProfile?.structure && ship.getState().landed && structureDistance < 0.9;
    const hazardActive = this.currentProfile?.type === 'solid';

    this.state = {
      active: this.isActive,
      bodyName: this.currentBody?.data?.name ?? null,
      mode: this.currentProfile?.type === 'gas' ? 'ATMOSPHERIC' : 'SURFACE',
      transitionActive: Boolean(this.transition),
      transitionProgress: this.transition?.progress ?? (this.isActive ? 1 : 0),
      transitionStage: this.transition?.stage ?? '',
      inStructure,
      hazardBodyName: this.currentProfile?.hazardName ?? null,
      hazardActive,
      note: this.describeSurface(),
      depthKm: environment.depthKm ?? 0
    };
  }

  describeSurface() {
    if (!this.currentBody || !this.currentProfile) {
      return 'Cruising in orbital space.';
    }

    switch (this.currentBody.data.name) {
      case 'Earth':
        return 'Cloud deck, trees, and blue-sky scattering active.';
      case 'Moon':
        return 'Airless crater field loaded. Earth is fixed in the black sky.';
      case 'Mars':
        return 'Dust storm bands and canyon terrain active.';
      case 'Venus':
        return 'Dense sulfur haze and volcanic terrain active.';
      case 'Mercury':
        return 'Crater field active. Solar disc enlarged near the horizon.';
      case 'Jupiter':
        return 'Upper atmosphere dive. Turbulence and pressure buildup increasing.';
      case 'Saturn':
        return 'Cloud bands active. Ring shadow and ring-impact visualizers online.';
      case 'Io':
        return 'Sulfur plains and volcanic plumes active.';
      case 'Europa':
        return 'Chaos ice and luminous crack fields active.';
      case 'Titan':
        return 'Methane lakes, dunes, and haze layers active.';
      case 'Triton':
        return 'Cryovolcanic geysers active in Neptune-lit twilight.';
      case 'Pluto':
        return 'Tombaugh Regio and Charon sky proxy active.';
      default:
        return 'Procedural local surface loaded.';
    }
  }

  getHUDState() {
    return this.state;
  }
}
