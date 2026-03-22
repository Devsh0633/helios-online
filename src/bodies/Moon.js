import * as THREE from 'three';

import atmosphereFragmentShader from '../shaders/atmosphere.glsl?raw';
import {
  calculateBodyVisualRadius,
  calculateSatelliteVisualDistance,
  degToRad,
  getBodyEnvironmentData
} from '../utils/Constants.js';
import {
  calculateRotationAngle,
  calculateSatellitePosition
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

export default class Moon {
  constructor(data, parentBody, textureFactory) {
    this.data = data;
    this.parentBody = parentBody;
    this.textureFactory = textureFactory;
    this.selected = false;

    this.group = new THREE.Group();
    this.group.name = data.name;
    this.group.userData.body = this;

    this.tiltGroup = new THREE.Group();
    this.tiltGroup.rotation.z = degToRad(data.axialTiltDeg ?? 0);
    this.spinGroup = new THREE.Group();
    this.visualRadius = calculateBodyVisualRadius(this.data.radiusKm, {
      multiplier: 6.8,
      minimum: 0.045
    });
    this.visualOrbitRadius = calculateSatelliteVisualDistance(
      data.distanceKm,
      parentBody.data.radiusKm,
      parentBody.visualRadius
    );

    this.lod = this.createLOD();
    this.atmosphere = this.createAtmosphere();
    this.selectionGlow = this.createSelectionGlow();

    this.spinGroup.add(this.lod);

    if (this.atmosphere) {
      this.spinGroup.add(this.atmosphere);
    }

    this.spinGroup.add(this.selectionGlow);
    this.tiltGroup.add(this.spinGroup);
    this.group.add(this.tiltGroup);

    this.tmpPosition = new THREE.Vector3();
    this.tmpWorld = new THREE.Vector3();
    this.actualOrbitPosition = new THREE.Vector3();
    this.actualDistanceFromSunAu = 0;
    this.tmpQuaternion = new THREE.Quaternion();
  }

  createLOD() {
    const texture = this.textureFactory.getBodyTexture(this.data);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
      emissive: new THREE.Color(this.data.color ?? '#ffffff'),
      emissiveIntensity: 0.015
    });

    const lod = new THREE.LOD();
    const levels = [
      { segments: 40, distance: 0 },
      { segments: 24, distance: Math.max(this.visualRadius * 45, 6) },
      { segments: 14, distance: Math.max(this.visualRadius * 120, 12) }
    ];

    for (const level of levels) {
      const geometry = new THREE.SphereGeometry(this.visualRadius, level.segments, level.segments);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.body = this;
      lod.addLevel(mesh, level.distance);
    }

    return lod;
  }

  createAtmosphere() {
    if (!this.data.atmosphere) {
      return null;
    }

    const geometry = new THREE.SphereGeometry(this.visualRadius * 1.09, 28, 28);
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
      color: this.data.atmosphere?.color ?? this.data.color ?? '#ffffff',
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.visualRadius * 1.18, 24, 24),
      material
    );
    mesh.visible = true;
    return mesh;
  }

  update(daysSinceEpoch, camera) {
    calculateSatellitePosition(this.data, daysSinceEpoch, this.actualOrbitPosition);
    this.actualDistanceFromSunAu =
      this.tmpWorld.copy(this.parentBody.group.position).add(this.actualOrbitPosition).length() / 100;

    this.tmpPosition.copy(this.actualOrbitPosition);
    const length = Math.max(this.tmpPosition.length(), 0.00001);
    this.tmpPosition.multiplyScalar(this.visualOrbitRadius / length);
    this.group.position.copy(this.tmpPosition);

    if (this.data.tidallyLocked) {
      const orbitAngle = Math.atan2(this.group.position.z, this.group.position.x);
      this.spinGroup.rotation.y = orbitAngle + Math.PI;
    } else {
      this.spinGroup.rotation.y = calculateRotationAngle(daysSinceEpoch, this.data.rotationPeriodDays ?? this.data.orbitalPeriodDays);
    }

    if (camera) {
      this.lod.update(camera);
    }

    if (this.atmosphere) {
      this.atmosphere.material.uniforms.intensity.value =
        this.data.atmosphere.intensity * (this.selected ? 1.2 : 1.0);
    }

    this.selectionGlow.material.opacity = this.selected ? 0.16 : 0;
  }

  setSelected(selected) {
    this.selected = selected;
  }

  getSelectableObjects() {
    const objects = [...this.lod.levels.map((level) => level.object)];

    if (this.atmosphere) {
      objects.push(this.atmosphere);
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
    return true;
  }

  getRadiusScaleKmPerUnit() {
    return this.data.radiusKm / Math.max(this.visualRadius, 0.0001);
  }

  getAltitudeKmFromPosition(position) {
    const distanceUnits = position.distanceTo(this.getWorldPosition(this.tmpWorld));
    return (distanceUnits - this.visualRadius) * this.getRadiusScaleKmPerUnit();
  }

  getWorldSurfaceNormalFromPosition(position, target = new THREE.Vector3()) {
    return target.copy(position).sub(this.getWorldPosition(this.tmpWorld)).normalize();
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

  getLabelPosition(target = new THREE.Vector3()) {
    return this.getWorldPosition(target).add(new THREE.Vector3(0, this.visualRadius * 1.5, 0));
  }

  getFocusDistance() {
    return Math.max(this.visualRadius * 12, 2.5);
  }

  getInfo() {
    return {
      name: this.data.name,
      subtitle: `Moon of ${this.parentBody.data.name}`,
      radiusKm: this.data.radiusKm,
      gravity: this.data.surfaceGravity,
      moonsCount: 0,
      distanceFromSunAu: this.actualDistanceFromSunAu
    };
  }
}
