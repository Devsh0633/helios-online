import * as THREE from 'three';

import {
  J2000_EPOCH_MS,
  MS_PER_DAY,
  auToUnits,
  degToRad,
  kmToAu
} from '../utils/Constants.js';

const TAU = Math.PI * 2;

export function normalizeRadians(angle) {
  let normalized = angle % TAU;

  if (normalized < 0) {
    normalized += TAU;
  }

  return normalized;
}

export function dateToDaysSinceJ2000(date) {
  return (date.getTime() - J2000_EPOCH_MS) / MS_PER_DAY;
}

export function solveEccentricAnomaly(meanAnomaly, eccentricity, tolerance = 1e-7, maxIterations = 16) {
  const M = normalizeRadians(meanAnomaly);
  let eccentricAnomaly = eccentricity < 0.8 ? M : Math.PI;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const delta =
      (
        eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        M
      ) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));

    eccentricAnomaly -= delta;

    if (Math.abs(delta) < tolerance) {
      break;
    }
  }

  return eccentricAnomaly;
}

export function eccentricToTrueAnomaly(eccentricAnomaly, eccentricity) {
  const numerator = Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2);
  const denominator = Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2);
  return 2 * Math.atan2(numerator, denominator);
}

export function orbitalRadius(semiMajorAxisAu, eccentricity, eccentricAnomaly) {
  return semiMajorAxisAu * (1 - eccentricity * Math.cos(eccentricAnomaly));
}

export function orbitalToCartesian(radiusAu, trueAnomaly, elements, out = new THREE.Vector3()) {
  const ascendingNode = degToRad(elements.longitudeOfAscendingNodeDeg ?? 0);
  const inclination = degToRad(elements.inclinationDeg ?? 0);
  const periapsis = degToRad(elements.argumentOfPeriapsisDeg ?? 0);
  const argument = periapsis + trueAnomaly;

  const xAu =
    radiusAu *
    (
      Math.cos(ascendingNode) * Math.cos(argument) -
      Math.sin(ascendingNode) * Math.sin(argument) * Math.cos(inclination)
    );
  const yAu = radiusAu * Math.sin(argument) * Math.sin(inclination);
  const zAu =
    radiusAu *
    (
      Math.sin(ascendingNode) * Math.cos(argument) +
      Math.cos(ascendingNode) * Math.sin(argument) * Math.cos(inclination)
    );

  return out.set(auToUnits(xAu), auToUnits(yAu), auToUnits(zAu));
}

export function calculateKeplerianPosition(elements, daysSinceEpoch, options = {}, out = new THREE.Vector3()) {
  const retrograde = options.retrograde === true;
  const eccentricity = elements.eccentricity ?? 0;
  const meanMotion = (TAU / elements.orbitalPeriodDays) * (retrograde ? -1 : 1);
  const meanAnomaly = degToRad(elements.meanAnomalyAtEpochDeg ?? 0) + meanMotion * daysSinceEpoch;
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const trueAnomaly = eccentricToTrueAnomaly(eccentricAnomaly, eccentricity);
  const radiusAu = orbitalRadius(elements.semiMajorAxisAu, eccentricity, eccentricAnomaly);

  return orbitalToCartesian(radiusAu, trueAnomaly, elements, out);
}

export function calculateSatellitePosition(config, daysSinceEpoch, out = new THREE.Vector3()) {
  return calculateKeplerianPosition(
    {
      semiMajorAxisAu: config.semiMajorAxisAu ?? kmToAu(config.distanceKm),
      eccentricity: config.eccentricity ?? 0,
      inclinationDeg: config.inclinationDeg ?? 0,
      orbitalPeriodDays: config.orbitalPeriodDays,
      longitudeOfAscendingNodeDeg: config.longitudeOfAscendingNodeDeg ?? 0,
      argumentOfPeriapsisDeg: config.argumentOfPeriapsisDeg ?? 0,
      meanAnomalyAtEpochDeg: config.meanAnomalyAtEpochDeg ?? 0
    },
    daysSinceEpoch,
    { retrograde: config.retrograde },
    out
  );
}

export function calculateRotationAngle(daysSinceEpoch, rotationPeriodDays) {
  if (!rotationPeriodDays) {
    return 0;
  }

  const sign = rotationPeriodDays < 0 ? -1 : 1;
  const completeRotations = daysSinceEpoch / Math.abs(rotationPeriodDays);
  return normalizeRadians(completeRotations * TAU * sign);
}

export function sampleOrbit(elements, segments = 256) {
  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const meanAnomaly = (index / segments) * TAU;
    const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, elements.eccentricity ?? 0);
    const trueAnomaly = eccentricToTrueAnomaly(eccentricAnomaly, elements.eccentricity ?? 0);
    const radiusAu = orbitalRadius(
      elements.semiMajorAxisAu,
      elements.eccentricity ?? 0,
      eccentricAnomaly
    );

    points.push(orbitalToCartesian(radiusAu, trueAnomaly, elements));
  }

  return points;
}

export function deriveOrbitalPeriodDaysFromSemiMajorAxis(semiMajorAxisAu) {
  return Math.sqrt(Math.pow(semiMajorAxisAu, 3)) * 365.25;
}
