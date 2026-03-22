import * as THREE from 'three';

import WarpTunnelEffect from './WarpTunnelEffect.js';
import { AU_KM, SCALE_AU_TO_UNITS, clamp } from '../utils/Constants.js';

const UNITS_TO_KM = AU_KM / SCALE_AU_TO_UNITS;
const WARP_DURATION_SECONDS = 3.8;
const WARP_COOLDOWN_SECONDS = 60;
const AIRLESS_WARP_CLEARANCE_KM = 500;

function distanceUnitsToKm(distanceUnits) {
  return distanceUnits * UNITS_TO_KM;
}

function buildArcPoints(from, to, count = 48, lateralArc = 0.18, verticalArc = 0.08) {
  const points = [];
  const direction = new THREE.Vector3().subVectors(to, from);
  const distance = Math.max(direction.length(), 0.0001);
  const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const planeNormal = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));

  if (planeNormal.lengthSq() < 0.0001) {
    planeNormal.set(1, 0, 0);
  } else {
    planeNormal.normalize();
  }

  const control = midpoint
    .clone()
    .addScaledVector(planeNormal, distance * lateralArc)
    .addScaledVector(new THREE.Vector3(0, 1, 0), distance * verticalArc);
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), control, to.clone());
  return curve.getPoints(count);
}

function formatCountdown(seconds) {
  return `${Math.ceil(seconds)}s`;
}

export default class WarpSystem {
  constructor(sceneManager, solarSystem, ship, uiRoot) {
    this.sceneManager = sceneManager;
    this.solarSystem = solarSystem;
    this.ship = ship;
    this.targetBody = null;

    this.root = new THREE.Group();
    this.root.name = 'NavigationWarpHelpers';
    this.sceneManager.scene.add(this.root);

    this.previewMaterial = new THREE.LineDashedMaterial({
      color: '#65d4ff',
      dashSize: 10,
      gapSize: 4,
      transparent: true,
      opacity: 0.7
    });
    this.previewLine = new THREE.Line(new THREE.BufferGeometry(), this.previewMaterial);
    this.previewLine.frustumCulled = false;
    this.previewLine.visible = false;
    this.root.add(this.previewLine);

    this.assistMaterial = new THREE.LineDashedMaterial({
      color: '#ffe278',
      dashSize: 6,
      gapSize: 3,
      transparent: true,
      opacity: 0.75
    });
    this.gravityAssistLine = new THREE.Line(new THREE.BufferGeometry(), this.assistMaterial);
    this.gravityAssistLine.frustumCulled = false;
    this.gravityAssistLine.visible = false;
    this.root.add(this.gravityAssistLine);

    this.tunnelEffect = new WarpTunnelEffect(uiRoot);

    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();
    this.tmpVector3 = new THREE.Vector3();
    this.tmpVector4 = new THREE.Vector3();

    this.cooldownRemaining = 0;
    this.warpElapsed = 0;
    this.warping = false;
    this.arrivalData = null;
    this.lastReadiness = null;
    this.lastGravityAssist = {
      visible: false,
      label: '',
      headingDeg: 0,
      deltaVKmS: 0,
      body: null
    };
    this.state = {
      targetBody: null,
      targetName: 'None',
      targetDistanceKm: 0,
      etaSeconds: Infinity,
      targetLocked: false,
      warpReady: false,
      status: 'NO_TARGET',
      statusLabel: 'Select target',
      buttonLabel: 'Warp Drive Offline',
      cooldownRemaining: 0,
      warping: false,
      gravityAssist: this.lastGravityAssist
    };
  }

  setTarget(body) {
    this.targetBody = body ?? null;
    this.ship.setTargetBody(this.targetBody);
  }

  getTargetBody() {
    return this.targetBody;
  }

  isWarping() {
    return this.warping;
  }

  getState() {
    return this.state;
  }

  getTrajectoryPoints(fromPosition, toPosition, options = {}) {
    return buildArcPoints(
      fromPosition,
      toPosition,
      options.count ?? 48,
      options.lateralArc ?? 0.18,
      options.verticalArc ?? 0.08
    );
  }

  getCurrentEnvironment() {
    const nearest = this.solarSystem.findNearestBody(
      this.ship.group.position,
      this.ship.getReferenceBody?.() ?? null
    );

    if (!nearest?.body) {
      return {
        nearestBody: null,
        environment: this.solarSystem.getEmptyEnvironment()
      };
    }

    return {
      nearestBody: nearest.body,
      environment: this.solarSystem.getBodyEnvironment(
        nearest.body,
        this.ship.group.position,
        this.ship.getShipHeight()
      )
    };
  }

  evaluateWarpReadiness(surfaceState = null) {
    const { nearestBody, environment } = this.getCurrentEnvironment();
    const clearanceKm =
      environment.atmosphereHeightKm > 0
        ? environment.atmosphereHeightKm
        : AIRLESS_WARP_CLEARANCE_KM;
    const targetDistanceKm = this.targetBody
      ? distanceUnitsToKm(
          this.ship.group.position.distanceTo(
            this.targetBody.getWorldPosition(this.tmpVector)
          )
        )
      : 0;
    const etaSeconds =
      this.targetBody && this.ship.getState().speedKmS > 0.01
        ? targetDistanceKm / Math.max(this.ship.getState().speedKmS, 0.01)
        : Number.POSITIVE_INFINITY;

    let status = 'READY';
    let statusLabel = 'WARP READY';
    let buttonLabel = 'Engage Warp';
    let warpReady = true;

    if (surfaceState?.active || surfaceState?.transitionActive) {
      status = 'SURFACE';
      statusLabel = 'WARP: SURFACE';
      buttonLabel = 'Surface Mode Active';
      warpReady = false;
    } else if (this.warping) {
      status = 'WARPING';
      statusLabel = 'WARPING';
      buttonLabel = 'Warp In Progress';
      warpReady = false;
    } else if (this.cooldownRemaining > 0) {
      status = 'COOLDOWN';
      statusLabel = `WARP: ${formatCountdown(this.cooldownRemaining)}`;
      buttonLabel = `Cooldown ${formatCountdown(this.cooldownRemaining)}`;
      warpReady = false;
    } else if (!this.targetBody) {
      status = 'NO_TARGET';
      statusLabel = 'WARP: NO TARGET';
      buttonLabel = 'Select Warp Target';
      warpReady = false;
    } else if (nearestBody === this.targetBody && environment.altitudeKm < clearanceKm * 2.5) {
      status = 'CURRENT_TARGET';
      statusLabel = 'WARP: LOCAL';
      buttonLabel = 'Already Near Target';
      warpReady = false;
    } else if (environment.rawAltitudeKm <= clearanceKm) {
      status = environment.atmosphereHeightKm > 0 ? 'ATMOSPHERE' : 'CLEARANCE';
      statusLabel =
        environment.atmosphereHeightKm > 0 ? 'WARP: ATMOSPHERE' : 'WARP: CLEARANCE';
      buttonLabel =
        environment.atmosphereHeightKm > 0 ? 'Clear Atmosphere' : 'Climb Above 500 km';
      warpReady = false;
    }

    this.lastReadiness = {
      nearestBody,
      environment,
      clearanceKm,
      targetDistanceKm,
      etaSeconds,
      targetLocked: Boolean(this.targetBody),
      warpReady,
      status,
      statusLabel,
      buttonLabel
    };

    return this.lastReadiness;
  }

  requestWarp(surfaceState = null) {
    const readiness = this.evaluateWarpReadiness(surfaceState);

    if (!readiness.warpReady || !this.targetBody) {
      return false;
    }

    this.arrivalData = this.computeArrivalData(this.targetBody, this.ship.group.position);
    this.warping = true;
    this.warpElapsed = 0;
    this.cooldownRemaining = WARP_COOLDOWN_SECONDS;
    this.previewLine.visible = false;
    this.gravityAssistLine.visible = false;

    this.tunnelEffect.start({
      fromLabel: readiness.nearestBody?.data?.name ?? 'Deep Space',
      toLabel: this.targetBody.data.name,
      duration: WARP_DURATION_SECONDS
    });

    return true;
  }

  computeArrivalData(body, fromPosition) {
    const bodyPosition = body.getWorldPosition(this.tmpVector);
    const sunPosition = this.solarSystem.sun.getWorldPosition(this.tmpVector2);
    const surfaceNormal = this.tmpVector3.copy(fromPosition).sub(bodyPosition);

    if (surfaceNormal.lengthSq() < 0.0001) {
      surfaceNormal.copy(bodyPosition).sub(sunPosition);

      if (surfaceNormal.lengthSq() < 0.0001) {
        surfaceNormal.set(1, 0, 0);
      }
    }

    surfaceNormal.normalize();

    const clearanceKm =
      body.getAtmosphereHeightKm() > 0
        ? body.getAtmosphereHeightKm() * 1.2
        : AIRLESS_WARP_CLEARANCE_KM;
    const clearanceUnits = clearanceKm / body.getRadiusScaleKmPerUnit();
    const arrivalPosition = this.tmpVector4
      .copy(bodyPosition)
      .addScaledVector(surfaceNormal, body.visualRadius + clearanceUnits + this.ship.getShipHeight());
    const forward = sunPosition
      .clone()
      .sub(bodyPosition)
      .projectOnPlane(surfaceNormal)
      .normalize();

    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, 1).projectOnPlane(surfaceNormal).normalize();
    }

    return {
      body,
      position: arrivalPosition.clone(),
      normal: surfaceNormal.clone(),
      forward: forward.clone()
    };
  }

  completeWarp() {
    if (!this.arrivalData) {
      this.warping = false;
      return;
    }

    this.ship.spawnAt({
      position: this.arrivalData.position,
      normal: this.arrivalData.normal,
      forward: this.arrivalData.forward,
      body: this.arrivalData.body
    });
    this.ship.rememberSafeTransform();
    this.warping = false;
    this.arrivalData = null;
  }

  updatePreviewLine(surfaceState = null) {
    if (!this.targetBody || this.warping || surfaceState?.active || surfaceState?.transitionActive) {
      this.previewLine.visible = false;
      return;
    }

    const targetPosition = this.targetBody.getWorldPosition(this.tmpVector);
    const points = this.getTrajectoryPoints(this.ship.group.position, targetPosition, {
      count: 54,
      lateralArc: 0.12,
      verticalArc: 0.05
    });
    this.previewLine.geometry.setFromPoints(points);
    this.previewLine.computeLineDistances();
    this.previewLine.visible = true;
  }

  updateGravityAssist() {
    const shipVelocity = this.ship.getVelocity(this.tmpVector);

    if (this.warping || shipVelocity.lengthSq() < 0.0002) {
      this.gravityAssistLine.visible = false;
      this.lastGravityAssist = {
        visible: false,
        label: '',
        headingDeg: 0,
        deltaVKmS: 0,
        body: null
      };
      return;
    }

    let bestCandidate = null;
    let bestScore = 0;

    for (const body of this.solarSystem.getPrimaryBodies()) {
      const environment = this.solarSystem.getBodyEnvironment(
        body,
        this.ship.group.position,
        this.ship.getShipHeight()
      );
      const assistRadius = body.getGravityRadiusUnits() * 2;

      if (environment.distanceUnits > assistRadius) {
        continue;
      }

      const proximity = 1 - environment.distanceUnits / Math.max(assistRadius, 0.0001);

      if (proximity > bestScore) {
        bestScore = proximity;
        bestCandidate = {
          body,
          environment,
          proximity
        };
      }
    }

    if (!bestCandidate) {
      this.gravityAssistLine.visible = false;
      this.lastGravityAssist = {
        visible: false,
        label: '',
        headingDeg: 0,
        deltaVKmS: 0,
        body: null
      };
      return;
    }

    const velocityDirection = shipVelocity.normalize();
    const toBody = this.tmpVector2
      .copy(bestCandidate.body.getWorldPosition(this.tmpVector3))
      .sub(this.ship.group.position)
      .normalize();
    const headingDeg = THREE.MathUtils.radToDeg(
      Math.atan2(velocityDirection.x, velocityDirection.z)
    );
    const deltaVKmS = clamp(
      bestCandidate.body.getGravityStrength() * bestCandidate.proximity * 0.16,
      0.2,
      6.8
    );
    const tangent = this.tmpVector4
      .crossVectors(toBody, new THREE.Vector3(0, 1, 0))
      .normalize();

    if (tangent.lengthSq() < 0.0001) {
      tangent.set(1, 0, 0);
    }

    const bodyPosition = bestCandidate.body.getWorldPosition(this.tmpVector3).clone();
    const start = this.ship.group.position.clone();
    const control = bodyPosition
      .clone()
      .addScaledVector(toBody, bestCandidate.body.visualRadius * 4.2)
      .addScaledVector(tangent, bestCandidate.body.visualRadius * 6.4);
    const end = bodyPosition
      .clone()
      .addScaledVector(tangent, bestCandidate.body.visualRadius * 10.5)
      .addScaledVector(velocityDirection, bestCandidate.body.visualRadius * 5.2);
    const curve = new THREE.QuadraticBezierCurve3(start, control, end);
    const points = curve.getPoints(40);

    this.gravityAssistLine.geometry.setFromPoints(points);
    this.gravityAssistLine.computeLineDistances();
    this.gravityAssistLine.visible = true;

    this.lastGravityAssist = {
      visible: true,
      label: `GRAVITY ASSIST POSSIBLE - heading ${Math.round(headingDeg)} deg - DV +${deltaVKmS.toFixed(1)} km/s`,
      headingDeg,
      deltaVKmS,
      body: bestCandidate.body
    };
  }

  update(deltaSeconds, elapsedTimeSeconds, surfaceState = null) {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(this.cooldownRemaining - deltaSeconds, 0);
    }

    if (this.warping) {
      this.warpElapsed += deltaSeconds;

      if (this.warpElapsed >= WARP_DURATION_SECONDS) {
        this.completeWarp();
      }
    }

    this.updatePreviewLine(surfaceState);
    this.updateGravityAssist();
    this.tunnelEffect.update(deltaSeconds, elapsedTimeSeconds);

    const readiness = this.evaluateWarpReadiness(surfaceState);

    this.state = {
      targetBody: this.targetBody,
      targetName: this.targetBody?.data?.name ?? 'None',
      targetDistanceKm: readiness.targetDistanceKm,
      etaSeconds: readiness.etaSeconds,
      targetLocked: readiness.targetLocked,
      warpReady: readiness.warpReady,
      status: readiness.status,
      statusLabel: readiness.statusLabel,
      buttonLabel: readiness.buttonLabel,
      cooldownRemaining: this.cooldownRemaining,
      warping: this.warping,
      gravityAssist: this.lastGravityAssist
    };
  }

  renderOverlay() {
    this.tunnelEffect.render();
  }
}
