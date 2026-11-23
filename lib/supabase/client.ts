import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

export async function fetchRestaurantsClientSafe() {
  const supabase = createClient();

  let { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("name", { ascending: true });

  const isJwtExpired =
    error?.code === "PGRST301" ||
    error?.message?.toLowerCase().includes("jwt expired");

  if (isJwtExpired) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      await supabase.auth.signOut({ scope: "local" });
    }

    ({ data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("name", { ascending: true }));
  }

  if (error) {
    throw new Error(`Failed to load restaurants: ${error.message}`);
  }

  return data ?? [];
}