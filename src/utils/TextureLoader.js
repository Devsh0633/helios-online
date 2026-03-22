import * as THREE from 'three';

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function createSeed(name) {
  let hash = 2166136261;

  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function hexToRgb(hex) {
  const color = new THREE.Color(hex);
  return [color.r, color.g, color.b];
}

function blendPalette(palette, value) {
  if (palette.length === 1) {
    return palette[0];
  }

  const scaled = clamp01(value) * (palette.length - 1);
  const leftIndex = Math.floor(scaled);
  const rightIndex = Math.min(leftIndex + 1, palette.length - 1);
  const blend = scaled - leftIndex;
  const left = palette[leftIndex];
  const right = palette[rightIndex];

  return [
    mix(left[0], right[0], blend),
    mix(left[1], right[1], blend),
    mix(left[2], right[2], blend)
  ];
}

export default class ProceduralTextureFactory {
  constructor() {
    this.cache = new Map();
  }

  fractHash(x, y, seed) {
    const value = Math.sin(x * 157.1 + y * 311.7 + seed * 983.1) * 43758.5453123;
    return value - Math.floor(value);
  }

  valueNoise(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const tx = x - x0;
    const ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);

    const n00 = this.fractHash(x0, y0, seed);
    const n10 = this.fractHash(x1, y0, seed);
    const n01 = this.fractHash(x0, y1, seed);
    const n11 = this.fractHash(x1, y1, seed);

    const nx0 = mix(n00, n10, sx);
    const nx1 = mix(n01, n11, sx);

    return mix(nx0, nx1, sy);
  }

  fbm(x, y, seed, octaves = 5) {
    let total = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for (let octave = 0; octave < octaves; octave += 1) {
      total += amplitude * this.valueNoise(x * frequency, y * frequency, seed);
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return total;
  }

  getBodyTexture(body) {
    const key = `body:${body.name}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const size = body.type === 'moon' ? 256 : 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const image = context.createImageData(size, size);
    const data = image.data;
    const palette = (body.textureStyle?.palette ?? [body.color ?? '#888888']).map(hexToRgb);
    const seed = createSeed(body.name);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        const color = this.sampleBodyColor(body, palette, seed, u, v);
        const pointer = (y * size + x) * 4;

        data[pointer] = Math.round(clamp01(color[0]) * 255);
        data[pointer + 1] = Math.round(clamp01(color[1]) * 255);
        data[pointer + 2] = Math.round(clamp01(color[2]) * 255);
        data[pointer + 3] = 255;
      }
    }

    context.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.cache.set(key, texture);
    return texture;
  }

  sampleBodyColor(body, palette, seed, u, v) {
    const textureType = body.textureStyle?.type ?? 'rocky';
    const latitude = v - 0.5;
    const bands = Math.sin((v + seed) * Math.PI * 18.0);
    const contourNoise = this.fbm(u * 6.0 + seed * 11.0, v * 6.0 + seed * 7.0, seed, 5);
    const detailNoise = this.fbm(u * 20.0 + seed * 17.0, v * 20.0 + seed * 5.0, seed + 1.0, 3);

    if (textureType === 'earth') {
      const continent = this.fbm(u * 5.0 + 4.0, v * 4.0 - 2.0, seed + 5.0, 6);
      const oceanMix = smoothstep(0.44, 0.6, continent + Math.sin(u * Math.PI * 6.0) * 0.08);
      const cloudNoise = this.fbm(u * 12.0 + 11.0, v * 10.0 + 18.0, seed + 9.0, 4);
      let color = blendPalette(palette, oceanMix * 0.78);

      if (oceanMix > 0.55) {
        color = blendPalette([hexToRgb('#163750'), hexToRgb('#2d88b7'), hexToRgb('#6bc7ff')], oceanMix);
      }

      const cloudMask = smoothstep(0.64, 0.84, cloudNoise);
      const polar = smoothstep(0.28, 0.46, Math.abs(latitude));

      return [
        mix(color[0], 1.0, cloudMask * 0.72 + polar * 0.35),
        mix(color[1], 1.0, cloudMask * 0.72 + polar * 0.35),
        mix(color[2], 1.0, cloudMask * 0.74 + polar * 0.4)
      ];
    }

    if (textureType === 'venus') {
      const swirl = this.fbm(u * 9.0 + bands * 0.4, v * 13.0 + contourNoise * 0.4, seed + 2.0, 5);
      const tone = clamp01(0.35 + swirl * 0.55 + bands * 0.08);
      return blendPalette(palette, tone);
    }

    if (textureType === 'mars') {
      const canyons = Math.sin((u * 22.0 + contourNoise * 2.0) * Math.PI) * 0.12;
      const tone = clamp01(contourNoise * 0.7 + detailNoise * 0.2 + canyons + 0.12);
      const polar = smoothstep(0.3, 0.45, Math.abs(latitude));
      const base = blendPalette(palette, tone);
      return [
        mix(base[0], 0.95, polar * 0.42),
        mix(base[1], 0.84, polar * 0.3),
        mix(base[2], 0.78, polar * 0.24)
      ];
    }

    if (textureType === 'gas') {
      const turbulence = this.fbm(u * 18.0 + 4.0, v * 3.5 + 8.0, seed + 4.0, 5);
      const tone = clamp01(0.42 + bands * 0.12 + turbulence * 0.55);
      return blendPalette(palette, tone);
    }

    if (textureType === 'ice') {
      const streaks = Math.sin((v + contourNoise * 0.15) * Math.PI * 14.0) * 0.06;
      const tone = clamp01(0.4 + contourNoise * 0.35 + detailNoise * 0.15 + streaks);
      return blendPalette(palette, tone);
    }

    if (textureType === 'dwarf') {
      const patches = this.fbm(u * 8.0 + 2.0, v * 8.0 + 6.0, seed + 2.2, 4);
      const tone = clamp01(0.25 + contourNoise * 0.3 + patches * 0.45);
      return blendPalette(palette, tone);
    }

    if (textureType === 'moon-ice') {
      const fractures = Math.sin((u * 40.0 + v * 10.0 + seed * 5.0) * Math.PI) * 0.1;
      return blendPalette(palette, clamp01(0.3 + contourNoise * 0.55 + fractures));
    }

    if (textureType === 'moon-volcanic') {
      const hotSpots = smoothstep(0.78, 0.95, detailNoise);
      const base = blendPalette(palette, clamp01(0.24 + contourNoise * 0.62));
      return [
        mix(base[0], 1.0, hotSpots * 0.15),
        mix(base[1], 0.62, hotSpots * 0.2),
        mix(base[2], 0.18, hotSpots * 0.1)
      ];
    }

    if (textureType === 'moon-haze') {
      return blendPalette(palette, clamp01(0.3 + contourNoise * 0.5 + bands * 0.08));
    }

    if (textureType === 'asteroid') {
      const chisel = Math.sin((u * 28.0 + v * 20.0 + seed * 13.0) * Math.PI) * 0.08;
      return blendPalette(palette, clamp01(0.18 + contourNoise * 0.5 + chisel));
    }

    if (textureType === 'sun') {
      const granulation = this.fbm(u * 20.0 + 12.0, v * 20.0 + 3.0, seed + 1.0, 5);
      return blendPalette(palette, clamp01(0.28 + granulation * 0.72));
    }

    const craterMask =
      Math.sin((u * 16.0 + seed * 7.0) * Math.PI) *
      Math.sin((v * 14.0 + seed * 11.0) * Math.PI) *
      0.06;

    return blendPalette(palette, clamp01(0.2 + contourNoise * 0.6 + detailNoise * 0.2 + craterMask));
  }

  createHaloTexture(name, innerColor, outerColor) {
    const key = `halo:${name}:${innerColor}:${outerColor}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
      size * 0.5,
      size * 0.5,
      0,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );

    gradient.addColorStop(0.0, innerColor);
    gradient.addColorStop(0.35, innerColor);
    gradient.addColorStop(0.72, outerColor);
    gradient.addColorStop(1.0, 'rgba(0,0,0,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  createMilkyWayTexture() {
    const key = 'panorama:milky-way';

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0.0, '#060916');
    background.addColorStop(0.35, '#090d1f');
    background.addColorStop(0.7, '#02040b');
    background.addColorStop(1.0, '#010205');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    for (let band = 0; band < 1800; band += 1) {
      const x = Math.random() * width;
      const centerLine = height * 0.52 + Math.sin((x / width) * Math.PI * 6.0) * 120;
      const y = centerLine + (Math.random() - 0.5) * 220;
      const radius = Math.random() * 5 + 1;
      const alpha = Math.random() * 0.08 + 0.02;

      context.fillStyle = `rgba(153, 181, 255, ${alpha})`;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    for (let star = 0; star < 4000; star += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 1.6 + 0.2;
      const alpha = Math.random() * 0.7 + 0.1;
      const hue = 200 + Math.random() * 50;

      context.fillStyle = `hsla(${hue}, 70%, ${70 + Math.random() * 25}%, ${alpha})`;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.cache.set(key, texture);
    return texture;
  }
}
