import * as THREE from 'three';

import AsteroidBelt from '../bodies/AsteroidBelt.js';
import Moon from '../bodies/Moon.js';
import Planet from '../bodies/Planet.js';
import Rings from '../bodies/Rings.js';
import Sun from '../bodies/Sun.js';
import {
  BELT_CONFIGS,
  DEFAULT_SIMULATION_SPEED,
  MOON_DATA_BY_PARENT,
  PLANETARY_DATA,
  RING_SYSTEMS
} from '../utils/Constants.js';
import { dateToDaysSinceJ2000 } from './OrbitalMechanics.js';

export default class SolarSystem {
  constructor(sceneManager, textureFactory) {
    this.sceneManager = sceneManager;
    this.textureFactory = textureFactory;
    this.root = new THREE.Group();
    this.root.name = 'SolarSystem';
    this.sceneManager.scene.add(this.root);

    this.simulationSpeed = DEFAULT_SIMULATION_SPEED;
    this.startDate = new Date();
    this.simulationDate = new Date(this.startDate);
    this.elapsedSimulationMs = 0;

    this.sun = new Sun(textureFactory);
    this.planets = [];
    this.moons = [];
    this.allBodies = [this.sun];
    this.bodyByName = new Map([[this.sun.data.name, this.sun]]);
    this.selection = null;
    this.visibilitySphere = new THREE.Sphere();
    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();

    this.root.add(this.sun.group);
    this.createPlanets();

    this.asteroidBelt = new AsteroidBelt(BELT_CONFIGS.asteroid);
    this.kuiperBelt = new AsteroidBelt(BELT_CONFIGS.kuiper);
    this.root.add(this.asteroidBelt.group);
    this.root.add(this.kuiperBelt.group);

    this.initializePositions();
    this.refreshSelectableObjects();
  }

  createPlanets() {
    for (const planetData of PLANETARY_DATA) {
      const planet = new Planet(planetData, this.textureFactory);
      this.planets.push(planet);
      this.allBodies.push(planet);
      this.bodyByName.set(planet.data.name, planet);

      this.root.add(planet.orbitLine);
      this.root.add(planet.group);

      const ringSystem = RING_SYSTEMS[planet.data.name];

      if (ringSystem) {
        planet.setRings(new Rings(ringSystem, planet.data.radiusKm, planet.visualRadius));
      }

      const moons = MOON_DATA_BY_PARENT[planet.data.name] ?? [];

      for (const moonData of moons) {
        const moon = new Moon(moonData, planet, this.textureFactory);
        planet.addMoon(moon);
        this.moons.push(moon);
        this.allBodies.push(moon);
        this.bodyByName.set(moon.data.name, moon);
      }
    }
  }

  initializePositions() {
    const daysSinceEpoch = dateToDaysSinceJ2000(this.simulationDate);

    this.sun.update(daysSinceEpoch, 0, this.sceneManager.camera);

    for (const planet of this.planets) {
      planet.update(daysSinceEpoch, 0, this.sceneManager.camera);
    }

    this.asteroidBelt.update(daysSinceEpoch);
    this.kuiperBelt.update(daysSinceEpoch);
  }

  refreshSelectableObjects() {
    const uniqueIds = new Set();
    const objects = [];

    for (const body of this.allBodies) {
      for (const object of body.getSelectableObjects()) {
        if (uniqueIds.has(object.uuid)) {
          continue;
        }

        uniqueIds.add(object.uuid);
        objects.push(object);
      }
    }

    this.sceneManager.registerSelectableObjects(objects);
  }

  setSimulationSpeed(speed) {
    this.simulationSpeed = speed;
  }

  getBodyByName(name) {
    return this.bodyByName.get(name) ?? null;
  }

  getAllBodies() {
    return this.allBodies;
  }

  getGravityBodies() {
    return this.allBodies;
  }

  getShipSpawnOffsetUnits() {
    return 0.24;
  }

  getSimulationDate() {
    return this.simulationDate;
  }

  selectBody(body) {
    if (this.selection) {
      this.selection.setSelected(false);
    }

    this.selection = body;

    if (this.selection) {
      this.selection.setSelected(true);
    }
  }

  isPlanetRelevantToSelection(planet) {
    if (!this.selection) {
      return false;
    }

    return this.selection === planet || planet.moons.includes(this.selection);
  }

  update(deltaSeconds, elapsedTimeSeconds, camera, frustum) {
    this.elapsedSimulationMs += deltaSeconds * 1000 * this.simulationSpeed;
    this.simulationDate = new Date(this.startDate.getTime() + this.elapsedSimulationMs);
    const daysSinceEpoch = dateToDaysSinceJ2000(this.simulationDate);

    this.sun.update(daysSinceEpoch, elapsedTimeSeconds, camera);

    for (const planet of this.planets) {
      this.visibilitySphere.center.copy(planet.group.position);
      this.visibilitySphere.radius = Math.max(planet.getFocusDistance(), planet.visualRadius * 3.5);

      const visible = frustum.intersectsSphere(this.visibilitySphere);
      planet.update(
        daysSinceEpoch,
        elapsedTimeSeconds,
        visible || this.isPlanetRelevantToSelection(planet) ? camera : null
      );
    }

    this.asteroidBelt.update(daysSinceEpoch);
    this.kuiperBelt.update(daysSinceEpoch);
  }

  getEmptyEnvironment() {
    return {
      altitudeKm: 0,
      rawAltitudeKm: 0,
      depthKm: 0,
      gravityStrength: 0,
      atmosphereHeightKm: 0,
      atmosphereHeightUnits: 0,
      withinGravity: false,
      inAtmosphere: false,
      colliding: false,
      directionToCenter: new THREE.Vector3(0, 0, 0),
      surfaceNormal: new THREE.Vector3(0, 1, 0),
      distanceUnits: Infinity,
      surfaceRadiusUnits: 0
    };
  }

  getBodyEnvironment(body, position, shipRadius = 0) {
    const center = body.getWorldPosition(this.tmpVector);
    const offset = this.tmpVector2.copy(center).sub(position);
    const distanceUnits = Math.max(offset.length(), 0.0001);
    const surfaceRadiusUnits = body.visualRadius;
    const gravityRadiusUnits = body.getGravityRadiusUnits();
    const surfaceGravityStrength = body.getGravityStrength();
    const gravityRatio = Math.max(distanceUnits / Math.max(surfaceRadiusUnits, 0.0001), 1);
    const atmosphereHeightKm = body.getAtmosphereHeightKm();
    const rawAltitudeKm = body.getAltitudeKmFromPosition(position) - shipRadius * body.getRadiusScaleKmPerUnit();
    const atmosphereHeightUnits =
      atmosphereHeightKm > 0
        ? (atmosphereHeightKm / body.data.radiusKm) * body.visualRadius
        : 0;
    const landable = body.isLandable?.() !== false;

    return {
      body,
      altitudeKm: Math.max(rawAltitudeKm, 0),
      rawAltitudeKm,
      depthKm: Math.max(-rawAltitudeKm, 0),
      gravityStrength: surfaceGravityStrength / (gravityRatio * gravityRatio),
      surfaceGravityStrength,
      atmosphereHeightKm,
      atmosphereHeightUnits,
      withinGravity: distanceUnits <= gravityRadiusUnits,
      inAtmosphere: atmosphereHeightKm > 0 && rawAltitudeKm <= atmosphereHeightKm,
      colliding: landable && distanceUnits <= surfaceRadiusUnits + shipRadius,
      directionToCenter: offset.normalize(),
      surfaceNormal: body.getWorldSurfaceNormalFromPosition(position, new THREE.Vector3()),
      distanceUnits,
      surfaceRadiusUnits
    };
  }

  getReferenceBodyRetentionKm(body) {
    if (!body) {
      return 0;
    }

    const atmosphereHeightKm = body.getAtmosphereHeightKm?.() ?? 0;

    if (body.parentBody) {
      return Math.max(
        body.data.distanceKm * 0.35,
        body.data.radiusKm * 24,
        atmosphereHeightKm * 10,
        80_000
      );
    }

    return Math.max(
      body.data.radiusKm * 60,
      atmosphereHeightKm * 40,
      450_000
    );
  }

  findNearestBody(position, preferredBody = null) {
    if (preferredBody) {
      const preferredAltitudeKm = preferredBody.getAltitudeKmFromPosition(position);
      const retentionKm = this.getReferenceBodyRetentionKm(preferredBody);

      if (preferredAltitudeKm <= retentionKm) {
        return {
          body: preferredBody,
          altitudeKm: preferredAltitudeKm
        };
      }
    }

    let nearest = null;
    let nearestAltitude = Number.POSITIVE_INFINITY;

    for (const body of this.allBodies) {
      const altitudeKm = body.getAltitudeKmFromPosition(position);

      if (altitudeKm < nearestAltitude) {
        nearestAltitude = altitudeKm;
        nearest = body;
      }
    }

    return nearest
      ? {
          body: nearest,
          altitudeKm: nearestAltitude
        }
      : null;
  }

  getPrimaryBodies() {
    return this.planets;
  }

  getSelectionInfo() {
    return this.selection ? this.selection.getInfo() : null;
  }
}
