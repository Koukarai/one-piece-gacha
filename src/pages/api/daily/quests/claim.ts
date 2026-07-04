import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../../../lib/supabaseServer";
import { todayUtcDateString } from "../../../../game/dailyLogin";
import { DAILY_QUESTS } from "../../../../game/dailyQuests";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const questKey = body?.questKey;
  const quest = DAILY_QUESTS.find((q) => q.key === questKey);
  if (!quest) return jsonResponse({ error: `Unknown quest key ${questKey}` }, 400);

  const today = todayUtcDateString();

  const { data: result, error } = await supabaseAdmin.rpc("claim_daily_quest_commit", {
    p_user_id: user.id,
    p_quest_date: today,
    p_quest_key: quest.key,
    p_reward: quest.reward,
  });

  if (error) return jsonResponse({ error: error.message }, 400);

  return jsonResponse({ reward: quest.reward, newBerries: result?.[0]?.new_berries });
};
