import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../../lib/supabaseServer";
import { computeNextStreak, dailyLoginReward, todayUtcDateString } from "../../../game/dailyLogin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("login_streak, last_login_date")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return jsonResponse({ error: "Profile not found" }, 404);

  const today = todayUtcDateString();
  const { newStreak, alreadyClaimedToday } = computeNextStreak(profile.last_login_date, today, profile.login_streak);

  if (alreadyClaimedToday) {
    return jsonResponse({ claimed: false, alreadyClaimed: true, streak: newStreak });
  }

  const reward = dailyLoginReward(newStreak);

  const { data: result, error: commitError } = await supabaseAdmin.rpc("claim_daily_login_commit", {
    p_user_id: user.id,
    p_today: today,
    p_new_streak: newStreak,
    p_reward: reward,
  });

  if (commitError) return jsonResponse({ error: commitError.message }, 400);

  return jsonResponse({
    claimed: true,
    streak: result?.[0]?.new_streak,
    reward,
    newBerries: result?.[0]?.new_berries,
  });
};
