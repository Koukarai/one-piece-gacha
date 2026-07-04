import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../../lib/supabaseServer";
import { todayUtcDateString } from "../../../game/dailyLogin";
import { claimedColumnFor, DAILY_QUESTS, isQuestComplete, progressColumnFor } from "../../../game/dailyQuests";

export const prerender = false;

// A read-only status check, but implemented as POST for consistency with
// every other endpoint and the shared apiClient.callApi helper (which
// always POSTs).
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const today = todayUtcDateString();
  const { data: row } = await supabaseAdmin
    .from("daily_quest_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("quest_date", today)
    .maybeSingle();

  const progress = row ?? { summons: 0, wins: 0, trainings: 0, claimed_summon: false, claimed_win: false, claimed_training: false };

  const quests = DAILY_QUESTS.map((quest) => {
    const count = progress[progressColumnFor(quest.key)] ?? 0;
    const claimed = progress[claimedColumnFor(quest.key)] ?? false;
    return {
      key: quest.key,
      label: quest.label,
      threshold: quest.threshold,
      reward: quest.reward,
      progress: count,
      complete: isQuestComplete(count, quest),
      claimed,
    };
  });

  return jsonResponse({ quests });
};
