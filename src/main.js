import CameraController from './cameras/CameraController.js';
import SceneManager from './core/SceneManager.js';
import SolarSystem from './core/SolarSystem.js';
import HUD from './player/HUD.js';
import { resolveGeoSpawn, SPACE_CENTERS } from './player/GeoSpawn.js';
import PlayerController from './player/PlayerController.js';
import Spaceship from './player/Spaceship.js';
import HazardSystem from './surface/HazardSystem.js';
import SurfaceManager from './surface/SurfaceManager.js';
import { DEFAULT_SIMULATION_SPEED } from './utils/Constants.js';
import ProceduralTextureFactory from './utils/TextureLoader.js';

const ZERO_COMMANDS = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { pitch: 0, yaw: 0, roll: 0 },
  boost: false
};

const textureFactory = new ProceduralTextureFactory();
const sceneRoot = document.querySelector('#scene-root');
const uiRoot = document.querySelector('#ui');

const sceneManager = new SceneManager(sceneRoot, textureFactory);
const solarSystem = new SolarSystem(sceneManager, textureFactory);
const playerController = new PlayerController(sceneManager.renderer.domElement);
const cameraController = new CameraController(sceneManager, playerController);
const hud = new HUD(uiRoot);
const ship = new Spaceship();
const surfaceManager = new SurfaceManager(sceneManager, solarSystem, textureFactory);
const hazardSystem = new HazardSystem();

sceneManager.scene.add(ship.group);

const labelElements = new Map();
const labelProjection = { x: 0, y: 0, visible: false };

let paused = false;

function ensureLabelElement(name) {
  if (labelElements.has(name)) {
    return labelElements.get(name);
  }

  const element = document.createElement('div');
  element.className = 'planet-label';
  element.textContent = name;
  hud.getLabelsLayer().appendChild(element);
  labelElements.set(name, element);
  return element;
}

function spawnShipAtDefaultSite() {
  const earth = solarSystem.getBodyByName('Earth');

  if (!earth) {
    throw new Error('Earth is missing from the solar system.');
  }

  const center = SPACE_CENTERS.NASA;
  const normal = earth.getWorldSurfaceNormalFromLatLng(center.lat, center.lng);
  const position = earth.getWorldSurfacePointFromLatLng(
    center.lat,
    center.lng,
    solarSystem.getShipSpawnOffsetUnits()
  );
  const forward = earth.getWorldEastDirectionFromLatLng(center.lat, center.lng);

  ship.spawnAt({
    position,
    normal,
    forward,
    label: center.name
  });
}

function updateLabels() {
  const surfaceState = surfaceManager.getHUDState();

  if (surfaceState.active || surfaceState.transitionActive) {
    for (const label of labelElements.values()) {
      label.classList.remove('visible');
    }
    return;
  }

  const camera = sceneManager.camera;
  const targetBody = solarSystem.selection;

  for (const body of solarSystem.getPrimaryBodies()) {
    const label = ensureLabelElement(body.data.name);
    const worldPosition = body.getLabelPosition();
    const screen = sceneManager.worldToScreen(worldPosition, labelProjection);
    const distanceToCamera = camera.position.distanceTo(body.getWorldPosition());
    const apparentScale = (body.visualRadius / distanceToCamera) * 3200;
    const show =
      screen.visible &&
      screen.x > 24 &&
      screen.x < window.innerWidth - 24 &&
      (apparentScale > 0.17 || targetBody === body || distanceToCamera < 1800);

    label.style.left = `${Math.min(Math.max(screen.x, 44), window.innerWidth - 44)}px`;
    label.style.top = `${Math.min(Math.max(screen.y, 28), window.innerHeight - 44)}px`;
    label.classList.toggle('visible', show);
  }
}

function applySimulationSpeed(speed) {
  solarSystem.setSimulationSpeed(speed);
  hud.setSimulationSpeed(speed);
}

function togglePause() {
  paused = !paused;
  hud.setPaused(paused);
}

sceneManager.setSelectionHandler((body) => {
  solarSystem.selectBody(body);
  ship.setTargetBody(body);
  hud.setSelectionInfo(solarSystem.getSelectionInfo());

  if (cameraController.mapMode) {
    sceneManager.focusOn(body);
  }
});

hud.onSimulationSpeedChange((speed) => {
  applySimulationSpeed(speed);
});

hud.onWarp(() => {
  return;
});

applySimulationSpeed(DEFAULT_SIMULATION_SPEED);
spawnShipAtDefaultSite();
hud.setSelectionInfo(null);
hud.updateShipState(ship.getState());
hud.updateSurfaceState(surfaceManager.getHUDState());
hud.updateHazardState(hazardSystem.getState());
hud.setCameraMode(cameraController.getModeName());
hud.setPaused(false);

resolveGeoSpawn(solarSystem)
  .then((spawn) => {
    ship.spawnAt(spawn);
    ship.setSpawnLabel(spawn.label);
  })
  .catch(() => {
    ship.setSpawnLabel(SPACE_CENTERS.NASA.name);
  });

function handleActions() {
  if (playerController.consumeAction('Escape')) {
    togglePause();
  }

  if (paused) {
    return;
  }

  if (playerController.consumeAction('KeyV')) {
    cameraController.toggleViewMode();
  }

  if (playerController.consumeAction('KeyF')) {
    cameraController.toggleCinematicMode();
  }

  if (playerController.consumeAction('KeyM')) {
    cameraController.toggleMapMode();
  }
}

function animate() {
  const deltaSeconds = sceneManager.clock.getDelta();
  const elapsedTimeSeconds = sceneManager.clock.elapsedTime;

  handleActions();

  if (!paused) {
    const frustum = sceneManager.getFrustum();
    solarSystem.update(deltaSeconds, elapsedTimeSeconds, sceneManager.camera, frustum);

    const commands = cameraController.mapMode ? ZERO_COMMANDS : playerController.getShipCommands();
    ship.update(deltaSeconds, commands, solarSystem, elapsedTimeSeconds);
    surfaceManager.update(deltaSeconds, elapsedTimeSeconds, ship);
    hazardSystem.update(deltaSeconds, {
      active: surfaceManager.getHUDState().active,
      bodyName: surfaceManager.getHUDState().hazardBodyName,
      hazardActive: surfaceManager.getHUDState().hazardActive,
      inStructure: surfaceManager.getHUDState().inStructure
    });

    if (hazardSystem.consumeRespawn()) {
      ship.respawnToSafePosition();
    }

    cameraController.update(
      ship,
      deltaSeconds,
      elapsedTimeSeconds,
      solarSystem.selection,
      surfaceManager.getHUDState()
    );
    sceneManager.update(deltaSeconds, elapsedTimeSeconds);
  } else {
    sceneManager.update(0, elapsedTimeSeconds);
  }

  hud.setSimulationDate(solarSystem.getSimulationDate());
  hud.setCameraMode(cameraController.getModeName());
  hud.setSelectionInfo(solarSystem.getSelectionInfo());
  hud.updateShipState(ship.getState());
  hud.updateSurfaceState(surfaceManager.getHUDState());
  hud.updateHazardState(hazardSystem.getState());
  updateLabels();
  sceneManager.render();

  playerController.endFrame();
  requestAnimationFrame(animate);
}

animate();
