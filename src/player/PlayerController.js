export default class PlayerController {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.actions = new Set();
    this.mouseLookDelta = { x: 0, y: 0 };
    this.cameraOrbitDelta = { x: 0, y: 0 };
    this.mouseSensitivity = 0.0022;
    this.orbitSensitivity = 0.0036;
    this.rightMouseDown = false;
    this.pointerInside = false;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (event) => {
      const code = event.code;

      if (['KeyF', 'KeyV', 'KeyM', 'Escape'].includes(code) && !event.repeat) {
        this.actions.add(code);
      }

      if (code === 'Space') {
        event.preventDefault();
      }

      this.keys.add(code);
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });

    this.domElement.addEventListener('pointerenter', () => {
      this.pointerInside = true;
    });

    this.domElement.addEventListener('pointerleave', () => {
      this.pointerInside = false;
      this.rightMouseDown = false;
    });

    this.domElement.addEventListener('pointerdown', (event) => {
      if (event.button === 2) {
        this.rightMouseDown = true;
      }
    });

    window.addEventListener('pointerup', (event) => {
      if (event.button === 2) {
        this.rightMouseDown = false;
      }
    });

    this.domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    window.addEventListener('mousemove', (event) => {
      if (!this.pointerInside) {
        return;
      }

      if (this.rightMouseDown) {
        this.cameraOrbitDelta.x += event.movementX * this.orbitSensitivity;
        this.cameraOrbitDelta.y += event.movementY * this.orbitSensitivity;
        return;
      }

      this.mouseLookDelta.x += event.movementX * this.mouseSensitivity;
      this.mouseLookDelta.y += event.movementY * this.mouseSensitivity;
    });
  }

  hasKey(code) {
    return this.keys.has(code);
  }

  consumeAction(code) {
    const available = this.actions.has(code);

    if (available) {
      this.actions.delete(code);
    }

    return available;
  }

  getShipCommands() {
    const forward = (this.hasKey('KeyW') ? 1 : 0) + (this.hasKey('KeyS') ? -1 : 0);
    const strafe = (this.hasKey('KeyD') ? 1 : 0) + (this.hasKey('KeyA') ? -1 : 0);
    const vertical = (this.hasKey('KeyE') ? 1 : 0) + (this.hasKey('KeyQ') ? -1 : 0);
    const yawKeys = (this.hasKey('ArrowRight') ? 1 : 0) + (this.hasKey('ArrowLeft') ? -1 : 0);
    const pitchKeys = (this.hasKey('ArrowDown') ? 1 : 0) + (this.hasKey('ArrowUp') ? -1 : 0);
    const roll = (this.hasKey('KeyX') ? 1 : 0) + (this.hasKey('KeyZ') ? -1 : 0);

    return {
      translation: {
        x: strafe,
        y: vertical,
        z: forward
      },
      rotation: {
        pitch: pitchKeys + this.mouseLookDelta.y,
        yaw: yawKeys + this.mouseLookDelta.x,
        roll
      },
      boost: this.hasKey('ShiftLeft') || this.hasKey('ShiftRight')
    };
  }

  consumeCameraOrbitDelta() {
    const delta = { ...this.cameraOrbitDelta };
    this.cameraOrbitDelta.x = 0;
    this.cameraOrbitDelta.y = 0;
    return delta;
  }

  endFrame() {
    this.mouseLookDelta.x = 0;
    this.mouseLookDelta.y = 0;
    this.cameraOrbitDelta.x = 0;
    this.cameraOrbitDelta.y = 0;
  }
}
