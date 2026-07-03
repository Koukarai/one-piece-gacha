import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../../lib/supabaseServer";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const mailId = body?.mailId;
  if (!mailId) return jsonResponse({ error: "mailId is required" }, 400);

  const { data, error } = await supabaseAdmin.rpc("claim_mail", {
    p_user_id: user.id,
    p_mail_id: mailId,
  });

  if (error) return jsonResponse({ error: error.message }, 400);

  return jsonResponse({ newBerries: data?.[0]?.new_berries });
};
