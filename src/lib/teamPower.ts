import { supabaseAdmin } from "./supabaseServer";
import { CHARACTERS } from "../data/characters.js";
import { powerScore } from "../game/leveling";

/**
 * Recomputes and persists a user's team_power (sum of powerScore across
 * their currently equipped squad) — called after anything that could
 * change it: equipping/unequipping a unit, or training one.
 */
export async function recomputeTeamPower(userId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("team_slot_1, team_slot_2, team_slot_3")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const slotIds = [profile.team_slot_1, profile.team_slot_2, profile.team_slot_3].filter(
    (id): id is string => id !== null
  );

  if (slotIds.length === 0) {
    await supabaseAdmin.rpc("recompute_team_power_commit", { p_user_id: userId, p_team_power: 0 });
    return;
  }

  const { data: inventory } = await supabaseAdmin
    .from("inventory")
    .select("character_id, level")
    .eq("user_id", userId)
    .in("character_id", slotIds);

  const totalPower = slotIds.reduce((sum, id) => {
    const base = CHARACTERS.find((c) => c.id === id);
    const owned = inventory?.find((i) => i.character_id === id);
    if (!base || !owned) return sum;
    return sum + powerScore(base.stats.hp, base.stats.atk, owned.level);
  }, 0);

  await supabaseAdmin.rpc("recompute_team_power_commit", { p_user_id: userId, p_team_power: totalPower });
}
