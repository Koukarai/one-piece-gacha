import { describe, expect, it } from "vitest";
import { simulateBattle, type BattleUnitInput, type CharacterBase } from "./battleEngine";
import { CHARACTERS } from "../data/characters.js";

function unit(overrides: Partial<CharacterBase> = {}): CharacterBase {
  return {
    id: "test-unit",
    name: "Test Unit",
    image: "/images/test.png",
    rarity: "R",
    role: "Tester",
    stats: { hp: 1000, atk: 100, spd: 100 },
    passive: null,
    skills: [],
    ...overrides,
  };
}

describe("simulateBattle", () => {
  it("is deterministic for the same squads and seed", () => {
    const players: BattleUnitInput[] = [unit({ id: "p1" })];
    const enemies: CharacterBase[] = [unit({ id: "e1" })];

    const first = simulateBattle(players, enemies, "same-seed");
    const second = simulateBattle(players, enemies, "same-seed");

    expect(second).toEqual(first);
  });

  it("always ends with a battle_end event carrying a valid result", () => {
    const players: BattleUnitInput[] = [unit({ id: "p1" })];
    const enemies: CharacterBase[] = [unit({ id: "e1" })];

    const outcome = simulateBattle(players, enemies, "end-event-check");
    const last = outcome.events[outcome.events.length - 1];

    expect(last.type).toBe("battle_end");
    expect(["win", "loss"]).toContain(outcome.result);
  });

  it("never lets a target's HP after an action go below zero", () => {
    const players: BattleUnitInput[] = [unit({ id: "p1", stats: { hp: 1000, atk: 900, spd: 100 } })];
    const enemies: CharacterBase[] = [unit({ id: "e1", stats: { hp: 500, atk: 900, spd: 100 } })];

    const outcome = simulateBattle(players, enemies, "no-negative-hp");
    for (const event of outcome.events) {
      if (event.type === "action") {
        expect(event.targetHpAfter).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("a hugely overpowered player squad wins", () => {
    const players: BattleUnitInput[] = [unit({ id: "p1", stats: { hp: 999999, atk: 999999, spd: 999 } })];
    const enemies: CharacterBase[] = [unit({ id: "e1", stats: { hp: 1, atk: 1, spd: 1 } })];

    const outcome = simulateBattle(players, enemies, "overpowered-win");
    expect(outcome.result).toBe("win");
  });

  it("a hopelessly weak player squad loses", () => {
    const players: BattleUnitInput[] = [unit({ id: "p1", stats: { hp: 1, atk: 1, spd: 1 } })];
    const enemies: CharacterBase[] = [unit({ id: "e1", stats: { hp: 999999, atk: 999999, spd: 999 } })];

    const outcome = simulateBattle(players, enemies, "overpowered-loss");
    expect(outcome.result).toBe("loss");
  });

  it("applies the player's level to scale stats before battle", () => {
    const lowLevel: BattleUnitInput[] = [unit({ id: "p1", level: 1, stats: { hp: 1000, atk: 100, spd: 100 } })];
    const highLevel: BattleUnitInput[] = [unit({ id: "p1", level: 20, stats: { hp: 1000, atk: 100, spd: 100 } })];
    const enemies: CharacterBase[] = [unit({ id: "e1", stats: { hp: 5000, atk: 50, spd: 100 } })];

    const lowOutcome = simulateBattle(lowLevel, enemies, "level-scaling");
    const highOutcome = simulateBattle(highLevel, enemies, "level-scaling");

    expect(highOutcome.playerSquad[0].maxHp).toBeGreaterThan(lowOutcome.playerSquad[0].maxHp);
  });

  it("works with real catalog characters", () => {
    const luffy = CHARACTERS.find((c) => c.id === "char_luffy")!;
    const chopper = CHARACTERS.find((c) => c.id === "char_chopper")!;
    const players: BattleUnitInput[] = [luffy, chopper];
    const enemies: CharacterBase[] = [unit({ id: "e1" }), unit({ id: "e2" })];

    const outcome = simulateBattle(players, enemies, "catalog-check");
    expect(["win", "loss"]).toContain(outcome.result);
    expect(outcome.playerSquad).toHaveLength(2);
  });
});
