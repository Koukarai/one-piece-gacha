import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../../lib/supabaseServer";
import { CHARACTERS } from "../../../data/characters.js";
import { simulateBattle, type BattleUnitInput } from "../../../game/battleEngine";
import { pickEnemySquad } from "../../../game/enemies";
import { createSeededRng, randomSeed } from "../../../game/rng";
import { computeRegen } from "../../../game/energy";
import { getStage, isStageUnlocked, scaleEnemySquad } from "../../../game/stages";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => ({}));
  const stageId = Number(body?.stageId ?? 1);
  const stage = getStage(stageId);
  if (!stage) return jsonResponse({ error: `Unknown stage ${stageId}` }, 400);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("team_slot_1, team_slot_2, team_slot_3, energy, max_energy, energy_updated_at, highest_stage_cleared")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return jsonResponse({ error: "Profile not found" }, 404);

  if (!isStageUnlocked(stageId, profile.highest_stage_cleared)) {
    return jsonResponse({ error: `Stage ${stageId} is locked — clear stage ${stageId - 1} first` }, 400);
  }

  const slotIds = [profile.team_slot_1, profile.team_slot_2, profile.team_slot_3].filter(
    (id): id is string => id !== null
  );
  if (slotIds.length === 0) {
    return jsonResponse({ error: "Equip at least one unit in the Barracks before entering the Arena" }, 400);
  }

  const regen = computeRegen(profile.energy, profile.max_energy, new Date(profile.energy_updated_at), new Date());
  const { data: energyResult, error: energyError } = await supabaseAdmin.rpc("spend_energy_commit", {
    p_user_id: user.id,
    p_new_energy: regen.newEnergy,
    p_new_energy_updated_at: regen.newUpdatedAt.toISOString(),
    p_cost: stage.energyCost,
  });

  if (energyError) return jsonResponse({ error: energyError.message }, 400);

  const { data: inventory, error: inventoryError } = await supabaseAdmin
    .from("inventory")
    .select("character_id, level")
    .eq("user_id", user.id)
    .in("character_id", slotIds);

  if (inventoryError) return jsonResponse({ error: inventoryError.message }, 400);

  const playerSquad: BattleUnitInput[] = slotIds
    .map((id) => {
      const base = CHARACTERS.find((c) => c.id === id);
      const owned = inventory?.find((i) => i.character_id === id);
      if (!base || !owned) return null;
      return { ...base, level: owned.level };
    })
    .filter((u): u is BattleUnitInput => u !== null);

  if (playerSquad.length === 0) {
    return jsonResponse({ error: "Equipped units could not be loaded" }, 400);
  }

  const seed = randomSeed();
  const baseEnemySquad = pickEnemySquad(createSeededRng(seed));
  const enemySquad = scaleEnemySquad(baseEnemySquad, stage.difficultyMultiplier);
  const outcome = simulateBattle(playerSquad, enemySquad, seed);

  const reward = outcome.result === "win" ? stage.winReward : 0;

  const { data: rewardResult, error: rewardError } = await supabaseAdmin.rpc("grant_battle_reward", {
    p_user_id: user.id,
    p_mode: "pve",
    p_seed: seed,
    p_enemy_squad: enemySquad,
    p_result: outcome.result,
    p_reward: reward,
    p_stage_id: stageId,
  });

  if (rewardError) return jsonResponse({ error: rewardError.message }, 400);

  return jsonResponse({
    ...outcome,
    stageId,
    berriesAwarded: reward,
    newBerries: rewardResult?.[0]?.new_berries,
    newHighestStage: rewardResult?.[0]?.new_highest_stage,
    newEnergy: energyResult?.[0]?.new_energy,
  });
};
