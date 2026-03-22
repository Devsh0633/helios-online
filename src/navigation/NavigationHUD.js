import * as THREE from 'three';

import { AU_KM, SCALE_AU_TO_UNITS } from '../utils/Constants.js';

const STYLE_ID = 'helios-online-navigation-hud-style';
const UNITS_TO_KM = AU_KM / SCALE_AU_TO_UNITS;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .helios-nav-hud {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 12;
      color: #dbf7ff;
      font-family: "Space Mono", "Consolas", monospace;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transition: opacity 140ms ease;
    }

    .helios-nav-hud.hidden {
      opacity: 0;
    }

    .helios-nav-panel {
      position: absolute;
      border: 1px solid rgba(56, 189, 248, 0.24);
      background: linear-gradient(180deg, rgba(5, 14, 26, 0.76), rgba(2, 9, 17, 0.66));
      box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.18),
        inset 0 0 26px rgba(56, 189, 248, 0.05);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      overflow: hidden;
      opacity: 0.84;
    }

    .helios-nav-panel::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.028) 0,
          rgba(255, 255, 255, 0.028) 1px,
          transparent 1px,
          transparent 5px
        );
      opacity: 0.28;
      pointer-events: none;
    }

    .helios-nav-compass {
      top: 12px;
      left: 50%;
      width: 158px;
      padding: 8px 10px 10px;
      transform: translateX(-50%);
      text-align: center;
    }

    .helios-nav-compass-ring {
      position: relative;
      width: 94px;
      height: 94px;
      margin: 6px auto 0;
      border-radius: 50%;
      border: 1px solid rgba(56, 189, 248, 0.32);
      box-shadow: inset 0 0 18px rgba(56, 189, 248, 0.08);
      transition: transform 120ms ease;
    }

    .helios-nav-compass-ring span {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: rgba(180, 233, 255, 0.88);
      font-size: 0.5rem;
    }

    .helios-nav-compass-ring .north { transform: translate(-50%, -50%) translateY(-38px); }
    .helios-nav-compass-ring .south { transform: translate(-50%, -50%) translateY(38px); }
    .helios-nav-compass-ring .east { transform: translate(-50%, -50%) translateX(38px); }
    .helios-nav-compass-ring .west { transform: translate(-50%, -50%) translateX(-38px); }

    .helios-nav-compass-needle {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 2px;
      height: 44px;
      transform: translate(-50%, -100%);
      background: linear-gradient(180deg, rgba(255, 230, 132, 0.95), rgba(56, 189, 248, 0.0));
      box-shadow: 0 0 14px rgba(255, 225, 120, 0.24);
    }

    .helios-nav-compass-core {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: #7fe8ff;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
    }

    .helios-nav-status {
      top: 12px;
      right: 12px;
      width: min(198px, calc(100vw - 24px));
      padding: 9px 10px;
    }

    .helios-nav-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.36rem 0.65rem;
      margin-top: 0.5rem;
      font-size: 0.58rem;
    }

    .helios-nav-grid .label {
      color: rgba(160, 229, 255, 0.76);
    }

    .helios-nav-grid .value {
      color: #effcff;
      text-align: right;
    }

    .helios-nav-warp.ready {
      color: #91ffbf;
    }

    .helios-nav-warp.blocked {
      color: #ff9a9a;
    }

    .helios-nav-warp.cooldown {
      color: #ffd479;
    }

    .helios-nav-arrow {
      position: absolute;
      width: 26px;
      height: 26px;
      margin-left: -13px;
      margin-top: -13px;
      opacity: 0;
      transition: opacity 120ms ease;
      filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.22));
    }

    .helios-nav-arrow.visible {
      opacity: 1;
    }

    .helios-nav-arrow svg {
      width: 26px;
      height: 26px;
    }

    .helios-nav-assist {
      left: 50%;
      bottom: 102px;
      transform: translateX(-50%);
      padding: 7px 10px;
      min-width: min(340px, calc(100vw - 24px));
      text-align: center;
      opacity: 0;
      transition: opacity 140ms ease;
      font-size: 0.58rem;
    }

    .helios-nav-assist.visible {
      opacity: 1;
    }

    .helios-nav-assist .value {
      color: #ffe7a5;
      text-shadow: 0 0 16px rgba(255, 220, 121, 0.18);
    }

    @media (max-width: 900px) {
      .helios-nav-compass {
        top: auto;
        bottom: 12px;
        left: auto;
        right: 12px;
        transform: none;
        width: 128px;
        padding: 7px 8px 8px;
      }

      .helios-nav-compass-ring {
        width: 76px;
        height: 76px;
      }

      .helios-nav-compass-ring .north { transform: translate(-50%, -50%) translateY(-30px); }
      .helios-nav-compass-ring .south { transform: translate(-50%, -50%) translateY(30px); }
      .helios-nav-compass-ring .east { transform: translate(-50%, -50%) translateX(30px); }
      .helios-nav-compass-ring .west { transform: translate(-50%, -50%) translateX(-30px); }

      .helios-nav-compass-needle {
        height: 34px;
      }

      .helios-nav-status {
        top: 12px;
        right: 12px;
        width: min(184px, calc(100vw - 24px));
      }
    }
  `;

  document.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return '--';
  }

  if (distanceKm >= AU_KM * 0.1) {
    return `${(distanceKm / AU_KM).toFixed(distanceKm / AU_KM < 10 ? 2 : 1)} AU`;
  }

  return `${Math.round(distanceKm).toLocaleString()} km`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds)) {
    return '--';
  }

  const rounded = Math.max(Math.round(seconds), 0);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function createReticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.translate(128, 128);
  context.strokeStyle = '#7de8ff';
  context.lineWidth = 8;
  context.globalAlpha = 0.9;
  context.beginPath();
  context.arc(0, 0, 64, 0.2, 1.18);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, 64, 2.0, 2.94);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, 64, 3.34, 4.28);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, 64, 5.0, 5.94);
  context.stroke();
  context.strokeStyle = '#d7fbff';
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, 12, 0, Math.PI * 2);
  context.stroke();
  return new THREE.CanvasTexture(canvas);
}

export default class NavigationHUD {
  constructor(root, sceneManager) {
    ensureStyles();

    this.root = root;
    this.sceneManager = sceneManager;

    this.container = document.createElement('div');
    this.container.className = 'helios-nav-hud';
    this.container.innerHTML = `
      <div class="helios-nav-panel helios-nav-compass">
        <div class="caption">Ecliptic Compass</div>
        <div class="helios-nav-compass-ring" data-compass-ring>
          <span class="north">N</span>
          <span class="east">E</span>
          <span class="south">S</span>
          <span class="west">W</span>
          <div class="helios-nav-compass-needle"></div>
          <div class="helios-nav-compass-core"></div>
        </div>
      </div>
      <div class="helios-nav-panel helios-nav-status">
        <div class="caption">Target Lock</div>
        <div class="helios-nav-grid">
          <div class="label">Target</div>
          <div class="value" data-target-name>None</div>
          <div class="label">Distance</div>
          <div class="value" data-target-distance>--</div>
          <div class="label">ETA</div>
          <div class="value" data-target-eta>--</div>
          <div class="label">Warp</div>
          <div class="value helios-nav-warp blocked" data-warp-state>WARP: NO TARGET</div>
        </div>
      </div>
      <div class="helios-nav-arrow" data-target-arrow aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <defs>
            <linearGradient id="heliosNavArrow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#d8fbff" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>
          <path d="M32 6L56 40H41V58H23V40H8Z" fill="none" stroke="url(#heliosNavArrow)" stroke-width="4" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="helios-nav-panel helios-nav-assist" data-assist-panel>
        <div class="caption">Trajectory Advisory</div>
        <div class="value" data-assist-value>Gravity assist analysis nominal.</div>
      </div>
    `;

    this.compassRing = this.container.querySelector('[data-compass-ring]');
    this.targetNameValue = this.container.querySelector('[data-target-name]');
    this.targetDistanceValue = this.container.querySelector('[data-target-distance]');
    this.targetEtaValue = this.container.querySelector('[data-target-eta]');
    this.warpStateValue = this.container.querySelector('[data-warp-state]');
    this.targetArrow = this.container.querySelector('[data-target-arrow]');
    this.assistPanel = this.container.querySelector('[data-assist-panel]');
    this.assistValue = this.container.querySelector('[data-assist-value]');
    this.statusPanel = this.container.querySelector('.helios-nav-status');
    this.compassPanel = this.container.querySelector('.helios-nav-compass');
    this.root.appendChild(this.container);

    this.tmpVector = new THREE.Vector3();
    this.tmpVector2 = new THREE.Vector3();
    this.ndcVector = new THREE.Vector3();

    this.speedArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      5,
      '#49d8ff',
      1.5,
      0.8
    );
    this.speedArrow.visible = false;
    this.sceneManager.scene.add(this.speedArrow);

    this.targetSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createReticleTexture(),
        transparent: true,
        opacity: 0.9,
        color: '#c9fbff',
        depthWrite: false,
        depthTest: false
      })
    );
    this.targetSprite.visible = false;
    this.sceneManager.scene.add(this.targetSprite);
  }

  updateSpeedVector(ship) {
    const velocity = ship.getVelocity(this.tmpVector);
    const speed = velocity.length();

    if (speed < 0.0008) {
      this.speedArrow.visible = false;
      return;
    }

    const direction = velocity.normalize();
    this.speedArrow.position.copy(ship.group.position);
    this.speedArrow.setDirection(direction);
    this.speedArrow.setLength(clamp(ship.getState().speedKmS * 0.16, 1.8, 15), 1.1, 0.7);
    this.speedArrow.visible = true;
  }

  updateTargetReticle(targetBody, elapsedTimeSeconds, visible) {
    if (!targetBody || !visible) {
      this.targetSprite.visible = false;
      return;
    }

    const position = targetBody.getWorldPosition(this.tmpVector);
    const pulse = 1 + Math.sin(elapsedTimeSeconds * 3) * 0.08;
    const scale = Math.max(targetBody.visualRadius * 4.6, targetBody.parentBody ? 6.5 : 10) * pulse;

    this.targetSprite.position.copy(position);
    this.targetSprite.scale.setScalar(scale);
    this.targetSprite.visible = true;
  }

  updateCompass(ship) {
    const forward = ship.getForward(this.tmpVector).setY(0);
    const heading = forward.lengthSq() > 0.0001 ? Math.atan2(forward.x, forward.z) : 0;
    this.compassRing.style.transform = `rotate(${-heading}rad)`;
  }

  updateTargetArrow(targetBody, mapOpen) {
    if (!targetBody || mapOpen) {
      this.targetArrow.classList.remove('visible');
      return;
    }

    const targetPosition = targetBody.getWorldPosition(this.tmpVector);
    this.ndcVector.copy(targetPosition).project(this.sceneManager.camera);
    const screenX = (this.ndcVector.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-this.ndcVector.y * 0.5 + 0.5) * window.innerHeight;
    const onScreen =
      this.ndcVector.z > -1 &&
      this.ndcVector.z < 1 &&
      screenX > 50 &&
      screenX < window.innerWidth - 50 &&
      screenY > 50 &&
      screenY < window.innerHeight - 50;

    if (onScreen) {
      this.targetArrow.classList.remove('visible');
      return;
    }

    const angle = Math.atan2(this.ndcVector.y, this.ndcVector.x);
    const radiusX = window.innerWidth * 0.42;
    const radiusY = window.innerHeight * 0.34;
    const x = window.innerWidth * 0.5 + Math.cos(angle) * radiusX;
    const y = window.innerHeight * 0.5 - Math.sin(angle) * radiusY;

    this.targetArrow.style.left = `${x}px`;
    this.targetArrow.style.top = `${y}px`;
    this.targetArrow.style.transform = `translate(-50%, -50%) rotate(${Math.PI * 0.5 - angle}rad)`;
    this.targetArrow.classList.add('visible');
  }

  updateStatus(ship, warpState) {
    this.targetNameValue.textContent = warpState.targetName ?? 'None';
    this.targetDistanceValue.textContent = formatDistance(warpState.targetDistanceKm);
    this.targetEtaValue.textContent = formatEta(warpState.etaSeconds);
    this.warpStateValue.textContent = warpState.statusLabel;
    this.warpStateValue.classList.remove('ready', 'blocked', 'cooldown');

    if (warpState.status === 'READY') {
      this.warpStateValue.classList.add('ready');
    } else if (warpState.status === 'COOLDOWN') {
      this.warpStateValue.classList.add('cooldown');
    } else {
      this.warpStateValue.classList.add('blocked');
    }

    const targetBody = warpState.targetBody;

    if (!targetBody) {
      return;
    }

    const distanceKm = ship.group.position.distanceTo(targetBody.getWorldPosition(this.tmpVector)) * UNITS_TO_KM;
    this.targetDistanceValue.textContent = formatDistance(distanceKm);

    if (ship.getState().speedKmS > 0.01) {
      this.targetEtaValue.textContent = formatEta(distanceKm / ship.getState().speedKmS);
    }
  }

  updateGravityAssist(warpState) {
    if (!warpState.gravityAssist?.visible) {
      this.assistPanel.classList.remove('visible');
      return;
    }

    this.assistValue.textContent = warpState.gravityAssist.label;
    this.assistPanel.classList.add('visible');
  }

  update({ ship, warpState, mapOpen = false, elapsedTimeSeconds = 0 }) {
    this.container.classList.toggle('hidden', mapOpen);
    const hasTarget = Boolean(warpState.targetBody);
    this.statusPanel.style.opacity = hasTarget || warpState.status !== 'NO_TARGET' ? '1' : '0.72';
    this.compassPanel.style.opacity = '0.78';

    if (mapOpen) {
      this.speedArrow.visible = false;
      this.targetSprite.visible = false;
      this.targetArrow.classList.remove('visible');
      this.assistPanel.classList.remove('visible');
      this.updateStatus(ship, warpState);
      return;
    }

    this.updateCompass(ship);
    this.updateSpeedVector(ship);
    this.updateStatus(ship, warpState);
    this.updateTargetArrow(warpState.targetBody, mapOpen);
    this.updateTargetReticle(warpState.targetBody, elapsedTimeSeconds, !mapOpen);
    this.updateGravityAssist(warpState);
  }
}
