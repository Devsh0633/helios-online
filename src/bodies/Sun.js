import * as THREE from 'three';

import sunCoronaFragmentShader from '../shaders/sunCorona.glsl?raw';
import {
  SUN_DATA,
  calculateBodyVisualRadius,
  getBodyEnvironmentData
} from '../utils/Constants.js';

const billboardVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default class Sun {
  constructor(textureFactory) {
    this.data = SUN_DATA;
    this.textureFactory = textureFactory;
    this.group = new THREE.Group();
    this.group.name = 'Sun';

    this.visualRadius = calculateBodyVisualRadius(this.data.radiusKm, {
      scale: 1.24,
      minimum: 4.25
    });

    this.coreMesh = this.createCore();
    this.coronaMesh = this.createCorona();
    this.haloSprite = this.createHalo();
    this.light = this.createLight();
    this.solarWind = this.createSolarWind();
    this.solarWindMeta = this.createSolarWindMeta();
    this.selectionHalo = this.createSelectionHalo();
    this.selected = false;

    this.group.add(this.coreMesh);
    this.group.add(this.coronaMesh);
    this.group.add(this.haloSprite);
    this.group.add(this.selectionHalo);
    this.group.add(this.solarWind);
    this.group.add(this.light);

    this.tmpVector = new THREE.Vector3();
  }

  createCore() {
    const geometry = new THREE.SphereGeometry(this.visualRadius, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      map: this.textureFactory.getBodyTexture(this.data),
      color: 0xffffff
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.body = this;
    return mesh;
  }

  createCorona() {
    const geometry = new THREE.PlaneGeometry(this.visualRadius * 6.8, this.visualRadius * 6.8);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ffcc65') },
        uColorB: { value: new THREE.Color('#ff8d2d') }
      },
      vertexShader: billboardVertexShader,
      fragmentShader: sunCoronaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 10;
    mesh.userData.body = this;
    return mesh;
  }

  createHalo() {
    const texture = this.textureFactory.createHaloTexture(
      'sun-core',
      'rgba(255, 232, 170, 0.72)',
      'rgba(255, 150, 61, 0.0)'
    );
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(this.visualRadius * 8.5);
    return sprite;
  }

  createSelectionHalo() {
    const texture = this.textureFactory.createHaloTexture(
      'sun-selection',
      'rgba(255, 247, 206, 0.24)',
      'rgba(255, 200, 106, 0.0)'
    );
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(this.visualRadius * 10.5);
    return sprite;
  }

  createLight() {
    const light = new THREE.PointLight('#fff2c2', 11.5, 0, 2);
    light.position.set(0, 0, 0);
    return light;
  }

  createSolarWind() {
    const count = 500;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));

    const material = new THREE.PointsMaterial({
      color: '#ffcb78',
      size: 0.32,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  createSolarWindMeta() {
    const count = 500;
    const metadata = [];

    for (let index = 0; index < count; index += 1) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 0.9 - 0.45,
        Math.random() * 2 - 1
      ).normalize();

      metadata.push({
        direction,
        speed: 0.08 + Math.random() * 0.16,
        phase: Math.random(),
        wobble: Math.random() * 2.2
      });
    }

    return metadata;
  }

  update(daysSinceEpoch, timeSeconds, camera) {
    this.coreMesh.rotation.y = timeSeconds * 0.08;
    this.coronaMesh.quaternion.copy(camera.quaternion);
    this.coronaMesh.material.uniforms.uTime.value = timeSeconds;
    this.haloSprite.material.rotation = timeSeconds * 0.02;
    this.selectionHalo.material.opacity = this.selected ? 0.45 : 0;

    const positions = this.solarWind.geometry.attributes.position.array;

    for (let index = 0; index < this.solarWindMeta.length; index += 1) {
      const meta = this.solarWindMeta[index];
      const progress = (timeSeconds * meta.speed + meta.phase) % 1;
      const distance = this.visualRadius * (1.5 + progress * 26.0);
      const wobble = Math.sin(timeSeconds * 0.8 + meta.wobble + progress * 12.0) * this.visualRadius * 0.18;

      this.tmpVector.copy(meta.direction).multiplyScalar(distance);
      this.tmpVector.y += wobble;

      positions[index * 3] = this.tmpVector.x;
      positions[index * 3 + 1] = this.tmpVector.y;
      positions[index * 3 + 2] = this.tmpVector.z;
    }

    this.solarWind.geometry.attributes.position.needsUpdate = true;
  }

  setSelected(selected) {
    this.selected = selected;
  }

  getSelectableObjects() {
    return [this.coreMesh, this.coronaMesh];
  }

  getWorldPosition(target = new THREE.Vector3()) {
    return this.group.getWorldPosition(target);
  }

  getGravityStrength() {
    return getBodyEnvironmentData(this.data.name, this.data.surfaceGravity).gravityStrength;
  }

  getAtmosphereHeightKm() {
    return 0;
  }

  getGravityRadiusUnits() {
    return this.visualRadius * 10;
  }

  isLandable() {
    return false;
  }

  getRadiusScaleKmPerUnit() {
    return this.data.radiusKm / Math.max(this.visualRadius, 0.0001);
  }

  getAltitudeKmFromPosition(position) {
    return (position.distanceTo(this.getWorldPosition(this.tmpVector)) - this.visualRadius) * this.getRadiusScaleKmPerUnit();
  }

  getWorldSurfaceNormalFromPosition(position, target = new THREE.Vector3()) {
    return target.copy(position).sub(this.getWorldPosition(this.tmpVector)).normalize();
  }

  getLabelPosition(target = new THREE.Vector3()) {
    return this.getWorldPosition(target).add(new THREE.Vector3(0, this.visualRadius * 1.4, 0));
  }

  getFocusDistance() {
    return this.visualRadius * 9.5;
  }

  getInfo() {
    return {
      name: this.data.name,
      subtitle: this.data.description,
      radiusKm: this.data.radiusKm,
      gravity: this.data.surfaceGravity,
      moonsCount: 0,
      distanceFromSunAu: 0
    };
  }
}
