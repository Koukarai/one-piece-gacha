import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../../lib/supabaseServer";
import { CHARACTERS } from "../../../data/characters.js";
import { simulateBattle, type BattleUnitInput } from "../../../game/battleEngine";
import { pickEnemySquad } from "../../../game/enemies";
import { createSeededRng, randomSeed } from "../../../game/rng";

export const prerender = false;

const WIN_REWARD = 250;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("team_slot_1, team_slot_2, team_slot_3")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return jsonResponse({ error: "Profile not found" }, 404);

  const slotIds = [profile.team_slot_1, profile.team_slot_2, profile.team_slot_3].filter(
    (id): id is string => id !== null
  );
  if (slotIds.length === 0) {
    return jsonResponse({ error: "Equip at least one unit in the Barracks before entering the Arena" }, 400);
  }

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
  const enemySquad = pickEnemySquad(createSeededRng(seed));
  const outcome = simulateBattle(playerSquad, enemySquad, seed);

  const reward = outcome.result === "win" ? WIN_REWARD : 0;

  const { data: rewardResult, error: rewardError } = await supabaseAdmin.rpc("grant_battle_reward", {
    p_user_id: user.id,
    p_mode: "pve",
    p_seed: seed,
    p_enemy_squad: enemySquad,
    p_result: outcome.result,
    p_reward: reward,
  });

  if (rewardError) return jsonResponse({ error: rewardError.message }, 400);

  return jsonResponse({
    ...outcome,
    berriesAwarded: reward,
    newBerries: rewardResult?.[0]?.new_berries,
  });
};
