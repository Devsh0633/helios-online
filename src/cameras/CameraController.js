import * as THREE from 'three';

function smoothFactor(rate, deltaSeconds) {
  return 1 - Math.exp(-rate * deltaSeconds);
}

export default class CameraController {
  constructor(sceneManager, playerController) {
    this.sceneManager = sceneManager;
    this.playerController = playerController;
    this.camera = sceneManager.camera;

    this.mode = 'THIRD_PERSON';
    this.manualMode = 'THIRD_PERSON';
    this.mapMode = false;
    this.orbitYaw = 0;
    this.orbitPitch = -0.16;

    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();
    this.tmpVector3 = new THREE.Vector3();
    this.tmpQuaternion = new THREE.Quaternion();
    this.tmpQuaternion2 = new THREE.Quaternion();
    this.lookMatrix = new THREE.Matrix4();

    this.sceneManager.controls.enabled = false;
  }

  getModeName() {
    if (this.mapMode) {
      return 'SYSTEM_MAP';
    }

    return this.mode;
  }

  toggleViewMode() {
    if (this.mapMode) {
      return;
    }

    this.manualMode =
      this.manualMode === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON';
    this.mode = this.manualMode;
  }

  toggleCinematicMode() {
    if (this.mapMode || this.manualMode === 'FIRST_PERSON') {
      return;
    }

    this.mode = this.mode === 'CINEMATIC' ? 'THIRD_PERSON' : 'CINEMATIC';
  }

  toggleMapMode() {
    this.mapMode = !this.mapMode;
    this.sceneManager.controls.enabled = this.mapMode;

    if (this.mapMode) {
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.focusSystemView();
      return;
    }

    this.sceneManager.controls.enabled = false;
    this.sceneManager.focusTransition = null;
    this.sceneManager.focusedBody = null;
    this.mode = this.manualMode;
  }

  update(ship, deltaSeconds, elapsedTimeSeconds, targetBody, surfaceState = null) {
    if (this.mapMode) {
      return;
    }

    if (
      !surfaceState?.active &&
      this.manualMode === 'THIRD_PERSON' &&
      ship.idleSeconds >= 30 &&
      ship.getState().speedKmS < 0.1
    ) {
      this.mode = 'CINEMATIC';
    } else {
      this.mode = this.manualMode;
    }

    if (this.mode === 'FIRST_PERSON') {
      this.updateFirstPerson(ship, deltaSeconds);
      return;
    }

    if (this.mode === 'CINEMATIC') {
      this.updateCinematic(ship, deltaSeconds, elapsedTimeSeconds, targetBody, surfaceState);
      return;
    }

    this.updateThirdPerson(ship, deltaSeconds, targetBody, surfaceState);
  }

  updateThirdPerson(ship, deltaSeconds, targetBody, surfaceState = null) {
    const orbitDelta = this.playerController.consumeCameraOrbitDelta();
    this.orbitYaw -= orbitDelta.x;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch - orbitDelta.y,
      -0.95,
      0.7
    );

    const desiredOffset = surfaceState?.active
      ? new THREE.Vector3(0, 3.8, -10.5)
      : new THREE.Vector3(0, 5, -15);
    this.tmpQuaternion.setFromEuler(
      new THREE.Euler(this.orbitPitch, this.orbitYaw, 0, 'YXZ')
    );
    desiredOffset.applyQuaternion(this.tmpQuaternion);
    desiredOffset.applyQuaternion(ship.group.quaternion);

    const targetPosition = ship.getCameraTargetPosition(this.tmpVector);
    const desiredPosition = this.tmpVector2.copy(targetPosition).add(desiredOffset);
    const followLerp = smoothFactor(5.8, deltaSeconds);
    this.camera.position.lerp(desiredPosition, followLerp);

    const lookAtTarget = this.tmpVector3.copy(targetPosition);

    if (!surfaceState?.active && targetBody && ship.getState().targetName !== 'None') {
      const targetWorld = targetBody.getWorldPosition(new THREE.Vector3());
      lookAtTarget.lerp(targetWorld, 0.22);
    } else {
      lookAtTarget.add(ship.getForward(new THREE.Vector3()).multiplyScalar(6));
    }

    this.lookMatrix.lookAt(this.camera.position, lookAtTarget, ship.getUp(new THREE.Vector3()));
    this.tmpQuaternion2.setFromRotationMatrix(this.lookMatrix);
    this.camera.quaternion.slerp(this.tmpQuaternion2, smoothFactor(7.5, deltaSeconds));
  }

  updateFirstPerson(ship, deltaSeconds) {
    const desiredPosition = ship.getCockpitWorldPosition(this.tmpVector);
    this.camera.position.lerp(desiredPosition, smoothFactor(10.5, deltaSeconds));
    this.camera.quaternion.slerp(
      ship.group.quaternion,
      smoothFactor(11.5, deltaSeconds)
    );
  }

  updateCinematic(ship, deltaSeconds, elapsedTimeSeconds, targetBody, surfaceState = null) {
    if (surfaceState?.active) {
      this.mode = this.manualMode;
      this.updateThirdPerson(ship, deltaSeconds, targetBody, surfaceState);
      return;
    }

    const anchorBody = targetBody ?? ship.getState().nearestBody;

    if (!anchorBody) {
      this.updateThirdPerson(ship, deltaSeconds, targetBody, surfaceState);
      return;
    }

    const anchorPosition = anchorBody.getWorldPosition(this.tmpVector);
    const shipPosition = ship.group.position;
    const baseRadius = Math.max(anchorBody.visualRadius * 8, shipPosition.distanceTo(anchorPosition) * 1.45, 18);
    const angle = elapsedTimeSeconds * 0.1;
    const desiredPosition = this.tmpVector2.set(
      Math.cos(angle) * baseRadius,
      anchorBody.visualRadius * 3 + Math.sin(angle * 0.5) * anchorBody.visualRadius * 1.5,
      Math.sin(angle) * baseRadius
    ).add(anchorPosition);

    this.camera.position.lerp(desiredPosition, smoothFactor(1.8, deltaSeconds));

    const lookTarget = this.tmpVector3.copy(shipPosition).lerp(anchorPosition, 0.28);
    this.lookMatrix.lookAt(this.camera.position, lookTarget, new THREE.Vector3(0, 1, 0));
    this.tmpQuaternion2.setFromRotationMatrix(this.lookMatrix);
    this.camera.quaternion.slerp(this.tmpQuaternion2, smoothFactor(2.6, deltaSeconds));
  }
}
