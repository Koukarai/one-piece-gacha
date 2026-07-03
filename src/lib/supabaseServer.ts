import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing server Supabase env vars. Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role key must never be exposed to the client)."
  );
}

/** Server-only client using the service role key. Never import this from client code. */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Verifies the bearer token from an incoming request against Supabase Auth
 * and returns the authenticated user, or null if missing/invalid.
 */
export async function requireUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
