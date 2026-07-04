import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../lib/supabaseServer";
import { requiresShardToLevelUp, trainCost } from "../../game/leveling";
import { recomputeTeamPower } from "../../lib/teamPower";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const characterId: string | undefined = body?.characterId;
  if (!characterId) return jsonResponse({ error: "characterId is required" }, 400);

  const { data: item, error: itemError } = await supabaseAdmin
    .from("inventory")
    .select("level, count")
    .eq("user_id", user.id)
    .eq("character_id", characterId)
    .maybeSingle();

  if (itemError) return jsonResponse({ error: itemError.message }, 400);
  if (!item) return jsonResponse({ error: "You do not own this unit" }, 403);

  const cost = trainCost(item.level);
  const consumesShard = requiresShardToLevelUp(item.level);

  if (consumesShard && item.count < 2) {
    return jsonResponse(
      { error: `Training past level ${item.level} requires a duplicate of this unit (you have ${item.count})` },
      400
    );
  }

  const { data: result, error: commitError } = await supabaseAdmin.rpc("level_up_commit", {
    p_user_id: user.id,
    p_character_id: characterId,
    p_cost: cost,
    p_consumes_shard: consumesShard,
  });

  if (commitError) return jsonResponse({ error: commitError.message }, 400);

  await recomputeTeamPower(user.id);

  const row = result?.[0];
  return jsonResponse({
    newLevel: row?.new_level,
    newBerries: row?.new_berries,
    newCount: row?.new_count,
    cost,
    consumedShard: consumesShard,
  });
};
