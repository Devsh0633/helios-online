import * as THREE from 'three';

import atmosphereFragmentShader from '../shaders/atmosphere.glsl?raw';
import {
  calculateBodyVisualRadius,
  degToRad,
  getBodyEnvironmentData
} from '../utils/Constants.js';
import {
  calculateKeplerianPosition,
  calculateRotationAngle,
  sampleOrbit
} from '../core/OrbitalMechanics.js';

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export default class Planet {
  constructor(data, textureFactory) {
    this.data = data;
    this.textureFactory = textureFactory;
    this.group = new THREE.Group();
    this.group.name = data.name;
    this.group.userData.body = this;
    this.visualRadius = calculateBodyVisualRadius(this.data.radiusKm, {
      scale: data.type === 'dwarf-planet' ? 0.92 : 1.0
    });
    this.selected = false;

    this.satelliteContainer = new THREE.Group();
    this.tiltGroup = new THREE.Group();
    this.tiltGroup.rotation.z = degToRad(data.axialTiltDeg ?? 0);
    this.spinGroup = new THREE.Group();
    this.tiltGroup.add(this.spinGroup);
    this.group.add(this.satelliteContainer);
    this.group.add(this.tiltGroup);

    this.lod = this.createLOD();
    this.orbitLine = this.createOrbitLine();
    this.atmosphere = this.createAtmosphere();
    this.selectionGlow = this.createSelectionGlow();
    this.rings = null;
    this.moons = [];

    this.spinGroup.add(this.lod);

    if (this.atmosphere) {
      this.spinGroup.add(this.atmosphere);
    }

    this.spinGroup.add(this.selectionGlow);

    this.tmpPosition = new THREE.Vector3();
    this.tmpWorld = new THREE.Vector3();
    this.tmpQuaternion = new THREE.Quaternion();
  }

  createLOD() {
    const texture = this.textureFactory.getBodyTexture(this.data);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: this.data.classification?.includes('Gas') ? 0.85 : 0.96,
      metalness: 0,
      emissive: new THREE.Color(this.data.color),
      emissiveIntensity: this.data.name === 'Earth' ? 0.02 : 0.012
    });

    const lod = new THREE.LOD();
    const levels = [
      { segments: 64, distance: 0 },
      { segments: 36, distance: Math.max(this.visualRadius * 40, 15) },
      { segments: 18, distance: Math.max(this.visualRadius * 120, 45) }
    ];

    for (const level of levels) {
      const geometry = new THREE.SphereGeometry(this.visualRadius, level.segments, level.segments);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.body = this;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      lod.addLevel(mesh, level.distance);
    }

    return lod;
  }

  createOrbitLine() {
    const points = sampleOrbit(this.data.orbitalElements, 320);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.data.color).multiplyScalar(0.45),
      transparent: true,
      opacity: 0.36
    });
    const line = new THREE.LineLoop(geometry, material);
    line.frustumCulled = true;
    return line;
  }

  createAtmosphere() {
    if (!this.data.atmosphere) {
      return null;
    }

    const geometry = new THREE.SphereGeometry(this.visualRadius * 1.09, 34, 34);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(this.data.atmosphere.color) },
        intensity: { value: this.data.atmosphere.intensity },
        power: { value: this.data.atmosphere.power }
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.body = this;
    return mesh;
  }

  createSelectionGlow() {
    const material = new THREE.MeshBasicMaterial({
      color: this.data.atmosphere?.color ?? this.data.color,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Mesh(
      new THREE.SphereGeometry(this.visualRadius * 1.18, 28, 28),
      material
    );
  }

  setRings(rings) {
    this.rings = rings;
    this.tiltGroup.add(rings.group);
    for (const object of rings.getSelectableObjects()) {
      object.userData.body = this;
    }
  }

  addMoon(moon) {
    this.moons.push(moon);
    this.satelliteContainer.add(moon.group);
  }

  update(daysSinceEpoch, timeSeconds, camera) {
    calculateKeplerianPosition(this.data.orbitalElements, daysSinceEpoch, {}, this.tmpPosition);
    this.group.position.copy(this.tmpPosition);
    this.spinGroup.rotation.y = calculateRotationAngle(daysSinceEpoch, this.data.rotationPeriodDays);

    if (camera) {
      this.lod.update(camera);
    }

    if (this.atmosphere) {
      const baseIntensity = this.data.atmosphere.intensity;
      this.atmosphere.material.uniforms.intensity.value =
        baseIntensity * (this.selected ? 1.22 : 1.0);
    }

    if (this.rings) {
      this.rings.update(timeSeconds, this.selected);
    }

    this.selectionGlow.material.opacity = this.selected ? 0.14 : 0;

    for (const moon of this.moons) {
      moon.update(daysSinceEpoch, camera);
    }
  }

  setSelected(selected) {
    this.selected = selected;
  }

  getSelectableObjects() {
    const objects = [...this.lod.levels.map((level) => level.object)];

    if (this.atmosphere) {
      objects.push(this.atmosphere);
    }

    if (this.rings) {
      objects.push(...this.rings.getSelectableObjects());
    }

    for (const moon of this.moons) {
      objects.push(...moon.getSelectableObjects());
    }

    return objects;
  }

  getWorldPosition(target = new THREE.Vector3()) {
    return this.group.getWorldPosition(target);
  }

  getGravityStrength() {
    return getBodyEnvironmentData(this.data.name, this.data.surfaceGravity).gravityStrength;
  }

  getAtmosphereHeightKm() {
    return getBodyEnvironmentData(this.data.name, this.data.surfaceGravity).atmosphereHeightKm;
  }

  getGravityRadiusUnits() {
    return this.visualRadius * 10;
  }

  isLandable() {
    return !this.data.classification?.includes('Giant');
  }

  getRadiusScaleKmPerUnit() {
    return this.data.radiusKm / Math.max(this.visualRadius, 0.0001);
  }

  getAltitudeKmFromPosition(position) {
    const distanceUnits = position.distanceTo(this.getWorldPosition(this.tmpWorld));
    return (distanceUnits - this.visualRadius) * this.getRadiusScaleKmPerUnit();
  }

  getWorldSurfaceNormalFromLatLng(latDeg, lngDeg, target = new THREE.Vector3()) {
    const lat = degToRad(latDeg);
    const lng = degToRad(lngDeg);
    target.set(
      Math.cos(lat) * Math.cos(lng),
      Math.sin(lat),
      Math.cos(lat) * Math.sin(lng)
    );
    this.spinGroup.getWorldQuaternion(this.tmpQuaternion);
    return target.applyQuaternion(this.tmpQuaternion).normalize();
  }

  getWorldEastDirectionFromLatLng(latDeg, lngDeg, target = new THREE.Vector3()) {
    const lng = degToRad(lngDeg);
    target.set(-Math.sin(lng), 0, Math.cos(lng));
    this.spinGroup.getWorldQuaternion(this.tmpQuaternion);
    return target.applyQuaternion(this.tmpQuaternion).normalize();
  }

  getWorldSurfacePointFromLatLng(latDeg, lngDeg, altitudeUnits = 0, target = new THREE.Vector3()) {
    this.getWorldSurfaceNormalFromLatLng(latDeg, lngDeg, target);
    return target.multiplyScalar(this.visualRadius + altitudeUnits).add(this.getWorldPosition(this.tmpWorld));
  }

  getLatLngFromWorldPosition(position, out = { latDeg: 0, lngDeg: 0 }) {
    const worldNormal = this.getWorldSurfaceNormalFromPosition(position, new THREE.Vector3());
    const inverseQuaternion = this.tmpQuaternion.copy(this.spinGroup.getWorldQuaternion(new THREE.Quaternion())).invert();
    worldNormal.applyQuaternion(inverseQuaternion).normalize();
    out.latDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(worldNormal.y, -1, 1)));
    out.lngDeg = THREE.MathUtils.radToDeg(Math.atan2(worldNormal.z, worldNormal.x));
    return out;
  }

  getWorldSurfaceNormalFromPosition(position, target = new THREE.Vector3()) {
    return target.copy(position).sub(this.getWorldPosition(this.tmpWorld)).normalize();
  }

  getLabelPosition(target = new THREE.Vector3()) {
    return this.getWorldPosition(target).add(new THREE.Vector3(0, this.visualRadius * 1.55, 0));
  }

  getFocusDistance() {
    const ringBoost = this.rings ? this.rings.outerRadius * 1.2 : 0;
    return Math.max(this.visualRadius * 12, ringBoost + this.visualRadius * 6, 6);
  }

  getInfo() {
    const distanceFromSunAu = this.getWorldPosition(this.tmpWorld).length() / 100;

    return {
      name: this.data.name,
      subtitle: this.data.classification,
      radiusKm: this.data.radiusKm,
      gravity: this.data.surfaceGravity,
      moonsCount: this.moons.length,
      distanceFromSunAu
    };
  }
}
