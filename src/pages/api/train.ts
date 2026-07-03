import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../lib/supabaseServer";
import { trainCost } from "../../game/leveling";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const characterId: string | undefined = body?.characterId;
  if (!characterId) return jsonResponse({ error: "characterId is required" }, 400);

  const { data: item, error: itemError } = await supabaseAdmin
    .from("inventory")
    .select("level")
    .eq("user_id", user.id)
    .eq("character_id", characterId)
    .maybeSingle();

  if (itemError) return jsonResponse({ error: itemError.message }, 400);
  if (!item) return jsonResponse({ error: "You do not own this unit" }, 403);

  const cost = trainCost(item.level);

  const { data: result, error: commitError } = await supabaseAdmin.rpc("level_up_commit", {
    p_user_id: user.id,
    p_character_id: characterId,
    p_cost: cost,
  });

  if (commitError) return jsonResponse({ error: commitError.message }, 400);

  const row = result?.[0];
  return jsonResponse({ newLevel: row?.new_level, newBerries: row?.new_berries, cost });
};
