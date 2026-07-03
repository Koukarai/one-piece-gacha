import { supabase } from "./supabase";

/**
 * Calls one of our server-authoritative /api/* endpoints, attaching the
 * current user's access token so the server can verify identity.
 * Throws an Error with the server's message on any non-2xx response.
 */
export async function callApi(path, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Not signed in");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request to ${path} failed`);
  return data;
}
