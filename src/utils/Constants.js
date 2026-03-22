export const AU_KM = 149_597_870.7;
export const SCALE_AU_TO_UNITS = 100;
export const KM_TO_UNITS = SCALE_AU_TO_UNITS / AU_KM;
export const MS_PER_DAY = 86_400_000;
export const SECONDS_PER_DAY = 86_400;
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
export const DEFAULT_SIMULATION_SPEED = 50;
export const MAX_SIMULATION_SPEED = 1000;
export const MIN_SIMULATION_SPEED = 1;

export const CAMERA_MODES = {
  SYSTEM_VIEW: 'SYSTEM_VIEW',
  PLANET_ORBIT: 'PLANET_ORBIT',
  SURFACE_APPROACH: 'SURFACE_APPROACH'
};

export const SUN_DATA = {
  name: 'Sun',
  type: 'star',
  radiusKm: 696_340,
  rotationPeriodDays: 25.05,
  surfaceGravity: 274.0,
  color: '#ffcf75',
  description: 'G2V main-sequence star',
  textureStyle: {
    type: 'sun',
    palette: ['#ff8f2a', '#ffbe58', '#fff4b4']
  }
};

export const PLANETARY_DATA = [
  {
    name: 'Mercury',
    type: 'planet',
    classification: 'Terrestrial',
    color: '#b5b5b5',
    radiusKm: 2439.7,
    axialTiltDeg: 0.034,
    rotationPeriodDays: 58.65,
    surfaceGravity: 3.7,
    atmosphere: {
      color: '#9bb2cf',
      intensity: 0.16,
      power: 3.2
    },
    orbitalElements: {
      semiMajorAxisAu: 0.387,
      eccentricity: 0.2056,
      inclinationDeg: 7.0,
      orbitalPeriodDays: 87.97,
      longitudeOfAscendingNodeDeg: 48.331,
      argumentOfPeriapsisDeg: 29.124,
      meanAnomalyAtEpochDeg: 174.796
    },
    textureStyle: {
      type: 'rocky',
      palette: ['#46484d', '#8b837f', '#d0ccc6']
    }
  },
  {
    name: 'Venus',
    type: 'planet',
    classification: 'Terrestrial',
    color: '#e8cda0',
    radiusKm: 6051.8,
    axialTiltDeg: 177.4,
    rotationPeriodDays: -243,
    surfaceGravity: 8.87,
    atmosphere: {
      color: '#ffb86f',
      intensity: 0.42,
      power: 2.5
    },
    orbitalElements: {
      semiMajorAxisAu: 0.723,
      eccentricity: 0.0067,
      inclinationDeg: 3.39,
      orbitalPeriodDays: 224.7,
      longitudeOfAscendingNodeDeg: 76.68,
      argumentOfPeriapsisDeg: 54.884,
      meanAnomalyAtEpochDeg: 50.115
    },
    textureStyle: {
      type: 'venus',
      palette: ['#7c5f34', '#d6b172', '#f6d9a7']
    }
  },
  {
    name: 'Earth',
    type: 'planet',
    classification: 'Terrestrial',
    color: '#4fa3d3',
    radiusKm: 6371,
    axialTiltDeg: 23.44,
    rotationPeriodDays: 1,
    surfaceGravity: 9.81,
    atmosphere: {
      color: '#b4e4ff',
      secondaryColor: '#ffffff',
      intensity: 0.48,
      power: 2.8
    },
    orbitalElements: {
      semiMajorAxisAu: 1.0,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      orbitalPeriodDays: 365.25,
      longitudeOfAscendingNodeDeg: -11.26064,
      argumentOfPeriapsisDeg: 114.20783,
      meanAnomalyAtEpochDeg: 357.51716
    },
    textureStyle: {
      type: 'earth',
      palette: ['#184b6a', '#2f78a5', '#4ea77a', '#a18c58', '#f4f9ff']
    }
  },
  {
    name: 'Mars',
    type: 'planet',
    classification: 'Terrestrial',
    color: '#c1440e',
    radiusKm: 3389.5,
    axialTiltDeg: 25.19,
    rotationPeriodDays: 1.026,
    surfaceGravity: 3.71,
    atmosphere: {
      color: '#ff8466',
      intensity: 0.34,
      power: 2.9
    },
    orbitalElements: {
      semiMajorAxisAu: 1.524,
      eccentricity: 0.0934,
      inclinationDeg: 1.85,
      orbitalPeriodDays: 686.97,
      longitudeOfAscendingNodeDeg: 49.558,
      argumentOfPeriapsisDeg: 286.502,
      meanAnomalyAtEpochDeg: 19.373
    },
    textureStyle: {
      type: 'mars',
      palette: ['#4d2117', '#8e3b24', '#c76436', '#d99b67']
    }
  },
  {
    name: 'Jupiter',
    type: 'planet',
    classification: 'Gas Giant',
    color: '#c88b3a',
    radiusKm: 69_911,
    axialTiltDeg: 3.13,
    rotationPeriodDays: 0.414,
    surfaceGravity: 24.79,
    atmosphere: {
      color: '#ffe1bb',
      intensity: 0.22,
      power: 2.2
    },
    orbitalElements: {
      semiMajorAxisAu: 5.203,
      eccentricity: 0.0489,
      inclinationDeg: 1.305,
      orbitalPeriodDays: 4332.59,
      longitudeOfAscendingNodeDeg: 100.464,
      argumentOfPeriapsisDeg: 273.867,
      meanAnomalyAtEpochDeg: 20.02
    },
    textureStyle: {
      type: 'gas',
      palette: ['#5c4434', '#a96e44', '#d7b487', '#f4e1c1']
    }
  },
  {
    name: 'Saturn',
    type: 'planet',
    classification: 'Gas Giant',
    color: '#e4d191',
    radiusKm: 58_232,
    axialTiltDeg: 26.73,
    rotationPeriodDays: 0.444,
    surfaceGravity: 10.44,
    atmosphere: {
      color: '#f4dfaa',
      intensity: 0.26,
      power: 2.2
    },
    orbitalElements: {
      semiMajorAxisAu: 9.537,
      eccentricity: 0.0565,
      inclinationDeg: 2.485,
      orbitalPeriodDays: 10_759,
      longitudeOfAscendingNodeDeg: 113.665,
      argumentOfPeriapsisDeg: 339.392,
      meanAnomalyAtEpochDeg: 317.02
    },
    textureStyle: {
      type: 'gas',
      palette: ['#77623c', '#b89b5b', '#e5d39a', '#f7eed1']
    }
  },
  {
    name: 'Uranus',
    type: 'planet',
    classification: 'Ice Giant',
    color: '#7de8e8',
    radiusKm: 25_362,
    axialTiltDeg: 97.77,
    rotationPeriodDays: -0.718,
    surfaceGravity: 8.69,
    atmosphere: {
      color: '#a5ffff',
      intensity: 0.31,
      power: 2.35
    },
    orbitalElements: {
      semiMajorAxisAu: 19.19,
      eccentricity: 0.0457,
      inclinationDeg: 0.772,
      orbitalPeriodDays: 30_687,
      longitudeOfAscendingNodeDeg: 74.006,
      argumentOfPeriapsisDeg: 96.999,
      meanAnomalyAtEpochDeg: 142.2386
    },
    textureStyle: {
      type: 'ice',
      palette: ['#3f6f72', '#69a5b2', '#95d8da', '#d8ffff']
    }
  },
  {
    name: 'Neptune',
    type: 'planet',
    classification: 'Ice Giant',
    color: '#4b70dd',
    radiusKm: 24_622,
    axialTiltDeg: 28.32,
    rotationPeriodDays: 0.671,
    surfaceGravity: 11.15,
    atmosphere: {
      color: '#87a8ff',
      intensity: 0.33,
      power: 2.4
    },
    orbitalElements: {
      semiMajorAxisAu: 30.07,
      eccentricity: 0.0113,
      inclinationDeg: 1.769,
      orbitalPeriodDays: 60_190,
      longitudeOfAscendingNodeDeg: 131.784,
      argumentOfPeriapsisDeg: 273.187,
      meanAnomalyAtEpochDeg: 256.228
    },
    textureStyle: {
      type: 'ice',
      palette: ['#182c6d', '#3656be', '#5d82ff', '#b4c6ff']
    }
  },
  {
    name: 'Pluto',
    type: 'dwarf-planet',
    classification: 'Dwarf Planet',
    color: '#c2b280',
    radiusKm: 1188.3,
    axialTiltDeg: 119.6,
    rotationPeriodDays: -6.387,
    surfaceGravity: 0.62,
    atmosphere: {
      color: '#dfd2ad',
      intensity: 0.18,
      power: 3.0
    },
    orbitalElements: {
      semiMajorAxisAu: 39.48,
      eccentricity: 0.2488,
      inclinationDeg: 17.14,
      orbitalPeriodDays: 90_560,
      longitudeOfAscendingNodeDeg: 110.299,
      argumentOfPeriapsisDeg: 113.834,
      meanAnomalyAtEpochDeg: 14.53
    },
    textureStyle: {
      type: 'dwarf',
      palette: ['#6c5e4b', '#9d8c71', '#cdbb9b', '#ece4ce']
    }
  }
];

export const MOON_DATA_BY_PARENT = {
  Earth: [
    {
      name: 'Moon',
      parent: 'Earth',
      type: 'moon',
      distanceKm: 384_400,
      radiusKm: 1737.4,
      orbitalPeriodDays: 27.32,
      surfaceGravity: 1.62,
      color: '#d8d6cf',
      textureStyle: {
        type: 'moon',
        palette: ['#55575c', '#8a8d93', '#d7d9df']
      },
      meanAnomalyAtEpochDeg: 32
    }
  ],
  Mars: [
    {
      name: 'Phobos',
      parent: 'Mars',
      type: 'moon',
      distanceKm: 9376,
      radiusKm: 11.2,
      orbitalPeriodDays: 0.319,
      surfaceGravity: 0.0057,
      color: '#94816d',
      textureStyle: {
        type: 'asteroid',
        palette: ['#3d3128', '#6c5645', '#a3886d']
      },
      meanAnomalyAtEpochDeg: 110
    },
    {
      name: 'Deimos',
      parent: 'Mars',
      type: 'moon',
      distanceKm: 23_458,
      radiusKm: 6.2,
      orbitalPeriodDays: 1.263,
      surfaceGravity: 0.003,
      color: '#9d8c76',
      textureStyle: {
        type: 'asteroid',
        palette: ['#40342a', '#73614f', '#a89577']
      },
      meanAnomalyAtEpochDeg: 260
    }
  ],
  Jupiter: [
    {
      name: 'Io',
      parent: 'Jupiter',
      type: 'moon',
      distanceKm: 421_800,
      radiusKm: 1821,
      orbitalPeriodDays: 1.769,
      surfaceGravity: 1.796,
      color: '#f4d472',
      textureStyle: {
        type: 'moon-volcanic',
        palette: ['#6b4d21', '#d79a36', '#f7e6a1']
      },
      meanAnomalyAtEpochDeg: 20
    },
    {
      name: 'Europa',
      parent: 'Jupiter',
      type: 'moon',
      distanceKm: 671_100,
      radiusKm: 1560,
      orbitalPeriodDays: 3.551,
      surfaceGravity: 1.315,
      color: '#d8cab2',
      textureStyle: {
        type: 'moon-ice',
        palette: ['#534d43', '#b59c7c', '#ebddc8', '#f7f2e8']
      },
      meanAnomalyAtEpochDeg: 120
    },
    {
      name: 'Ganymede',
      parent: 'Jupiter',
      type: 'moon',
      distanceKm: 1_070_400,
      radiusKm: 2634,
      orbitalPeriodDays: 7.155,
      surfaceGravity: 1.428,
      color: '#968667',
      textureStyle: {
        type: 'moon',
        palette: ['#3f372a', '#7f6f58', '#c1b18f']
      },
      meanAnomalyAtEpochDeg: 225
    },
    {
      name: 'Callisto',
      parent: 'Jupiter',
      type: 'moon',
      distanceKm: 1_882_700,
      radiusKm: 2410,
      orbitalPeriodDays: 16.69,
      surfaceGravity: 1.235,
      color: '#766a58',
      textureStyle: {
        type: 'moon',
        palette: ['#2a241f', '#665a4c', '#a59784']
      },
      meanAnomalyAtEpochDeg: 312
    }
  ],
  Saturn: [
    {
      name: 'Titan',
      parent: 'Saturn',
      type: 'moon',
      distanceKm: 1_221_870,
      radiusKm: 2574,
      orbitalPeriodDays: 15.95,
      surfaceGravity: 1.352,
      color: '#f1a046',
      atmosphere: {
        color: '#f4a153',
        intensity: 0.42,
        power: 2.4
      },
      textureStyle: {
        type: 'moon-haze',
        palette: ['#58371b', '#a86429', '#efac54']
      },
      meanAnomalyAtEpochDeg: 46
    },
    {
      name: 'Enceladus',
      parent: 'Saturn',
      type: 'moon',
      distanceKm: 238_020,
      radiusKm: 252,
      orbitalPeriodDays: 1.37,
      surfaceGravity: 0.113,
      color: '#e9f7ff',
      textureStyle: {
        type: 'moon-ice',
        palette: ['#4d6067', '#b8d4de', '#f5fbff']
      },
      meanAnomalyAtEpochDeg: 150
    },
    {
      name: 'Mimas',
      parent: 'Saturn',
      type: 'moon',
      distanceKm: 185_540,
      radiusKm: 198,
      orbitalPeriodDays: 0.942,
      surfaceGravity: 0.064,
      color: '#e4ddd6',
      textureStyle: {
        type: 'moon',
        palette: ['#57514b', '#9f9588', '#dfd8cf']
      },
      meanAnomalyAtEpochDeg: 278
    },
    {
      name: 'Rhea',
      parent: 'Saturn',
      type: 'moon',
      distanceKm: 527_070,
      radiusKm: 764,
      orbitalPeriodDays: 4.518,
      surfaceGravity: 0.264,
      color: '#dad8d1',
      textureStyle: {
        type: 'moon',
        palette: ['#5b5752', '#a8a39c', '#e2dfd8']
      },
      meanAnomalyAtEpochDeg: 98
    },
    {
      name: 'Dione',
      parent: 'Saturn',
      type: 'moon',
      distanceKm: 377_420,
      radiusKm: 561,
      orbitalPeriodDays: 2.737,
      surfaceGravity: 0.232,
      color: '#d7d1ca',
      textureStyle: {
        type: 'moon',
        palette: ['#524d48', '#938b84', '#d8d1ca']
      },
      meanAnomalyAtEpochDeg: 204
    },
    {
      name: 'Tethys',
      parent: 'Saturn',
      type: 'moon',
      distanceKm: 294_660,
      radiusKm: 531,
      orbitalPeriodDays: 1.888,
      surfaceGravity: 0.145,
      color: '#f0e7d8',
      textureStyle: {
        type: 'moon-ice',
        palette: ['#5d6364', '#c2cbc8', '#faf8f2']
      },
      meanAnomalyAtEpochDeg: 336
    }
  ],
  Uranus: [
    {
      name: 'Miranda',
      parent: 'Uranus',
      type: 'moon',
      distanceKm: 129_900,
      radiusKm: 235,
      orbitalPeriodDays: 1.413,
      surfaceGravity: 0.079,
      color: '#d7d2c8',
      textureStyle: {
        type: 'moon',
        palette: ['#5e5850', '#9b9388', '#ddd7ce']
      },
      meanAnomalyAtEpochDeg: 72
    },
    {
      name: 'Ariel',
      parent: 'Uranus',
      type: 'moon',
      distanceKm: 190_900,
      radiusKm: 578,
      orbitalPeriodDays: 2.52,
      surfaceGravity: 0.269,
      color: '#ddd7ca',
      textureStyle: {
        type: 'moon-ice',
        palette: ['#57656c', '#b0bcc0', '#f5f6ef']
      },
      meanAnomalyAtEpochDeg: 148
    },
    {
      name: 'Umbriel',
      parent: 'Uranus',
      type: 'moon',
      distanceKm: 266_000,
      radiusKm: 584,
      orbitalPeriodDays: 4.144,
      surfaceGravity: 0.2,
      color: '#655d52',
      textureStyle: {
        type: 'moon',
        palette: ['#22201e', '#5c544c', '#8b8479']
      },
      meanAnomalyAtEpochDeg: 220
    },
    {
      name: 'Titania',
      parent: 'Uranus',
      type: 'moon',
      distanceKm: 436_300,
      radiusKm: 788,
      orbitalPeriodDays: 8.706,
      surfaceGravity: 0.379,
      color: '#bcb3a8',
      textureStyle: {
        type: 'moon',
        palette: ['#4b433b', '#8d8277', '#c6beb1']
      },
      meanAnomalyAtEpochDeg: 298
    },
    {
      name: 'Oberon',
      parent: 'Uranus',
      type: 'moon',
      distanceKm: 583_500,
      radiusKm: 761,
      orbitalPeriodDays: 13.463,
      surfaceGravity: 0.346,
      color: '#94897b',
      textureStyle: {
        type: 'moon',
        palette: ['#302a24', '#74695d', '#aba091']
      },
      meanAnomalyAtEpochDeg: 24
    }
  ],
  Neptune: [
    {
      name: 'Triton',
      parent: 'Neptune',
      type: 'moon',
      distanceKm: 354_760,
      radiusKm: 1353,
      orbitalPeriodDays: 5.877,
      surfaceGravity: 0.779,
      color: '#dcd9d1',
      retrograde: true,
      textureStyle: {
        type: 'moon-ice',
        palette: ['#5c646c', '#c0ccd4', '#f5f8ff']
      },
      meanAnomalyAtEpochDeg: 48
    },
    {
      name: 'Proteus',
      parent: 'Neptune',
      type: 'moon',
      distanceKm: 117_647,
      radiusKm: 210,
      orbitalPeriodDays: 1.122,
      surfaceGravity: 0.07,
      color: '#7f7569',
      textureStyle: {
        type: 'moon',
        palette: ['#2d2927', '#6c6259', '#9f9487']
      },
      meanAnomalyAtEpochDeg: 230
    }
  ],
  Pluto: [
    {
      name: 'Charon',
      parent: 'Pluto',
      type: 'moon',
      distanceKm: 19_591,
      radiusKm: 606,
      orbitalPeriodDays: 6.387,
      surfaceGravity: 0.288,
      color: '#9d9487',
      tidallyLocked: true,
      textureStyle: {
        type: 'moon',
        palette: ['#3b352f', '#7e7468', '#b6ada0']
      },
      meanAnomalyAtEpochDeg: 182
    }
  ]
};

export const RING_SYSTEMS = {
  Saturn: {
    innerRadiusKm: 74_500,
    outerRadiusKm: 140_200,
    gapCenterKm: 117_580,
    gapWidthKm: 4_800,
    color: '#d6c19b',
    highlightColor: '#fff4d8',
    opacity: 0.84
  },
  Uranus: {
    innerRadiusKm: 38_000,
    outerRadiusKm: 51_000,
    gapCenterKm: 0,
    gapWidthKm: 0,
    color: '#a8d9de',
    highlightColor: '#e8ffff',
    opacity: 0.42
  }
};

export const BELT_CONFIGS = {
  asteroid: {
    name: 'Asteroid Belt',
    count: 2000,
    minAu: 2.2,
    maxAu: 3.2,
    inclinationRangeDeg: 14,
    eccentricityRange: [0.01, 0.16],
    radiusKmRange: [1, 50],
    colorPalette: ['#5a5045', '#80715f', '#aea08a']
  },
  kuiper: {
    name: 'Kuiper Belt',
    count: 500,
    minAu: 30,
    maxAu: 50,
    inclinationRangeDeg: 28,
    eccentricityRange: [0.02, 0.22],
    radiusKmRange: [1, 20],
    colorPalette: ['#6b6f7b', '#96a0ae', '#c6d1dd']
  }
};

export const BODY_ENVIRONMENT_DATA = {
  Sun: { gravityStrength: 274, atmosphereHeightKm: 0 },
  Mercury: { gravityStrength: 3.7, atmosphereHeightKm: 0 },
  Venus: { gravityStrength: 8.87, atmosphereHeightKm: 250 },
  Earth: { gravityStrength: 9.81, atmosphereHeightKm: 100 },
  Moon: { gravityStrength: 1.62, atmosphereHeightKm: 0 },
  Mars: { gravityStrength: 3.72, atmosphereHeightKm: 200 },
  Phobos: { gravityStrength: 0.006, atmosphereHeightKm: 0 },
  Deimos: { gravityStrength: 0.004, atmosphereHeightKm: 0 },
  Jupiter: { gravityStrength: 24.79, atmosphereHeightKm: 5000 },
  Io: { gravityStrength: 1.8, atmosphereHeightKm: 0 },
  Europa: { gravityStrength: 1.31, atmosphereHeightKm: 0 },
  Ganymede: { gravityStrength: 1.43, atmosphereHeightKm: 0 },
  Callisto: { gravityStrength: 1.24, atmosphereHeightKm: 0 },
  Saturn: { gravityStrength: 10.44, atmosphereHeightKm: 4000 },
  Titan: { gravityStrength: 1.35, atmosphereHeightKm: 600 },
  Enceladus: { gravityStrength: 0.11, atmosphereHeightKm: 0 },
  Uranus: { gravityStrength: 8.87, atmosphereHeightKm: 0 },
  Neptune: { gravityStrength: 11.15, atmosphereHeightKm: 0 },
  Triton: { gravityStrength: 0.78, atmosphereHeightKm: 0 },
  Pluto: { gravityStrength: 0.62, atmosphereHeightKm: 0 },
  Charon: { gravityStrength: 0.28, atmosphereHeightKm: 0 }
};

export function kmToAu(km) {
  return km / AU_KM;
}

export function auToUnits(au) {
  return au * SCALE_AU_TO_UNITS;
}

export function kmToUnits(km) {
  return km * KM_TO_UNITS;
}

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function calculateBodyVisualRadius(radiusKm, options = {}) {
  const {
    exponent = 0.6,
    multiplier = 7.2,
    minimum = 0.085,
    scale = 1
  } = options;

  const actualUnits = Math.max(kmToUnits(radiusKm), 0.00001);
  return Math.max(Math.pow(actualUnits, exponent) * multiplier * scale, minimum);
}

export function calculateSatelliteVisualDistance(distanceKm, parentRadiusKm, parentVisualRadius) {
  const actualUnits = kmToUnits(distanceKm);
  const ratio = distanceKm / Math.max(parentRadiusKm, 1);
  const visibilityRadius = parentVisualRadius * (1.45 + Math.log10(ratio + 1.0) * 0.9);
  return Math.max(actualUnits * 6.0, visibilityRadius);
}

export function calculateRingVisualDistance(distanceKm, parentRadiusKm, parentVisualRadius) {
  const actualUnits = kmToUnits(distanceKm);
  const ratio = distanceKm / Math.max(parentRadiusKm, 1);
  const visualRatio = parentVisualRadius * Math.max(1.08, ratio * 0.75);
  return Math.max(actualUnits * 8.0, visualRatio);
}

export function getMoonCountForPlanet(name) {
  return MOON_DATA_BY_PARENT[name]?.length ?? 0;
}

export function getBodyEnvironmentData(name, fallbackGravity = 0) {
  return BODY_ENVIRONMENT_DATA[name] ?? {
    gravityStrength: fallbackGravity,
    atmosphereHeightKm: 0
  };
}
