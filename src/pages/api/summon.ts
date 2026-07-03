import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../lib/supabaseServer";
import { rollSummon, SUMMON_COST } from "../../game/summonOdds";
import { createSeededRng, randomSeed } from "../../game/rng";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("berries, pity_count")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return jsonResponse({ error: "Profile not found" }, 404);
  if (profile.berries < SUMMON_COST) {
    return jsonResponse({ error: `Insufficient berries: need ${SUMMON_COST}, have ${profile.berries}` }, 400);
  }

  const seed = randomSeed();
  const rng = createSeededRng(seed);
  const { character, nextPityCount, pityTriggered } = rollSummon(rng, profile.pity_count);

  const { data: commitResult, error: commitError } = await supabaseAdmin.rpc("summon_commit", {
    p_user_id: user.id,
    p_character_id: character.id,
    p_cost: SUMMON_COST,
    p_new_pity_count: nextPityCount,
  });

  if (commitError) return jsonResponse({ error: commitError.message }, 400);

  const newBerries = commitResult?.[0]?.new_berries ?? profile.berries - SUMMON_COST;

  return jsonResponse({
    character,
    pityTriggered,
    newBerries,
    newPityCount: nextPityCount,
  });
};
