import * as THREE from 'three';

const SHIP_MASS = 10_000;
const THRUST_FORCE = 500;
const DRAG_COEFFICIENT = 0.3;
const MAX_FUEL = 1000;
const FUEL_REGEN_PER_SECOND = 0.1;
const FUEL_BURN_PER_SECOND = 1;
const BOOST_MULTIPLIER = 3;
const SPACE_MAX_SPEED_KM_S = 50;
const ATMOSPHERE_MAX_SPEED_KM_S = 2;

const SPACE_MAX_SPEED_UNITS = 0.4;
const ATMOSPHERE_MAX_SPEED_UNITS =
  SPACE_MAX_SPEED_UNITS * (ATMOSPHERE_MAX_SPEED_KM_S / SPACE_MAX_SPEED_KM_S);
const DISPLAY_SPEED_FACTOR = SPACE_MAX_SPEED_KM_S / SPACE_MAX_SPEED_UNITS;
const GRAVITY_WORLD_SCALE = 0.0022;
const THRUST_ACCELERATION = THRUST_FORCE / SHIP_MASS;
const ROTATIONAL_ACCELERATION = new THREE.Vector3(1.8, 2.2, 1.65);
const MAX_ANGULAR_SPEED = new THREE.Vector3(1.8, 2.3, 1.9);
const ANGULAR_DAMPING = 2.4;
const THRUST_DAMPING = 0.14;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function approach(current, target, rate, delta) {
  return THREE.MathUtils.damp(current, target, rate, delta);
}

function createPointsGeometry(count) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3)
  );
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3)
  );
  return geometry;
}

export default class Spaceship {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PlayerShip';

    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();
    this.lastSafeNormal = new THREE.Vector3(0, 1, 0);
    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();
    this.tmpVector3 = new THREE.Vector3();
    this.tmpQuaternion = new THREE.Quaternion();
    this.tmpQuaternion2 = new THREE.Quaternion();
    this.tmpMatrix = new THREE.Matrix4();
    this.tmpColor = new THREE.Color();

    this.forwardVector = new THREE.Vector3(0, 0, 1);
    this.rightVector = new THREE.Vector3(1, 0, 0);
    this.upVector = new THREE.Vector3(0, 1, 0);

    this.fuel = MAX_FUEL;
    this.thrustLevel = 0;
    this.heatLevel = 0;
    this.landed = false;
    this.landedBody = null;
    this.landedNormal = new THREE.Vector3(0, 1, 0);
    this.landedFrame = null;
    this.idleSeconds = 0;
    this.spawnLabel = 'Initializing launch coordinates';
    this.targetBody = null;
    this.referenceBody = null;
    this.respawnPosition = new THREE.Vector3();
    this.respawnQuaternion = new THREE.Quaternion();

    this.state = {
      speedKmS: 0,
      altitudeKm: 0,
      fuelPercent: 100,
      locationName: 'Earth',
      gravity: 0,
      mode: 'FLIGHT',
      landed: false,
      inAtmosphere: false,
      warpReady: true,
      targetName: 'None',
      spawnLabel: this.spawnLabel,
      nearestBody: null
    };

    this.shipCollisionRadius = 0.62;

    this.materials = this.createMaterials();
    this.thrusterSystems = [];

    this.buildShip();
  }

  createMaterials() {
    return {
      hull: new THREE.MeshStandardMaterial({
        color: '#edf5ff',
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color('#08131f'),
        emissiveIntensity: 0.12
      }),
      trim: new THREE.MeshStandardMaterial({
        color: '#6c7b91',
        metalness: 0.75,
        roughness: 0.35
      }),
      glass: new THREE.MeshStandardMaterial({
        color: '#8ecbf7',
        emissive: '#1f77b7',
        emissiveIntensity: 0.18,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.55
      }),
      heat: new THREE.MeshBasicMaterial({
        color: '#ff8a30',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    };
  }

  buildShip() {
    const hull = new THREE.Group();
    const mainHull = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), this.materials.hull);
    mainHull.scale.set(0.55, 0.42, 2.6);
    hull.add(mainHull);

    const noseCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.15, 8, 1),
      this.materials.hull
    );
    noseCone.rotation.x = Math.PI * 0.5;
    noseCone.position.z = 2.15;
    hull.add(noseCone);

    const dorsalFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.8, 0.9),
      this.materials.trim
    );
    dorsalFin.position.set(0, 0.55, -0.15);
    hull.add(dorsalFin);

    const wings = [
      { x: -1.15, rotation: 0.22 },
      { x: 1.15, rotation: -0.22 }
    ];

    for (const wing of wings) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.08, 1.05),
        this.materials.trim
      );
      mesh.position.set(wing.x, -0.04, -0.2);
      mesh.rotation.z = wing.rotation;
      mesh.rotation.y = wing.rotation * 0.6;
      hull.add(mesh);
    }

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 18, 18),
      this.materials.glass
    );
    cockpit.scale.set(1.0, 0.72, 1.35);
    cockpit.position.set(0, 0.24, 1.1);
    hull.add(cockpit);

    const heatShell = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2, 0),
      this.materials.heat
    );
    heatShell.scale.set(0.63, 0.5, 2.85);
    this.heatShell = heatShell;
    hull.add(heatShell);

    this.group.add(hull);
    this.hullMesh = mainHull;
    this.cockpitAnchor = new THREE.Object3D();
    this.cockpitAnchor.position.set(0, 0.22, 1.18);
    this.group.add(this.cockpitAnchor);

    this.cameraTarget = new THREE.Object3D();
    this.cameraTarget.position.set(0, 0.1, 0.95);
    this.group.add(this.cameraTarget);

    this.addEngineAssembly();
    this.addNavigationLights();
  }

  addEngineAssembly() {
    const nozzleOffsets = [
      new THREE.Vector3(-0.42, -0.08, -2.2),
      new THREE.Vector3(0.42, -0.08, -2.2),
      new THREE.Vector3(0, 0.08, -2.36)
    ];

    for (const offset of nozzleOffsets) {
      const nozzle = new THREE.Object3D();
      nozzle.position.copy(offset);
      this.group.add(nozzle);

      const nozzleMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.14, 0.5, 12, 1, true),
        this.materials.trim
      );
      nozzleMesh.rotation.x = Math.PI * 0.5;
      nozzleMesh.position.copy(offset);
      this.group.add(nozzleMesh);

      const glow = new THREE.PointLight('#6fe7ff', 0, 4.5, 2.1);
      glow.position.copy(offset);
      this.group.add(glow);

      const particleCount = 18;
      const geometry = createPointsGeometry(particleCount);
      const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      });
      const points = new THREE.Points(geometry, material);
      points.position.copy(offset);
      this.group.add(points);

      this.thrusterSystems.push({
        nozzle,
        glow,
        points,
        particleCount,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  addNavigationLights() {
    this.navLights = [];
    const specs = [
      { color: '#ff4949', position: new THREE.Vector3(-1.9, 0.05, -0.15), phase: 0 },
      { color: '#44ff9e', position: new THREE.Vector3(1.9, 0.05, -0.15), phase: 1.2 },
      { color: '#f8faff', position: new THREE.Vector3(0, 0.1, -2.35), phase: 2.2 }
    ];

    for (const spec of specs) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 1 })
      );
      sphere.position.copy(spec.position);
      this.group.add(sphere);

      const light = new THREE.PointLight(spec.color, 0.6, 3.5, 2);
      light.position.copy(spec.position);
      this.group.add(light);

      this.navLights.push({
        sphere,
        light,
        phase: spec.phase
      });
    }
  }

  setTargetBody(body) {
    this.targetBody = body ?? null;
  }

  setSpawnLabel(label) {
    this.spawnLabel = label;
    this.state.spawnLabel = label;
  }

  setReferenceBody(body) {
    this.referenceBody = body ?? null;
  }

  getReferenceBody() {
    return this.referenceBody;
  }

  rememberSafeTransform() {
    this.respawnPosition.copy(this.group.position);
    this.respawnQuaternion.copy(this.group.quaternion);
  }

  respawnToSafePosition() {
    if (this.landedBody && this.landedFrame) {
      this.applySurfaceRestState(this.landedBody);
      this.landed = true;
    } else {
      this.group.position.copy(this.respawnPosition);
      this.group.quaternion.copy(this.respawnQuaternion);
      this.landed = false;
      this.landedBody = null;
      this.landedFrame = null;
    }

    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.fuel = clamp(this.fuel + 50, 0, MAX_FUEL);
  }

  applyEnvironmentalDrift(vector, deltaSeconds) {
    this.velocity.addScaledVector(vector, deltaSeconds);
  }

  spawnAt({ position, normal, forward, label, body }) {
    this.group.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.landed = false;
    this.landedBody = null;
    this.landedFrame = null;
    this.landedNormal.copy(normal);
    this.lastSafeNormal.copy(normal);

    if (label) {
      this.setSpawnLabel(label);
    }

    if (body) {
      this.setReferenceBody(body);
    }

    this.setOrientationFromSurface(normal, forward);
    this.rememberSafeTransform();
  }

  setOrientationFromSurface(normal, forward) {
    const up = this.tmpVector.copy(normal).normalize();
    const projectedForward = this.tmpVector2
      .copy(forward)
      .projectOnPlane(up)
      .normalize();

    if (projectedForward.lengthSq() < 0.0001) {
      projectedForward.set(0, 0, 1).projectOnPlane(up).normalize();
    }

    const right = this.tmpVector3.crossVectors(up, projectedForward).normalize();
    projectedForward.crossVectors(right, up).normalize();

    this.tmpMatrix.makeBasis(right, up, projectedForward);
    this.group.quaternion.setFromRotationMatrix(this.tmpMatrix);
  }

  getForward(target = new THREE.Vector3()) {
    return target.copy(this.forwardVector).applyQuaternion(this.group.quaternion).normalize();
  }

  getUp(target = new THREE.Vector3()) {
    return target.copy(this.upVector).applyQuaternion(this.group.quaternion).normalize();
  }

  getRight(target = new THREE.Vector3()) {
    return target.copy(this.rightVector).applyQuaternion(this.group.quaternion).normalize();
  }

  getCockpitWorldPosition(target = new THREE.Vector3()) {
    return this.cockpitAnchor.getWorldPosition(target);
  }

  getCameraTargetPosition(target = new THREE.Vector3()) {
    return this.cameraTarget.getWorldPosition(target);
  }

  getShipHeight() {
    return this.shipCollisionRadius;
  }

  getState() {
    return this.state;
  }

  getVelocity(target = new THREE.Vector3()) {
    return target.copy(this.velocity);
  }

  update(deltaSeconds, commands, solarSystem, elapsedTimeSeconds) {
    const initialNearest = solarSystem.findNearestBody(this.group.position, this.referenceBody);
    const initialNearestBody = initialNearest?.body ?? null;
    const environment = initialNearestBody
      ? solarSystem.getBodyEnvironment(initialNearestBody, this.group.position, this.shipCollisionRadius)
      : solarSystem.getEmptyEnvironment();
    const thrustMagnitude = Math.sqrt(
      commands.translation.x * commands.translation.x +
      commands.translation.y * commands.translation.y +
      commands.translation.z * commands.translation.z
    );
    const activelyPiloting =
      thrustMagnitude > 0.01 ||
      Math.abs(commands.rotation.pitch) > 0.01 ||
      Math.abs(commands.rotation.yaw) > 0.01 ||
      Math.abs(commands.rotation.roll) > 0.01;

    if (activelyPiloting) {
      this.idleSeconds = 0;
    } else {
      this.idleSeconds += deltaSeconds;
    }

    this.applyRotation(commands.rotation, deltaSeconds);
    this.applyGravity(solarSystem, deltaSeconds);

    if (this.landed && initialNearestBody) {
      this.applySurfaceRestState(initialNearestBody);
    }

    const fuelAvailable = this.fuel > 0.001;
    const boostMultiplier = commands.boost ? BOOST_MULTIPLIER : 1;
    const thrustScale = fuelAvailable ? boostMultiplier : 0;

    if (thrustMagnitude > 0.01 && fuelAvailable) {
      this.applyThrust(commands.translation, thrustScale, deltaSeconds);
      this.consumeFuel(thrustMagnitude, boostMultiplier, deltaSeconds);
      this.landed = false;
      this.landedBody = null;
      this.landedFrame = null;
    } else {
      this.fuel = clamp(this.fuel + FUEL_REGEN_PER_SECOND * deltaSeconds, 0, MAX_FUEL);
    }

    if (environment.inAtmosphere) {
      this.applyAtmosphericDrag(environment, deltaSeconds);
    } else {
      this.velocity.multiplyScalar(1 - THRUST_DAMPING * deltaSeconds * 0.18);
    }

    this.enforceSpeedLimits(environment.inAtmosphere);
    this.group.position.addScaledVector(this.velocity, deltaSeconds);

    const postMoveNearest = solarSystem.findNearestBody(this.group.position, this.referenceBody);
    const postMoveBody = postMoveNearest?.body ?? initialNearestBody;
    const postMoveEnvironment = postMoveBody
      ? solarSystem.getBodyEnvironment(postMoveBody, this.group.position, this.shipCollisionRadius)
      : environment;

    if (postMoveEnvironment.colliding && postMoveBody) {
      this.landOnBody(postMoveBody, postMoveEnvironment.surfaceNormal);
    } else if (this.landed && thrustMagnitude > 0.14 && fuelAvailable) {
      this.landed = false;
      this.landedBody = null;
      this.landedFrame = null;
      this.velocity.addScaledVector(postMoveEnvironment.surfaceNormal, 0.08 * boostMultiplier);
    }

    this.updateEffects(deltaSeconds, elapsedTimeSeconds, thrustMagnitude, commands.boost, postMoveEnvironment);
    this.updateState(postMoveEnvironment, postMoveBody);
  }

  applyRotation(rotationInput, deltaSeconds) {
    const targetPitch = clamp(rotationInput.pitch, -1.5, 1.5) * ROTATIONAL_ACCELERATION.x;
    const targetYaw = clamp(rotationInput.yaw, -1.5, 1.5) * ROTATIONAL_ACCELERATION.y;
    const targetRoll = clamp(rotationInput.roll, -1, 1) * ROTATIONAL_ACCELERATION.z;

    this.angularVelocity.x = approach(this.angularVelocity.x, targetPitch, ANGULAR_DAMPING, deltaSeconds);
    this.angularVelocity.y = approach(this.angularVelocity.y, targetYaw, ANGULAR_DAMPING, deltaSeconds);
    this.angularVelocity.z = approach(this.angularVelocity.z, targetRoll, ANGULAR_DAMPING, deltaSeconds);

    this.angularVelocity.x = clamp(this.angularVelocity.x, -MAX_ANGULAR_SPEED.x, MAX_ANGULAR_SPEED.x);
    this.angularVelocity.y = clamp(this.angularVelocity.y, -MAX_ANGULAR_SPEED.y, MAX_ANGULAR_SPEED.y);
    this.angularVelocity.z = clamp(this.angularVelocity.z, -MAX_ANGULAR_SPEED.z, MAX_ANGULAR_SPEED.z);

    this.tmpQuaternion.setFromEuler(
      new THREE.Euler(
        this.angularVelocity.x * deltaSeconds,
        this.angularVelocity.y * deltaSeconds,
        this.angularVelocity.z * deltaSeconds,
        'XYZ'
      )
    );
    this.group.quaternion.multiply(this.tmpQuaternion).normalize();
  }

  applyGravity(solarSystem, deltaSeconds) {
    const bodies = solarSystem.getGravityBodies();

    for (const body of bodies) {
      const environment = solarSystem.getBodyEnvironment(body, this.group.position, this.shipCollisionRadius);

      if (!environment.withinGravity) {
        continue;
      }

      const direction = this.tmpVector.copy(environment.directionToCenter);
      const acceleration = environment.gravityStrength * GRAVITY_WORLD_SCALE;

      this.velocity.addScaledVector(direction, acceleration * deltaSeconds);
    }
  }

  applySurfaceRestState(body) {
    if (!this.landedBody) {
      this.landedBody = body;
    }

    const bodyPosition = body.getWorldPosition(this.tmpVector);

    if (this.landedFrame) {
      const bodyQuaternion = this.getBodySurfaceQuaternion(body, this.tmpQuaternion);
      const worldNormal = this.tmpVector2
        .copy(this.landedFrame.localNormal)
        .applyQuaternion(bodyQuaternion)
        .normalize();
      const worldForward = this.tmpVector3
        .copy(this.landedFrame.localForward)
        .applyQuaternion(bodyQuaternion)
        .projectOnPlane(worldNormal)
        .normalize();

      if (worldForward.lengthSq() < 0.0001) {
        worldForward.crossVectors(worldNormal, new THREE.Vector3(1, 0, 0)).normalize();
      }

      this.landedNormal.copy(worldNormal);
      this.lastSafeNormal.copy(worldNormal);
      this.group.position.copy(bodyPosition).addScaledVector(
        worldNormal,
        body.visualRadius + this.shipCollisionRadius * 0.72
      );
      this.setOrientationFromSurface(worldNormal, worldForward);
    } else {
      this.group.position.copy(bodyPosition).addScaledVector(
        this.landedNormal,
        body.visualRadius + this.shipCollisionRadius * 0.72
      );
    }

    this.velocity.set(0, 0, 0);
    this.angularVelocity.multiplyScalar(0.9);
  }

  applyThrust(translation, thrustScale, deltaSeconds) {
    this.tmpVector.set(translation.x, translation.y, translation.z);

    if (this.tmpVector.lengthSq() > 1) {
      this.tmpVector.normalize();
    }

    this.tmpVector.applyQuaternion(this.group.quaternion);
    this.velocity.addScaledVector(
      this.tmpVector,
      THRUST_ACCELERATION * thrustScale * deltaSeconds
    );
    this.thrustLevel = clamp(this.tmpVector.length() * thrustScale / BOOST_MULTIPLIER, 0, 1.2);
  }

  consumeFuel(thrustMagnitude, boostMultiplier, deltaSeconds) {
    const fuelRate =
      FUEL_BURN_PER_SECOND *
      (boostMultiplier > 1 ? BOOST_MULTIPLIER : 1) *
      clamp(thrustMagnitude, 0.3, 1.4);

    this.fuel = clamp(this.fuel - fuelRate * deltaSeconds, 0, MAX_FUEL);
  }

  applyAtmosphericDrag(environment, deltaSeconds) {
    const speed = this.velocity.length();

    if (speed < 0.0001) {
      return;
    }

    const densityFactor = clamp(1 - environment.altitudeKm / environment.atmosphereHeightKm, 0, 1);
    const drag = DRAG_COEFFICIENT * speed * speed * densityFactor * 0.85;
    this.velocity.addScaledVector(this.velocity.clone().normalize(), -drag * deltaSeconds);
  }

  enforceSpeedLimits(inAtmosphere) {
    const maxSpeed = inAtmosphere ? ATMOSPHERE_MAX_SPEED_UNITS : SPACE_MAX_SPEED_UNITS;
    const speed = this.velocity.length();

    if (speed > maxSpeed) {
      this.velocity.multiplyScalar(maxSpeed / speed);
    }
  }

  getBodySurfaceQuaternion(body, target = new THREE.Quaternion()) {
    if (body.spinGroup?.getWorldQuaternion) {
      return body.spinGroup.getWorldQuaternion(target);
    }

    return body.group.getWorldQuaternion(target);
  }

  landOnBody(body, surfaceNormal) {
    this.landed = true;
    this.landedBody = body;
    this.referenceBody = body;
    this.landedNormal.copy(surfaceNormal);
    this.lastSafeNormal.copy(surfaceNormal);
    const forward = this.getForward(new THREE.Vector3()).projectOnPlane(surfaceNormal).normalize();
    const bodyQuaternionInverse = this.getBodySurfaceQuaternion(body, this.tmpQuaternion).invert();
    this.landedFrame = {
      localNormal: surfaceNormal.clone().applyQuaternion(bodyQuaternionInverse).normalize(),
      localForward: (forward.lengthSq() < 0.0001
        ? this.getRight(new THREE.Vector3()).projectOnPlane(surfaceNormal).normalize()
        : forward
      ).clone().applyQuaternion(bodyQuaternionInverse).normalize()
    };
    this.applySurfaceRestState(body);
    this.alignToSurfaceNormal(surfaceNormal, 0.08);
    this.rememberSafeTransform();
  }

  alignToSurfaceNormal(surfaceNormal, influence) {
    const forward = this.getForward(this.tmpVector).projectOnPlane(surfaceNormal).normalize();

    if (forward.lengthSq() < 0.001) {
      forward.crossVectors(surfaceNormal, new THREE.Vector3(1, 0, 0)).normalize();
    }

    const startQuaternion = this.tmpQuaternion.copy(this.group.quaternion);
    this.setOrientationFromSurface(surfaceNormal, forward);
    const targetQuaternion = this.tmpQuaternion2.copy(this.group.quaternion);
    this.group.quaternion.copy(startQuaternion).slerp(targetQuaternion, influence);
  }

  updateEffects(deltaSeconds, elapsedTimeSeconds, thrustMagnitude, boosting, environment) {
    const thrustIntensity = clamp(
      thrustMagnitude * (boosting ? 1.15 : 0.7) + (this.landed ? 0 : 0.05),
      0,
      1.4
    );
    this.thrustLevel = approach(this.thrustLevel, thrustIntensity, 5.5, deltaSeconds);

    for (const system of this.thrusterSystems) {
      const positions = system.points.geometry.attributes.position.array;
      const colors = system.points.geometry.attributes.color.array;

      for (let index = 0; index < system.particleCount; index += 1) {
        const progress = ((elapsedTimeSeconds * 4.2) + index / system.particleCount + system.phase) % 1;
        const spread = 0.08 + progress * 0.18;
        const travel = this.thrustLevel * (0.6 + progress * 1.8);
        const angle = progress * Math.PI * 6.0 + index;

        positions[index * 3] = Math.cos(angle) * spread * this.thrustLevel;
        positions[index * 3 + 1] = Math.sin(angle) * spread * this.thrustLevel;
        positions[index * 3 + 2] = -travel;

        const warm = clamp(progress * 1.25, 0, 1);
        this.tmpColor.set(warm > 0.6 ? '#ffb05f' : '#65ecff');
        colors[index * 3] = this.tmpColor.r;
        colors[index * 3 + 1] = this.tmpColor.g;
        colors[index * 3 + 2] = this.tmpColor.b;
      }

      system.points.geometry.attributes.position.needsUpdate = true;
      system.points.geometry.attributes.color.needsUpdate = true;
      system.points.material.opacity = clamp(this.thrustLevel * 0.9, 0, 0.95);
      system.glow.intensity = this.thrustLevel * 3.4;
      system.glow.distance = 3 + this.thrustLevel * 4.5;
    }

    const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsedTimeSeconds * 6.5));

    for (const light of this.navLights) {
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsedTimeSeconds * 5.4 + light.phase));
      light.light.intensity = pulse;
      light.sphere.material.opacity = blink;
    }

    const reentryThresholdKmS = 1.4;
    const currentSpeedKmS = this.velocity.length() * DISPLAY_SPEED_FACTOR;
    const heatTarget =
      environment.inAtmosphere && currentSpeedKmS > reentryThresholdKmS
        ? clamp(
            (currentSpeedKmS - reentryThresholdKmS) /
              Math.max(environment.atmosphereHeightKm * 0.01, 0.25),
            0,
            1
          )
        : 0;

    this.heatLevel = approach(this.heatLevel, heatTarget, 3.2, deltaSeconds);
    this.materials.heat.opacity = this.heatLevel * 0.45;
    this.materials.hull.emissive.set(
      this.heatLevel > 0.02 ? '#ff7c30' : '#08131f'
    );
    this.materials.hull.emissiveIntensity = 0.12 + this.heatLevel * 0.55;
  }

  updateState(environment, nearestBody) {
    const speedKmS = this.velocity.length() * DISPLAY_SPEED_FACTOR;
    const mode = this.landed
      ? 'SURFACE'
      : environment.inAtmosphere
        ? 'ATMOSPHERIC'
        : 'FLIGHT';

    this.state = {
      speedKmS,
      altitudeKm: environment.altitudeKm,
      fuelPercent: (this.fuel / MAX_FUEL) * 100,
      locationName: nearestBody?.data?.name ?? 'Deep Space',
      gravity: environment.gravityStrength ?? 0,
      mode,
      landed: this.landed,
      inAtmosphere: environment.inAtmosphere,
      warpReady: !environment.inAtmosphere && !this.landed,
      targetName: this.targetBody?.data?.name ?? 'None',
      spawnLabel: this.spawnLabel,
      nearestBody
    };
  }
}
