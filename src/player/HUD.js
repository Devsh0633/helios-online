const HUD_STYLE_ID = 'helios-online-hud-style';

function ensureStyles() {
  if (document.getElementById(HUD_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = HUD_STYLE_ID;
  style.textContent = `
    @import url("https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap");

    .helios-hud {
      position: absolute;
      inset: 0;
      pointer-events: none;
      color: #d9f6ff;
      font-family: "Space Mono", "Consolas", monospace;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      --hud-gap: 14px;
    }

    .helios-hud * {
      box-sizing: border-box;
    }

    .helios-hud-panel {
      position: absolute;
      pointer-events: auto;
      overflow: hidden;
      border: 1px solid rgba(56, 189, 248, 0.24);
      background: linear-gradient(180deg, rgba(3, 12, 20, 0.82), rgba(5, 12, 22, 0.66));
      box-shadow:
        0 0 0 1px rgba(56, 189, 248, 0.04),
        0 10px 28px rgba(0, 0, 0, 0.26),
        inset 0 0 34px rgba(56, 189, 248, 0.06);
      backdrop-filter: blur(10px);
      border-radius: 14px;
    }

    .helios-hud-panel::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.035) 0,
          rgba(255, 255, 255, 0.035) 1px,
          transparent 1px,
          transparent 4px
        );
      opacity: 0.24;
      mix-blend-mode: screen;
      animation: helios-scan 6s linear infinite;
      pointer-events: none;
    }

    @keyframes helios-scan {
      from {
        transform: translateY(-12px);
      }

      to {
        transform: translateY(12px);
      }
    }

    .helios-hud .hud-caption {
      color: rgba(152, 234, 255, 0.8);
      font-size: 0.58rem;
    }

    .helios-hud .hud-value {
      color: #effcff;
      font-size: 0.9rem;
      margin-top: 0.14rem;
    }

    .helios-hud .hud-grid {
      display: grid;
      gap: 0.72rem;
      position: relative;
      z-index: 1;
    }

    .helios-hud .hud-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      position: relative;
      z-index: 1;
    }

    .helios-flight-panel {
      top: var(--hud-gap);
      left: var(--hud-gap);
      width: min(300px, calc(100vw - 28px));
      padding: 13px 14px 14px;
    }

    .helios-status-panel {
      top: var(--hud-gap);
      right: var(--hud-gap);
      width: min(290px, calc(100vw - 28px));
      padding: 13px 14px 14px;
      text-align: right;
    }

    .helios-mode-panel {
      left: var(--hud-gap);
      bottom: var(--hud-gap);
      width: min(250px, calc(100vw - 28px));
      padding: 13px 14px 14px;
    }

    .helios-selection-panel {
      top: 112px;
      right: var(--hud-gap);
      width: min(270px, calc(100vw - 28px));
      padding: 13px 14px 14px;
    }

    .helios-controls-panel {
      right: var(--hud-gap);
      bottom: var(--hud-gap);
      width: min(330px, calc(100vw - 28px));
      padding: 13px 14px 14px;
      line-height: 1.45;
      font-size: 0.66rem;
    }

    .helios-center-stack {
      position: absolute;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      pointer-events: none;
    }

    .helios-crosshair {
      width: 62px;
      height: 62px;
      opacity: 0.74;
      filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.14));
    }

    .helios-warp-button {
      pointer-events: auto;
      border: 1px solid rgba(56, 189, 248, 0.35);
      background: linear-gradient(180deg, rgba(8, 23, 37, 0.95), rgba(3, 12, 20, 0.8));
      color: #9fe7ff;
      padding: 8px 15px;
      border-radius: 999px;
      font: inherit;
      letter-spacing: 0.08em;
      font-size: 0.76rem;
      cursor: pointer;
      transition: transform 140ms ease, opacity 140ms ease, border-color 140ms ease;
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.1);
    }

    .helios-warp-button:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(56, 189, 248, 0.55);
    }

    .helios-warp-button:disabled {
      opacity: 0.36;
      cursor: not-allowed;
    }

    .helios-landed {
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 152, 73, 0.18);
      border: 1px solid rgba(255, 172, 107, 0.4);
      color: #ffd8ba;
      box-shadow: 0 0 20px rgba(255, 145, 66, 0.2);
      opacity: 0;
      transition: opacity 180ms ease;
      font-size: 0.75rem;
    }

    .helios-landed.visible {
      opacity: 1;
    }

    .helios-slider {
      width: 100%;
      accent-color: #38bdf8;
      margin-top: 10px;
    }

    .helios-fuel {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .helios-fuel-bar {
      display: flex;
      gap: 4px;
    }

    .helios-fuel-bar span {
      width: 14px;
      height: 9px;
      border-radius: 3px;
      border: 1px solid rgba(56, 189, 248, 0.28);
      background: rgba(14, 40, 54, 0.76);
    }

    .helios-fuel-bar span.active {
      background: linear-gradient(180deg, rgba(78, 222, 255, 0.95), rgba(38, 171, 223, 0.88));
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.24);
    }

    .helios-integrity {
      margin-top: 0.15rem;
    }

    .helios-integrity-track {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(9, 25, 37, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.2);
    }

    .helios-integrity-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #3ef0ff, #38bdf8 58%, #ffd36f 100%);
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.22);
      transform-origin: left center;
      transition: transform 150ms ease, background 150ms ease;
    }

    .helios-kv {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.4rem 0.75rem;
      align-items: center;
      position: relative;
      z-index: 1;
      font-size: 0.74rem;
    }

    .helios-kv .label {
      color: rgba(149, 226, 248, 0.72);
      font-size: 0.58rem;
    }

    .helios-kv .value {
      color: #f2fcff;
      text-align: right;
      font-size: 0.76rem;
    }

    .helios-selection-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem 0.75rem;
      margin-top: 0.8rem;
      position: relative;
      z-index: 1;
    }

    .helios-selection-grid .metric-label {
      color: rgba(149, 226, 248, 0.72);
      font-size: 0.56rem;
    }

    .helios-selection-grid .metric-value {
      margin-top: 0.12rem;
      font-size: 0.74rem;
      color: #f2fcff;
    }

    .helios-status-line {
      margin-top: 0.6rem;
      color: rgba(160, 230, 255, 0.76);
      font-size: 0.58rem;
      line-height: 1.35;
      position: relative;
      z-index: 1;
    }

    .helios-status-note {
      margin-top: 0.6rem;
      font-size: 0.6rem;
      line-height: 1.4;
      color: rgba(205, 242, 255, 0.76);
      position: relative;
      z-index: 1;
    }

    .helios-help-list {
      margin: 0.55rem 0 0;
      padding: 0;
      list-style: none;
      position: relative;
      z-index: 1;
    }

    .helios-help-list li + li {
      margin-top: 0.2rem;
    }

    .helios-pause {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(2, 7, 13, 0.54);
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease;
    }

    .helios-pause.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .helios-pause-card {
      padding: 18px 22px;
      border-radius: 18px;
      border: 1px solid rgba(56, 189, 248, 0.26);
      background: linear-gradient(180deg, rgba(4, 13, 21, 0.92), rgba(4, 10, 16, 0.86));
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.34);
      text-align: center;
      font-size: 0.86rem;
    }

    .helios-transition {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at center, rgba(76, 209, 255, 0.16), rgba(2, 7, 13, 0.88) 55%, rgba(1, 4, 8, 0.97) 100%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 220ms ease;
      overflow: hidden;
    }

    .helios-transition.visible {
      opacity: 1;
    }

    .helios-transition-core {
      position: relative;
      width: min(50vw, 420px);
      height: min(50vw, 420px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 120px rgba(56, 189, 248, 0.12);
    }

    .helios-transition-core::before,
    .helios-transition-core::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(126, 235, 255, 0.24);
      animation: helios-warp-spin 2.8s linear infinite;
    }

    .helios-transition-core::after {
      inset: 10%;
      border-color: rgba(255, 184, 111, 0.2);
      animation-duration: 1.9s;
      animation-direction: reverse;
    }

    .helios-transition-ring {
      position: absolute;
      inset: 22%;
      border-radius: 50%;
      border: 1px solid rgba(56, 189, 248, 0.5);
      box-shadow:
        0 0 42px rgba(56, 189, 248, 0.3),
        inset 0 0 36px rgba(56, 189, 248, 0.12);
      animation: helios-warp-pulse 1.1s ease-in-out infinite;
    }

    .helios-transition-label {
      position: relative;
      z-index: 1;
      padding: 12px 18px;
      border-radius: 999px;
      border: 1px solid rgba(56, 189, 248, 0.24);
      background: rgba(4, 13, 21, 0.82);
      color: #dff8ff;
      text-align: center;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.22);
    }

    .helios-alert-flash {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(255, 86, 86, 0.08), rgba(255, 40, 40, 0.22), rgba(255, 0, 0, 0.05));
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }

    .helios-alert-flash.visible {
      opacity: 1;
    }

    @keyframes helios-warp-spin {
      from {
        transform: rotate(0deg) scale(0.92);
      }

      to {
        transform: rotate(360deg) scale(1.08);
      }
    }

    @keyframes helios-warp-pulse {
      0%,
      100% {
        transform: scale(0.92);
        opacity: 0.4;
      }

      50% {
        transform: scale(1.08);
        opacity: 0.95;
      }
    }

    .helios-labels {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .helios-target-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 6px 10px;
      margin-top: 0.6rem;
      border-radius: 999px;
      background: rgba(11, 28, 40, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.22);
      position: relative;
      z-index: 1;
    }

    .helios-labels .planet-label {
      position: absolute;
      transform: translateX(-50%);
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid rgba(56, 189, 248, 0.26);
      background: linear-gradient(180deg, rgba(8, 25, 36, 0.92), rgba(2, 10, 18, 0.84));
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.12);
      color: #effcff;
      font-size: 0.6rem;
      opacity: 0;
      transition: opacity 120ms ease;
      white-space: nowrap;
    }

    .helios-labels .planet-label.visible {
      opacity: 1;
    }

    @media (max-width: 900px) {
      .helios-selection-panel {
        top: auto;
        bottom: 150px;
      }

      .helios-status-panel {
        top: 128px;
      }
    }

    @media (max-width: 680px) {
      .helios-hud {
        --hud-gap: 10px;
      }

      .helios-flight-panel,
      .helios-status-panel,
      .helios-mode-panel,
      .helios-selection-panel,
      .helios-controls-panel {
        width: min(220px, calc(100vw - 20px));
        padding: 10px 11px 11px;
      }

      .helios-controls-panel {
        display: none;
      }

      .helios-selection-panel {
        bottom: 112px;
      }

      .helios-crosshair {
        width: 52px;
        height: 52px;
      }
    }
  `;
  document.head.appendChild(style);
}

export default class HUD {
  constructor(root) {
    ensureStyles();
    this.root = root;
    this.root.classList.add('helios-hud');
    this.speedChangeHandler = null;
    this.warpHandler = null;

    this.root.innerHTML = `
      <div class="helios-hud-panel helios-flight-panel">
        <div class="hud-caption">Flight Telemetry</div>
        <div class="hud-grid" style="margin-top: 0.9rem;">
          <div class="hud-row">
            <div>
              <div class="hud-caption">Speed</div>
              <div class="hud-value" data-speed>0.00 km/s</div>
            </div>
            <div style="text-align: right;">
              <div class="hud-caption">Altitude</div>
              <div class="hud-value" data-altitude>0 km</div>
            </div>
          </div>
          <div>
            <div class="hud-row">
              <div class="hud-caption">Fuel</div>
              <div class="hud-caption" data-fuel-percent>100%</div>
            </div>
            <div class="helios-fuel" style="margin-top: 0.45rem;">
              <div class="helios-fuel-bar" data-fuel-bar></div>
            </div>
          </div>
          <div class="helios-integrity">
            <div class="hud-row">
              <div class="hud-caption">Suit Integrity</div>
              <div class="hud-caption" data-suit-integrity>100%</div>
            </div>
            <div class="helios-integrity-track" style="margin-top: 0.45rem;">
              <div class="helios-integrity-fill" data-suit-integrity-fill></div>
            </div>
          </div>
          <div>
            <div class="hud-row">
              <div class="hud-caption">Simulation Speed</div>
              <div class="hud-caption" data-sim-speed>50x</div>
            </div>
            <input class="helios-slider" data-speed-slider type="range" min="1" max="1000" value="50" step="1" />
          </div>
        </div>
      </div>

      <div class="helios-hud-panel helios-status-panel">
        <div class="hud-caption">Simulation Date</div>
        <div class="hud-value" data-date>Initializing...</div>
        <div class="helios-kv" style="margin-top: 1rem;">
          <div class="label">Location</div>
          <div class="value" data-location>Earth</div>
          <div class="label">Gravity</div>
          <div class="value" data-gravity>0.00 m/s^2</div>
          <div class="label">Camera</div>
          <div class="value" data-camera-mode>THIRD_PERSON</div>
        </div>
        <div class="helios-status-line" data-spawn-label>Locating nearest launch facility...</div>
        <div class="helios-status-note" data-surface-note>Orbital telemetry nominal.</div>
      </div>

      <div class="helios-hud-panel helios-selection-panel">
        <div class="hud-caption">Target Intelligence</div>
        <div class="hud-value" data-selection-name>None</div>
        <div class="helios-status-line" data-selection-subtitle>Select a world to inspect it.</div>
        <div class="helios-selection-grid">
          <div>
            <div class="metric-label">Distance From Sun</div>
            <div class="metric-value" data-selection-distance>-</div>
          </div>
          <div>
            <div class="metric-label">Gravity</div>
            <div class="metric-value" data-selection-gravity>-</div>
          </div>
          <div>
            <div class="metric-label">Moons</div>
            <div class="metric-value" data-selection-moons>-</div>
          </div>
          <div>
            <div class="metric-label">Radius</div>
            <div class="metric-value" data-selection-radius>-</div>
          </div>
        </div>
      </div>

      <div class="helios-hud-panel helios-mode-panel">
        <div class="hud-caption">Flight Mode</div>
        <div class="hud-value" data-flight-mode>FLIGHT</div>
        <div class="helios-target-pill">
          <span class="hud-caption">Target</span>
          <span data-target-name>None</span>
        </div>
        <div class="helios-status-line" data-hazard-note>Suit systems nominal.</div>
        <div class="helios-status-line" data-structure-status>Structure: None</div>
      </div>

      <div class="helios-hud-panel helios-controls-panel">
        <div class="hud-caption">Controls Reference</div>
        <ul class="helios-help-list">
          <li>W/S: Thrust Forward/Back | A/D: Strafe Left/Right | Q/E: Up/Down</li>
          <li>Arrow/Mouse: Pitch and Yaw | Z/X: Roll | Shift: Boost</li>
          <li>F: Toggle Cinematic | V: Toggle First/Third Person | M: Open System Map | W: Engage Warp in Map</li>
          <li>Right Mouse: Orbit Chase Camera | Esc: Pause Menu</li>
        </ul>
      </div>

      <div class="helios-center-stack">
        <div class="helios-crosshair" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="84" height="84">
            <defs>
              <linearGradient id="heliosCrosshair" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#8df4ff" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="18" fill="none" stroke="url(#heliosCrosshair)" stroke-width="2.2" opacity="0.9" />
            <circle cx="60" cy="60" r="4.5" fill="url(#heliosCrosshair)" opacity="0.75" />
            <path d="M60 9v16M60 95v16M9 60h16M95 60h16" stroke="url(#heliosCrosshair)" stroke-width="2.4" stroke-linecap="round" />
            <path d="M31 31l8 8M81 81l8 8M31 89l8-8M81 39l8-8" stroke="url(#heliosCrosshair)" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
          </svg>
        </div>
        <button class="helios-warp-button" data-warp-button disabled>Warp Drive Offline</button>
        <div class="helios-landed" data-landed-indicator>Landed</div>
      </div>

      <div class="helios-labels" data-labels-layer></div>

      <div class="helios-alert-flash" data-alert-flash></div>

      <div class="helios-transition" data-transition-overlay>
        <div class="helios-transition-core">
          <div class="helios-transition-ring"></div>
          <div class="helios-transition-label" data-transition-label>Surface load initializing...</div>
        </div>
      </div>

      <div class="helios-pause" data-pause-overlay>
        <div class="helios-pause-card">
          <div class="hud-caption">Paused</div>
          <div class="hud-value" style="margin-top: 0.5rem;">Esc to Resume Flight</div>
        </div>
      </div>
    `;

    this.speedValue = this.root.querySelector('[data-speed]');
    this.altitudeValue = this.root.querySelector('[data-altitude]');
    this.fuelPercentValue = this.root.querySelector('[data-fuel-percent]');
    this.fuelBar = this.root.querySelector('[data-fuel-bar]');
    this.suitIntegrityValue = this.root.querySelector('[data-suit-integrity]');
    this.suitIntegrityFill = this.root.querySelector('[data-suit-integrity-fill]');
    this.simSpeedValue = this.root.querySelector('[data-sim-speed]');
    this.dateValue = this.root.querySelector('[data-date]');
    this.locationValue = this.root.querySelector('[data-location]');
    this.gravityValue = this.root.querySelector('[data-gravity]');
    this.cameraModeValue = this.root.querySelector('[data-camera-mode]');
    this.spawnLabelValue = this.root.querySelector('[data-spawn-label]');
    this.surfaceNoteValue = this.root.querySelector('[data-surface-note]');
    this.selectionNameValue = this.root.querySelector('[data-selection-name]');
    this.selectionSubtitleValue = this.root.querySelector('[data-selection-subtitle]');
    this.selectionDistanceValue = this.root.querySelector('[data-selection-distance]');
    this.selectionGravityValue = this.root.querySelector('[data-selection-gravity]');
    this.selectionMoonsValue = this.root.querySelector('[data-selection-moons]');
    this.selectionRadiusValue = this.root.querySelector('[data-selection-radius]');
    this.flightModeValue = this.root.querySelector('[data-flight-mode]');
    this.targetNameValue = this.root.querySelector('[data-target-name]');
    this.hazardNoteValue = this.root.querySelector('[data-hazard-note]');
    this.structureStatusValue = this.root.querySelector('[data-structure-status]');
    this.warpButton = this.root.querySelector('[data-warp-button]');
    this.landedIndicator = this.root.querySelector('[data-landed-indicator]');
    this.alertFlash = this.root.querySelector('[data-alert-flash]');
    this.transitionOverlay = this.root.querySelector('[data-transition-overlay]');
    this.transitionLabel = this.root.querySelector('[data-transition-label]');
    this.pauseOverlay = this.root.querySelector('[data-pause-overlay]');
    this.labelsLayer = this.root.querySelector('[data-labels-layer]');
    this.speedSlider = this.root.querySelector('[data-speed-slider]');

    for (let index = 0; index < 5; index += 1) {
      const segment = document.createElement('span');
      this.fuelBar.appendChild(segment);
    }

    this.speedSlider.addEventListener('input', (event) => {
      if (this.speedChangeHandler) {
        this.speedChangeHandler(Number(event.target.value));
      }
    });

    this.warpButton.addEventListener('click', () => {
      if (this.warpHandler) {
        this.warpHandler();
      }
    });

    this.lastSurfaceState = null;
  }

  onSimulationSpeedChange(handler) {
    this.speedChangeHandler = handler;
  }

  onWarp(handler) {
    this.warpHandler = handler;
  }

  getLabelsLayer() {
    return this.labelsLayer;
  }

  setSimulationSpeed(speed) {
    this.speedSlider.value = String(speed);
    this.simSpeedValue.textContent = `${speed}x`;
  }

  setSimulationDate(date) {
    this.dateValue.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'medium'
    }).format(date);
  }

  setCameraMode(mode) {
    this.cameraModeValue.textContent = mode;
  }

  setPaused(paused) {
    this.pauseOverlay.classList.toggle('visible', paused);
  }

  setSelectionInfo(info) {
    if (!info) {
      this.selectionNameValue.textContent = 'None';
      this.selectionSubtitleValue.textContent = 'Select a world to inspect it.';
      this.selectionDistanceValue.textContent = '-';
      this.selectionGravityValue.textContent = '-';
      this.selectionMoonsValue.textContent = '-';
      this.selectionRadiusValue.textContent = '-';
      return;
    }

    this.selectionNameValue.textContent = info.name;
    this.selectionSubtitleValue.textContent = info.subtitle;
    this.selectionDistanceValue.textContent = `${info.distanceFromSunAu.toFixed(info.distanceFromSunAu < 10 ? 2 : 1)} AU`;
    this.selectionGravityValue.textContent = `${info.gravity.toFixed(2)} m/s^2`;
    this.selectionMoonsValue.textContent = String(info.moonsCount);
    this.selectionRadiusValue.textContent = `${Math.round(info.radiusKm).toLocaleString()} km`;
  }

  updateShipState(state) {
    this.speedValue.textContent = `${state.speedKmS.toFixed(2)} km/s`;
    this.altitudeValue.textContent = `${Math.max(state.altitudeKm, 0).toFixed(state.altitudeKm < 100 ? 1 : 0)} km`;
    this.fuelPercentValue.textContent = `${state.fuelPercent.toFixed(1)}%`;
    this.locationValue.textContent = state.locationName;
    this.gravityValue.textContent = `${state.gravity.toFixed(2)} m/s^2`;
    this.flightModeValue.textContent = state.mode;
    this.targetNameValue.textContent = state.targetName;
    this.spawnLabelValue.textContent = state.spawnLabel;
    this.landedIndicator.classList.toggle('visible', state.landed);

    const activeSegments = Math.round((state.fuelPercent / 100) * 5);

    [...this.fuelBar.children].forEach((segment, index) => {
      segment.classList.toggle('active', index < activeSegments);
    });
  }

  updateSurfaceState(state) {
    this.lastSurfaceState = state;

    if (!state) {
      this.surfaceNoteValue.textContent = 'Orbital telemetry nominal.';
      this.hazardNoteValue.textContent = 'Suit systems nominal.';
      this.structureStatusValue.textContent = 'Structure: None';
      this.transitionOverlay.classList.remove('visible');
      return;
    }

    this.surfaceNoteValue.textContent = state.note;
    this.structureStatusValue.textContent = state.inStructure
      ? 'Structure: Habitat refuge'
      : 'Structure: None';
    this.transitionOverlay.classList.toggle('visible', Boolean(state.transitionActive));
    this.transitionLabel.textContent = state.transitionStage || 'Surface load initializing...';

    if (state.active || state.transitionActive) {
      this.warpButton.disabled = true;
      this.warpButton.textContent = 'Surface Load Active';
    }
  }

  updateWarpState(state) {
    if (!state) {
      this.warpButton.disabled = true;
      this.warpButton.textContent = 'Warp Drive Offline';
      return;
    }

    if (this.lastSurfaceState?.active || this.lastSurfaceState?.transitionActive) {
      this.warpButton.disabled = true;
      this.warpButton.textContent = 'Surface Load Active';
      return;
    }

    this.warpButton.disabled = !state.warpReady;
    this.warpButton.textContent = state.buttonLabel ?? (state.warpReady ? 'Engage Warp' : 'Warp Drive Offline');
  }

  updateHazardState(state) {
    if (!state) {
      this.suitIntegrityValue.textContent = '100%';
      this.suitIntegrityFill.style.transform = 'scaleX(1)';
      this.suitIntegrityFill.style.background = 'linear-gradient(90deg, #3ef0ff, #38bdf8 58%, #ffd36f 100%)';
      this.hazardNoteValue.textContent = 'Suit systems nominal.';
      this.alertFlash.classList.remove('visible');
      return;
    }

    const integrity = Math.max(state.suitIntegrity, 0);
    this.suitIntegrityValue.textContent = `${integrity.toFixed(1)}%`;
    this.suitIntegrityFill.style.transform = `scaleX(${Math.max(integrity / 100, 0.01)})`;
    this.suitIntegrityFill.style.background =
      integrity < 30
        ? 'linear-gradient(90deg, #ff6c6c, #ff3f46)'
        : integrity < 60
          ? 'linear-gradient(90deg, #ffd36f, #ff9f43)'
          : 'linear-gradient(90deg, #3ef0ff, #38bdf8 58%, #ffd36f 100%)';
    this.hazardNoteValue.textContent = state.bodyName
      ? `${state.bodyName}: ${state.note}`
      : state.note;
    this.alertFlash.classList.toggle('visible', Boolean(state.flashing));
  }
}
