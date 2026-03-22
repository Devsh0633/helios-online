import * as THREE from 'three';

import ringsFragmentShader from '../shaders/rings.glsl?raw';
import { calculateRingVisualDistance } from '../utils/Constants.js';

const ringVertexShader = `
  varying vec2 vUv;
  varying float vRadius;

  void main() {
    vUv = uv;
    vRadius = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default class Rings {
  constructor(config, parentRadiusKm, parentVisualRadius) {
    this.config = config;
    this.parentRadiusKm = parentRadiusKm;
    this.parentVisualRadius = parentVisualRadius;

    this.innerRadius = calculateRingVisualDistance(
      config.innerRadiusKm,
      parentRadiusKm,
      parentVisualRadius
    );
    this.outerRadius = calculateRingVisualDistance(
      config.outerRadiusKm,
      parentRadiusKm,
      parentVisualRadius
    );

    if (config.gapCenterKm > 0) {
      const gapCenterVisual = calculateRingVisualDistance(
        config.gapCenterKm,
        parentRadiusKm,
        parentVisualRadius
      );
      const gapOuterVisual = calculateRingVisualDistance(
        config.gapCenterKm + config.gapWidthKm * 0.5,
        parentRadiusKm,
        parentVisualRadius
      );

      this.gapCenter = gapCenterVisual;
      this.gapHalfWidth = Math.max(gapOuterVisual - gapCenterVisual, 0.015);
    } else {
      this.gapCenter = 0;
      this.gapHalfWidth = 0;
    }

    this.group = new THREE.Group();
    this.group.name = 'Rings';
    this.mesh = this.createMesh();
    this.group.add(this.mesh);
  }

  createMesh() {
    const geometry = new THREE.RingGeometry(this.innerRadius, this.outerRadius, 256, 12);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        innerRadius: { value: this.innerRadius },
        outerRadius: { value: this.outerRadius },
        gapCenter: { value: this.gapCenter },
        gapHalfWidth: { value: this.gapHalfWidth },
        ringColor: { value: new THREE.Color(this.config.color) },
        highlightColor: { value: new THREE.Color(this.config.highlightColor) },
        opacity: { value: this.config.opacity }
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringsFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI * 0.5;
    mesh.renderOrder = 2;
    mesh.frustumCulled = true;
    return mesh;
  }

  update(timeSeconds, selected = false) {
    const pulse = 0.96 + Math.sin(timeSeconds * 0.22) * 0.02;
    this.mesh.material.uniforms.opacity.value = this.config.opacity * pulse * (selected ? 1.15 : 1.0);
  }

  getSelectableObjects() {
    return [this.mesh];
  }
}
