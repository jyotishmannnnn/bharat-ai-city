import { SectorTheme, PowerupEffect } from "./types";

export const LANES = 5;
export const MISSION_DURATION_MS = 45000;
export const EVENT_TIMES_MS = [14000, 30000]; // two random events per run

export type EntityKind = "collect" | "obstacle" | "powerup";

export interface Entity {
  id: number;
  kind: EntityKind;
  lane: number;
  y: number; // 0 (top) -> 1 (bottom, player row)
  defIndex: number;
  glyph: string;
  color: string;
}

export interface FloatingText {
  id: number;
  lane: number;
  y: number;
  text: string;
  color: string;
  life: number; // 1 -> 0
}

export interface ActivePowerup {
  effect: PowerupEffect;
  expiresAt: number; // engine clock ms
}

export interface EngineSnapshot {
  entities: Entity[];
  floatingTexts: FloatingText[];
  playerLane: number;
  score: number;
  combo: number;
  shieldActive: boolean;
  activePowerupLabel: string | null;
  elapsedMs: number;
  remainingMs: number;
  collected: number;
  avoided: number;
  hits: number;
  screenShake: number;
}

let idCounter = 1;

export class ArcadeEngine {
  theme: SectorTheme;
  playerLane = 2;
  score = 0;
  combo = 0;
  collected = 0;
  avoided = 0;
  hits = 0;
  entities: Entity[] = [];
  floatingTexts: FloatingText[] = [];
  activePowerups: ActivePowerup[] = [];
  elapsedMs = 0;
  spawnCooldown = 650;
  baseSpeed = 0.00028; // progress per ms
  speedMultiplier = 1;
  scoreMultiplier = 1;
  spawnRateMultiplier = 1;
  screenShake = 0;
  private clockMsAtPowerup = 0;

  constructor(theme: SectorTheme) {
    this.theme = theme;
  }

  moveLeft() {
    this.playerLane = Math.max(0, this.playerLane - 1);
  }

  moveRight() {
    this.playerLane = Math.min(LANES - 1, this.playerLane + 1);
  }

  setLane(lane: number) {
    this.playerLane = Math.max(0, Math.min(LANES - 1, lane));
  }

  private hasEffect(effect: PowerupEffect, now: number): boolean {
    return this.activePowerups.some((p) => p.effect === effect && p.expiresAt > now);
  }

  private grantPowerup(effect: PowerupEffect, duration: number, now: number) {
    this.activePowerups.push({ effect, expiresAt: now + duration });
  }

  applyEventEffect(delta: {
    scoreDelta?: number;
    valuationMultiplier?: number;
    spawnRateDelta?: number;
    speedDelta?: number;
    livesDelta?: number;
  }) {
    if (delta.scoreDelta) {
      this.score = Math.max(0, this.score + delta.scoreDelta);
      this.pushFloatingText(2, delta.scoreDelta > 0 ? "#4ADE80" : "#F87171", `${delta.scoreDelta > 0 ? "+" : ""}${delta.scoreDelta}`);
    }
    if (delta.spawnRateDelta) {
      this.spawnRateMultiplier = Math.max(0.4, this.spawnRateMultiplier + delta.spawnRateDelta);
    }
    if (delta.speedDelta) {
      this.speedMultiplier = Math.max(0.4, this.speedMultiplier + delta.speedDelta);
      setTimeout(() => {
        this.speedMultiplier = Math.max(0.4, this.speedMultiplier - (delta.speedDelta || 0));
      }, 6000);
    }
    // valuationMultiplier and livesDelta are consumed by the caller (React layer)
  }

  private pushFloatingText(lane: number, color: string, text: string) {
    this.floatingTexts.push({ id: idCounter++, lane, y: 0.8, text, color, life: 1 });
  }

  private spawn(now: number) {
    const roll = Math.random();
    let kind: EntityKind = "collect";
    if (roll > 0.9) kind = "powerup";
    else if (roll > 0.55) kind = "obstacle";

    const lane = Math.floor(Math.random() * LANES);
    let defIndex = 0;
    let glyph = "";
    let color = "#fff";

    if (kind === "collect") {
      defIndex = Math.floor(Math.random() * this.theme.collectibles.length);
      const def = this.theme.collectibles[defIndex];
      glyph = def.glyph;
      color = def.color;
    } else if (kind === "obstacle") {
      defIndex = Math.floor(Math.random() * this.theme.obstacles.length);
      const def = this.theme.obstacles[defIndex];
      glyph = def.glyph;
      color = def.color;
    } else {
      defIndex = Math.floor(Math.random() * this.theme.powerups.length);
      const def = this.theme.powerups[defIndex];
      glyph = def.glyph;
      color = def.color;
    }

    this.entities.push({ id: idCounter++, kind, lane, y: -0.05, defIndex, glyph, color });
  }

  tick(dtMs: number, now: number): EngineSnapshot {
    this.elapsedMs += dtMs;
    this.screenShake = Math.max(0, this.screenShake - dtMs * 0.004);

    // clear expired powerups
    this.activePowerups = this.activePowerups.filter((p) => p.expiresAt > now);
    const slowmo = this.hasEffect("slowmo", now);
    const magnet = this.hasEffect("magnet", now);
    const shield = this.hasEffect("shield", now);
    const multiplierActive = this.hasEffect("multiplier", now);
    this.scoreMultiplier = multiplierActive ? 2 : 1;

    const speed =
      this.baseSpeed *
      this.speedMultiplier *
      (slowmo ? 0.45 : 1) *
      (1 + this.elapsedMs / 180000); // gentle ramp-up over the run

    // spawn
    this.spawnCooldown -= dtMs;
    if (this.spawnCooldown <= 0) {
      this.spawn(now);
      const base = 620 - Math.min(280, this.elapsedMs / 90);
      this.spawnCooldown = Math.max(220, base) / this.spawnRateMultiplier;
    }

    // move + collide
    const remaining: Entity[] = [];
    for (const e of this.entities) {
      e.y += speed * dtMs;

      const magnetPull = magnet && Math.abs(e.lane - this.playerLane) === 1 && e.y > 0.6;
      if (magnetPull) {
        e.lane = this.playerLane;
      }

      const atPlayerRow = e.y >= 0.86 && e.y <= 0.98;
      if (atPlayerRow && e.lane === this.playerLane) {
        this.resolveCollision(e, shield, now);
        continue; // consumed
      }

      if (e.y > 1.08) {
        if (e.kind === "collect") this.avoided += 1; // missed a collectible
        continue; // fell off, drop it
      }
      remaining.push(e);
    }
    this.entities = remaining;

    // floating text decay
    this.floatingTexts = this.floatingTexts
      .map((f) => ({ ...f, y: f.y - dtMs * 0.0006, life: f.life - dtMs * 0.0016 }))
      .filter((f) => f.life > 0);

    const activePowerupLabel = multiplierActive
      ? "2x SCORE"
      : slowmo
      ? "SLOW-MO"
      : magnet
      ? "MAGNET"
      : shield
      ? "SHIELD"
      : null;

    return {
      entities: this.entities,
      floatingTexts: this.floatingTexts,
      playerLane: this.playerLane,
      score: this.score,
      combo: this.combo,
      shieldActive: shield,
      activePowerupLabel,
      elapsedMs: this.elapsedMs,
      remainingMs: Math.max(0, MISSION_DURATION_MS - this.elapsedMs),
      collected: this.collected,
      avoided: this.avoided,
      hits: this.hits,
      screenShake: this.screenShake,
    };
  }

  private resolveCollision(e: Entity, shield: boolean, now: number) {
    if (e.kind === "collect") {
      const def = this.theme.collectibles[e.defIndex];
      this.combo += 1;
      const comboBonus = 1 + Math.min(1, this.combo * 0.05);
      const gained = Math.round(def.points * this.scoreMultiplier * comboBonus);
      this.score += gained;
      this.collected += 1;
      this.pushFloatingText(e.lane, def.color, `+${gained}`);
    } else if (e.kind === "obstacle") {
      const def = this.theme.obstacles[e.defIndex];
      this.combo = 0;
      if (shield) {
        this.pushFloatingText(e.lane, "#60A5FA", "BLOCKED");
      } else {
        this.score = Math.max(0, this.score - def.penalty);
        this.hits += 1;
        this.screenShake = 1;
        this.pushFloatingText(e.lane, "#F87171", `-${def.penalty}`);
      }
    } else {
      const def = this.theme.powerups[e.defIndex];
      this.grantPowerup(def.effect, def.duration, now);
      this.pushFloatingText(e.lane, def.color, def.label.toUpperCase());
    }
  }
}
