import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Register / refresh an FCM token for the current user.
// Shared `fcm_tokens` table with happyeat — riders use restaurant_id = NULL.
export const registerFcmToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        token: z.string().min(20).max(500),
        restaurantId: z.string().uuid().nullable().optional(),
        userAgent: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: userId,
        restaurant_id: data.restaurantId ?? null,
        token: data.token,
        user_agent: data.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
