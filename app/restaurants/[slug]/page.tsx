import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Star,
  MapPin,
  Flame,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RestaurantMenuClient from "@/components/MenuClient";
import type { Restaurant, MenuItem } from "@/types";

interface ExtendedRestaurant extends Restaurant {
  deal_banner?: string | null;
}

async function RestaurantDetailContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !restaurant) {
    notFound();
  }

  const rest = restaurant as ExtendedRestaurant;
  const isOpen = rest.is_open !== false;

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", rest.id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen flex flex-col bg-[#0F1115] text-white pb-16">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F] shrink-0 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-white truncate">
                {rest.name}
              </h1>
              <p className="text-[11px] text-zinc-400 truncate">
                {rest.cuisine} • {rest.area}, Faisalabad
              </p>
            </div>
          </div>

          <Link
            href="/cart"
            className="bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shrink-0 transition-colors"
          >
            View Cart
          </Link>
        </div>
      </header>

      {/* Hero Cover Banner */}
      <div className="relative h-52 sm:h-64 w-full bg-zinc-900 overflow-hidden">
        {rest.image_url ? (
          <img
            src={rest.image_url}
            alt={rest.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#181B20] to-[#0F1115]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-[#0F1115]/50 to-transparent" />

        {/* Status & Discount Badges */}
        <div className="absolute top-4 left-4 right-4 max-w-5xl mx-auto flex items-center justify-between gap-2">
          {isOpen ? (
            <span className="bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
              Open Now
            </span>
          ) : (
            <span className="bg-red-500/20 backdrop-blur-md border border-red-400/40 text-red-300 text-xs font-bold px-3 py-1 rounded-full">
              Currently Closed
            </span>
          )}

          {rest.discount_percent > 0 && (
            <span className="bg-[#FF5A1F] text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-lg">
              {rest.discount_percent}% OFF
            </span>
          )}
        </div>
      </div>

      {/* Restaurant Dashboard Header */}
      <main className="max-w-5xl mx-auto px-4 -mt-10 relative z-10 w-full space-y-6">
        <section className="bg-[#181B20] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {rest.name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {rest.description ||
                  `Freshly prepared ${rest.cuisine} delivered across Faisalabad.`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {rest.rating}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold bg-[#0F1115] text-zinc-200 border border-white/10 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5 text-[#FF5A1F]" />
                {rest.delivery_time}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-t border-white/10">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Kitchen Zone: <strong className="text-zinc-200">{rest.area}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#FF5A1F]" />
              {rest.cuisine}
            </span>
          </div>

          {/* Special Deal / Offer Banner */}
          {rest.deal_banner && (
            <div className="bg-gradient-to-r from-[#F5C542]/15 via-[#FF5A1F]/15 to-transparent border border-[#F5C542]/30 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-[#F5C542] shrink-0" />
              <span className="font-semibold text-[#FEF3C7]">
                Special Deal: {rest.deal_banner}
              </span>
            </div>
          )}

          {/* Closed Warning */}
          {!isOpen && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                This kitchen is temporarily paused and not accepting new orders right now.
              </span>
            </div>
          )}
        </section>

        {/* Interactive Menu with Category Tabs */}
        <RestaurantMenuClient
          restaurant={rest}
          items={(menuItems as MenuItem[]) || []}
          isOpen={isOpen}
        />
      </main>
    </div>
  );
}

export default function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          <div className="h-52 rounded-2xl bg-[#181B20] animate-pulse" />
          <div className="h-32 rounded-2xl bg-[#181B20] animate-pulse" />
        </div>
      }
    >
      <RestaurantDetailContent params={params} />
    </Suspense>
  );
}