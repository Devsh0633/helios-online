function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export const SURFACE_HAZARDS = {
  mercury: { heatRate: 2.0, pressureRate: 0, radiationRate: 0.5, toxicRate: 0, note: 'Extreme temperature swing' },
  venus: { heatRate: 3.0, pressureRate: 5.0, radiationRate: 0, toxicRate: 2.0, note: 'Crush and bake' },
  earth: { heatRate: 0, pressureRate: 0, radiationRate: 0, toxicRate: 0, note: 'Safe without suit' },
  moon: { heatRate: 0.1, pressureRate: 0, radiationRate: 0.8, toxicRate: 0, note: 'Vacuum + radiation' },
  mars: { heatRate: 0.3, pressureRate: 0, radiationRate: 0.4, toxicRate: 0.2, note: 'Cold thin atmosphere' },
  io: { heatRate: 1.0, pressureRate: 0, radiationRate: 2.0, toxicRate: 0.5, note: 'Volcanic + Jupiter radiation' },
  europa: { heatRate: 0.2, pressureRate: 0, radiationRate: 1.5, toxicRate: 0, note: 'Radiation belt' },
  titan: { heatRate: 0.3, pressureRate: 0.1, radiationRate: 0, toxicRate: 0.3, note: 'Cold methane' },
  triton: { heatRate: 0.5, pressureRate: 0, radiationRate: 0.3, toxicRate: 0, note: 'Extreme cold' },
  pluto: { heatRate: 0.3, pressureRate: 0, radiationRate: 0, toxicRate: 0, note: 'Extreme cold vacuum' }
};

const SAFE_HAZARD = {
  heatRate: 0,
  pressureRate: 0,
  radiationRate: 0,
  toxicRate: 0,
  note: 'Ship systems nominal'
};

function normalizeBodyName(name) {
  return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
}

export default class HazardSystem {
  constructor() {
    this.suitIntegrity = 100;
    this.warningThreshold = 30;
    this.respawnPending = false;
    this.warningPulse = 0;
    this.state = {
      suitIntegrity: 100,
      critical: false,
      flashing: false,
      note: SAFE_HAZARD.note,
      bodyName: 'Ship Interior',
      totalRate: 0,
      safeZone: true,
      inStructure: false
    };
  }

  update(deltaSeconds, context = {}) {
    const bodyKey = normalizeBodyName(context.bodyName);
    const hazard = SURFACE_HAZARDS[bodyKey] ?? SAFE_HAZARD;
    const hazardRate =
      hazard.heatRate + hazard.pressureRate + hazard.radiationRate + hazard.toxicRate;
    const activeHazards = Boolean(context.active && context.hazardActive && hazardRate > 0);
    const inStructure = Boolean(context.inStructure);
    const safeZone = Boolean(context.safeZone || inStructure || !activeHazards);

    if (inStructure) {
      this.suitIntegrity = clamp(this.suitIntegrity + 12 * deltaSeconds, 0, 100);
    } else if (activeHazards) {
      this.suitIntegrity = clamp(this.suitIntegrity - hazardRate * deltaSeconds, 0, 100);
    } else {
      this.suitIntegrity = clamp(this.suitIntegrity + 1.5 * deltaSeconds, 0, 100);
    }

    const critical = this.suitIntegrity < this.warningThreshold;
    this.warningPulse += deltaSeconds * (critical ? 6.5 : 2.0);

    if (this.suitIntegrity <= 0 && !this.respawnPending) {
      this.respawnPending = true;
    }

    this.state = {
      suitIntegrity: this.suitIntegrity,
      critical,
      flashing: critical && Math.sin(this.warningPulse) > -0.1,
      note: hazard.note,
      bodyName: context.bodyName ?? 'Ship Interior',
      totalRate: activeHazards ? hazardRate : 0,
      safeZone,
      inStructure
    };
  }

  consumeRespawn() {
    if (!this.respawnPending) {
      return false;
    }

    this.respawnPending = false;
    this.suitIntegrity = 100;
    this.state = {
      ...this.state,
      suitIntegrity: 100,
      critical: false,
      flashing: false
    };
    return true;
  }

  restoreFully() {
    this.suitIntegrity = 100;
  }

  getState() {
    return this.state;
  }
}
