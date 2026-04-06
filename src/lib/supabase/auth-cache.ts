import { cache } from "react";
import { createClient } from "./server";

/** One Supabase `getUser()` per request when used from layout + page + store. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
