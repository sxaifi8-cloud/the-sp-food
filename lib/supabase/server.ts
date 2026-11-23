import { createServerClient } from "@supabase/ssr";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored when called from a Server Component.
          // Session refreshing is handled by middleware if added later.
        }
      },
    },
  });
}

export async function fetchRestaurantsServerSafe() {
  const supabase = await createClient();

  let { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("name", { ascending: true });

  const isJwtExpired =
    error?.code === "PGRST301" ||
    error?.message?.toLowerCase().includes("jwt expired");

  if (isJwtExpired) {
    const anonSupabase = createAnonClient(supabaseUrl, supabasePublishableKey);
    ({ data, error } = await anonSupabase
      .from("restaurants")
      .select("*")
      .order("name", { ascending: true }));
  }

  if (error) {
    throw new Error(`Failed to load restaurants: ${error.message}`);
  }

  return data ?? [];
}