import { createSeededRng } from "./rng";
import { statMultiplier } from "./leveling";

export interface Skill {
  name: string;
  desc: string;
  type: "Active" | "Ultimate";
}

export interface CharacterBase {
  id: string;
  name: string;
  image: string;
  rarity: string;
  role: string;
  stats: { hp: number; atk: number; spd: number };
  passive?: { name: string; desc: string } | null;
  skills?: Skill[];
}

/** A player unit going into battle, with the level applied to its stats. */
export interface BattleUnitInput extends CharacterBase {
  level?: number;
}

/** A stripped-down snapshot of a unit's public state, safe to send to the client. */
export interface PublicUnit {
  id: string;
  name: string;
  image: string;
  rarity: string;
  role: string;
  maxHp: number;
}

export type BattleEvent =
  | {
      type: "action";
      side: "player" | "enemy";
      attackerIndex: number;
      targetIndex: number;
      skillName: string;
      skillType: "Active" | "Ultimate";
      damage: number;
      isCrit: boolean;
      targetHpAfter: number;
      targetDied: boolean;
    }
  | {
      type: "heal";
      side: "player" | "enemy";
      healerIndex: number;
      targetIndex: number;
      amount: number;
      targetHpAfter: number;
    }
  | { type: "battle_end"; result: "win" | "loss" };

export interface BattleOutcome {
  playerSquad: PublicUnit[];
  enemySquad: PublicUnit[];
  events: BattleEvent[];
  result: "win" | "loss";
}

interface RuntimeUnit {
  id: string;
  name: string;
  image: string;
  rarity: string;
  role: string;
  atk: number;
  passive?: { name: string; desc: string } | null;
  skills: Skill[];
  currentHp: number;
  maxHp: number;
  isDead: boolean;
  currentEnergy: number;
  maxEnergy: number;
}

const BASIC_ATTACK: Skill = { name: "Attack", desc: "Basic Attack", type: "Active" };
const MAX_ROUNDS = 50; // safety cap against runaway loops from bad content data

function toRuntimeUnit(unit: BattleUnitInput): RuntimeUnit {
  const mult = statMultiplier(unit.level ?? 1);
  const hp = Math.floor(unit.stats.hp * mult);
  return {
    id: unit.id,
    name: unit.name,
    image: unit.image,
    rarity: unit.rarity,
    role: unit.role,
    atk: Math.floor(unit.stats.atk * mult),
    passive: unit.passive ?? null,
    skills: unit.skills ?? [],
    currentHp: hp,
    maxHp: hp,
    isDead: false,
    currentEnergy: 0,
    maxEnergy: 100,
  };
}

function toPublicUnit(unit: RuntimeUnit): PublicUnit {
  return { id: unit.id, name: unit.name, image: unit.image, rarity: unit.rarity, role: unit.role, maxHp: unit.maxHp };
}

function lowestHpLivingIndex(squad: RuntimeUnit[]): number {
  let bestIndex = -1;
  let bestHpFraction = Infinity;
  squad.forEach((unit, index) => {
    if (unit.isDead) return;
    const fraction = unit.currentHp / unit.maxHp;
    if (fraction < bestHpFraction) {
      bestHpFraction = fraction;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function randomLivingIndex(squad: RuntimeUnit[], rng: () => number): number {
  const livingIndexes = squad.map((u, i) => i).filter((i) => !squad[i].isDead);
  if (livingIndexes.length === 0) return -1;
  return livingIndexes[Math.floor(rng() * livingIndexes.length)];
}

function pickSkill(unit: RuntimeUnit): Skill {
  const ultimate = unit.skills.find((s) => s.type === "Ultimate");
  if (ultimate && unit.currentEnergy >= unit.maxEnergy) return ultimate;
  const active = unit.skills.find((s) => s.type === "Active");
  return active ?? BASIC_ATTACK;
}

function performAttack(
  rng: () => number,
  side: "player" | "enemy",
  attacker: RuntimeUnit,
  attackerIndex: number,
  target: RuntimeUnit,
  targetIndex: number,
  skill: Skill
): BattleEvent {
  let multiplier = 1.0;
  let isCrit = rng() < 0.15;

  if (skill.type === "Ultimate") {
    multiplier = 3.0;
    attacker.currentEnergy = 0;
  } else {
    attacker.currentEnergy = Math.min(attacker.maxEnergy, attacker.currentEnergy + 25);
  }

  if (attacker.passive?.name === "Hawk Eyes") isCrit = rng() < 0.4;
  if (attacker.passive?.name === "Three Sword Style" && isCrit) multiplier *= 1.5;

  let damage = Math.floor(attacker.atk * multiplier * (0.9 + rng() * 0.2));
  if (isCrit) damage = Math.floor(damage * 1.5);

  target.currentHp = Math.max(0, target.currentHp - damage);
  if (target.currentHp <= 0) target.isDead = true;

  return {
    type: "action",
    side,
    attackerIndex,
    targetIndex,
    skillName: skill.name,
    skillType: skill.type,
    damage,
    isCrit,
    targetHpAfter: target.currentHp,
    targetDied: target.isDead,
  };
}

function triggerPassives(side: "player" | "enemy", squad: RuntimeUnit[]): BattleEvent[] {
  const events: BattleEvent[] = [];
  squad.forEach((unit, healerIndex) => {
    if (unit.isDead || unit.passive?.name !== "Doctor") return;
    const targetIndex = lowestHpLivingIndex(squad);
    if (targetIndex === -1) return;
    const target = squad[targetIndex];
    if (target.currentHp >= target.maxHp) return;

    const amount = Math.floor(unit.atk * 0.6);
    target.currentHp = Math.min(target.currentHp + amount, target.maxHp);
    events.push({ type: "heal", side, healerIndex, targetIndex, amount, targetHpAfter: target.currentHp });
  });
  return events;
}

function allDead(squad: RuntimeUnit[]): boolean {
  return squad.every((u) => u.isDead);
}

/**
 * Runs a full, deterministic auto-battle: given the same squads and seed,
 * always produces the same event log and result. Player units use a simple
 * "ultimate when ready, else basic attack the lowest-HP living enemy"
 * heuristic; enemies attack a random living player unit — mirrors the
 * original manual arena's rules, just decided by AI instead of clicks.
 */
export function simulateBattle(
  playerUnitsInput: BattleUnitInput[],
  enemyUnitsInput: CharacterBase[],
  seed: string
): BattleOutcome {
  const rng = createSeededRng(seed);
  const playerSquad = playerUnitsInput.map(toRuntimeUnit);
  const enemySquad = enemyUnitsInput.map(toRuntimeUnit);
  const events: BattleEvent[] = [];

  let result: "win" | "loss" | null = null;

  for (let round = 0; round < MAX_ROUNDS && result === null; round++) {
    // Player phase
    for (let i = 0; i < playerSquad.length; i++) {
      const attacker = playerSquad[i];
      if (attacker.isDead) continue;
      const targetIndex = lowestHpLivingIndex(enemySquad);
      if (targetIndex === -1) break;
      const skill = pickSkill(attacker);
      events.push(performAttack(rng, "player", attacker, i, enemySquad[targetIndex], targetIndex, skill));
    }
    events.push(...triggerPassives("player", playerSquad));

    if (allDead(enemySquad)) {
      result = "win";
      break;
    }

    // Enemy phase
    for (let i = 0; i < enemySquad.length; i++) {
      const attacker = enemySquad[i];
      if (attacker.isDead) continue;
      const targetIndex = randomLivingIndex(playerSquad, rng);
      if (targetIndex === -1) break;
      events.push(performAttack(rng, "enemy", attacker, i, playerSquad[targetIndex], targetIndex, BASIC_ATTACK));
    }
    events.push(...triggerPassives("enemy", enemySquad));

    if (allDead(playerSquad)) {
      result = "loss";
      break;
    }
  }

  // Safety net: if MAX_ROUNDS was hit without a winner (shouldn't happen with
  // normal content), decide by remaining HP fraction rather than hanging.
  if (result === null) {
    const playerHpFrac = playerSquad.reduce((sum, u) => sum + u.currentHp / u.maxHp, 0);
    const enemyHpFrac = enemySquad.reduce((sum, u) => sum + u.currentHp / u.maxHp, 0);
    result = playerHpFrac >= enemyHpFrac ? "win" : "loss";
  }

  events.push({ type: "battle_end", result });

  return {
    playerSquad: playerSquad.map(toPublicUnit),
    enemySquad: enemySquad.map(toPublicUnit),
    events,
    result,
  };
}
