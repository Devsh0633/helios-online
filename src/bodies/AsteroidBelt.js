import * as THREE from 'three';

import {
  auToUnits,
  calculateBodyVisualRadius
} from '../utils/Constants.js';
import {
  calculateKeplerianPosition,
  deriveOrbitalPeriodDaysFromSemiMajorAxis
} from '../core/OrbitalMechanics.js';

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export default class AsteroidBelt {
  constructor(config) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = config.name;
    this.dummy = new THREE.Object3D();

    this.geometry = this.createGeometry();
    this.material = new THREE.MeshStandardMaterial({
      color: '#9a8d7c',
      roughness: 1,
      metalness: 0,
      vertexColors: true
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, config.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = true;
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), auToUnits(config.maxAu) + 40);

    this.instances = this.createInstances();
    this.tmpPosition = new THREE.Vector3();
    this.tmpQuaternion = new THREE.Quaternion();

    this.group.add(this.mesh);
  }

  createGeometry() {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const positions = geometry.attributes.position;

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const scalar = 0.72 + Math.random() * 0.45;
      positions.setXYZ(index, x * scalar, y * scalar, z * scalar);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  createInstances() {
    const instances = [];
    const tempColor = new THREE.Color();

    for (let index = 0; index < this.config.count; index += 1) {
      const semiMajorAxisAu = randomBetween(this.config.minAu, this.config.maxAu);
      const orbitalPeriodDays = deriveOrbitalPeriodDaysFromSemiMajorAxis(semiMajorAxisAu);
      const radiusKm = randomBetween(this.config.radiusKmRange[0], this.config.radiusKmRange[1]);
      const colorIndex = Math.floor(Math.random() * this.config.colorPalette.length);
      const color = tempColor.set(this.config.colorPalette[colorIndex]).clone();
      const scale = calculateBodyVisualRadius(radiusKm, {
        multiplier: 3.6,
        minimum: this.config.name === 'Kuiper Belt' ? 0.02 : 0.03
      });

      const instance = {
        elements: {
          semiMajorAxisAu,
          eccentricity: randomBetween(
            this.config.eccentricityRange[0],
            this.config.eccentricityRange[1]
          ),
          inclinationDeg: randomBetween(0, this.config.inclinationRangeDeg),
          orbitalPeriodDays,
          longitudeOfAscendingNodeDeg: Math.random() * 360,
          argumentOfPeriapsisDeg: Math.random() * 360,
          meanAnomalyAtEpochDeg: Math.random() * 360
        },
        scale,
        axis: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize(),
        rotationSpeed: 0.18 + Math.random() * 0.85,
        phase: Math.random() * Math.PI * 2
      };

      this.mesh.setColorAt(index, color);
      instances.push(instance);
    }

    return instances;
  }

  update(daysSinceEpoch) {
    for (let index = 0; index < this.instances.length; index += 1) {
      const instance = this.instances[index];
      calculateKeplerianPosition(instance.elements, daysSinceEpoch, {}, this.tmpPosition);

      this.tmpQuaternion.setFromAxisAngle(
        instance.axis,
        daysSinceEpoch * instance.rotationSpeed + instance.phase
      );

      this.dummy.position.copy(this.tmpPosition);
      this.dummy.quaternion.copy(this.tmpQuaternion);
      this.dummy.scale.setScalar(instance.scale);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(index, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
