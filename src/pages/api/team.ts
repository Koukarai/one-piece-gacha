import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../lib/supabaseServer";
import { recomputeTeamPower } from "../../lib/teamPower";

export const prerender = false;

const SLOT_COLUMNS = ["team_slot_1", "team_slot_2", "team_slot_3"] as const;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const slot = body?.slot;
  const characterId: string | null = body?.characterId ?? null;

  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    return jsonResponse({ error: "slot must be 1, 2, or 3" }, 400);
  }

  if (characterId !== null) {
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from("inventory")
      .select("character_id")
      .eq("user_id", user.id)
      .eq("character_id", characterId)
      .maybeSingle();

    if (ownedError) return jsonResponse({ error: ownedError.message }, 400);
    if (!owned) return jsonResponse({ error: "You do not own this unit" }, 403);
  }

  const column = SLOT_COLUMNS[slot - 1];
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ [column]: characterId })
    .eq("id", user.id);

  if (updateError) return jsonResponse({ error: updateError.message }, 400);

  await recomputeTeamPower(user.id);

  return jsonResponse({ slot, characterId });
};
