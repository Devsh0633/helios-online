const GRADIENTS = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1]
];

function fastFloor(value) {
  return value >= 0 ? Math.floor(value) : Math.floor(value) - 1;
}

function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default class SimplexNoise {
  constructor(seed = 1337) {
    const random = mulberry32(seed);
    const permutation = new Uint8Array(256);

    for (let index = 0; index < 256; index += 1) {
      permutation[index] = index;
    }

    for (let index = 255; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const value = permutation[index];
      permutation[index] = permutation[swapIndex];
      permutation[swapIndex] = value;
    }

    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    for (let index = 0; index < 512; index += 1) {
      this.perm[index] = permutation[index & 255];
      this.permMod12[index] = this.perm[index] % 12;
    }
  }

  noise3D(xin, yin, zin) {
    const F3 = 1 / 3;
    const G3 = 1 / 6;
    const skew = (xin + yin + zin) * F3;
    const i = fastFloor(xin + skew);
    const j = fastFloor(yin + skew);
    const k = fastFloor(zin + skew);
    const unskew = (i + j + k) * G3;
    const x0 = xin - (i - unskew);
    const y0 = yin - (j - unskew);
    const z0 = zin - (k - unskew);

    let i1 = 0;
    let j1 = 0;
    let k1 = 0;
    let i2 = 0;
    let j2 = 0;
    let k2 = 0;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        i2 = 1;
        j2 = 1;
      } else if (x0 >= z0) {
        i1 = 1;
        i2 = 1;
        k2 = 1;
      } else {
        k1 = 1;
        i2 = 1;
        k2 = 1;
      }
    } else if (y0 < z0) {
      k1 = 1;
      j2 = 1;
      k2 = 1;
    } else if (x0 < z0) {
      j1 = 1;
      j2 = 1;
      k2 = 1;
    } else {
      j1 = 1;
      i2 = 1;
      j2 = 1;
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]];
    const gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]];
    const gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]];

    return (
      32 *
      (this.cornerContribution(gi0, x0, y0, z0) +
        this.cornerContribution(gi1, x1, y1, z1) +
        this.cornerContribution(gi2, x2, y2, z2) +
        this.cornerContribution(gi3, x3, y3, z3))
    );
  }

  cornerContribution(gradientIndex, x, y, z) {
    let t = 0.6 - x * x - y * y - z * z;

    if (t < 0) {
      return 0;
    }

    t *= t;
    const gradient = GRADIENTS[gradientIndex];
    return t * t * (gradient[0] * x + gradient[1] * y + gradient[2] * z);
  }

  octaveNoise3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2) {
    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    let normalizer = 0;

    for (let octave = 0; octave < octaves; octave += 1) {
      total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      normalizer += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return normalizer > 0 ? total / normalizer : 0;
  }
}
