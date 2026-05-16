import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Client-side middleware that attaches the current Supabase access token
 * to every outgoing server-function RPC as `Authorization: Bearer <token>`.
 *
 * Pair with `requireSupabaseAuth` on the server side.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return next();
    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
