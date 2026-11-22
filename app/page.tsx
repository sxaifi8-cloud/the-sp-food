import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import RestaurantExplorer from "@/components/RestaurantExplorer";
import type { Restaurant } from "@/types";

async function RestaurantsData() {
  await connection();
  const supabase = await createClient();

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-red-400">
        Failed to load restaurants: {error.message}
      </div>
    );
  }

  return <RestaurantExplorer restaurants={(restaurants as Restaurant[]) || []} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-[#181B20] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      }
    >
      <RestaurantsData />
    </Suspense>
  );
}