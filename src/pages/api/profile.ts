import type { APIRoute } from "astro";
import { jsonResponse, requireUser, supabaseAdmin } from "../../lib/supabaseServer";
import { CHARACTERS } from "../../data/characters.js";

export const prerender = false;

const MAX_USERNAME_LENGTH = 20;
const DICEBEAR_PREFIX = "https://api.dicebear.com/";

function isAllowedAvatar(url: string): boolean {
  if (url.startsWith(DICEBEAR_PREFIX)) return true;
  return CHARACTERS.some((c) => c.image === url);
}

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const updates: Record<string, string> = {};

  if (typeof body?.username === "string") {
    const trimmed = body.username.trim().slice(0, MAX_USERNAME_LENGTH);
    if (trimmed.length > 0) updates.username = trimmed;
  }

  if (typeof body?.avatarUrl === "string" && isAllowedAvatar(body.avatarUrl)) {
    updates.avatar_url = body.avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ error: "No valid fields to update" }, 400);
  }

  const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", user.id);
  if (error) return jsonResponse({ error: error.message }, 400);

  return jsonResponse({ ok: true, ...updates });
};
