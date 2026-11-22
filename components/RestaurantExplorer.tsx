"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  Clock,
  Star,
  Tag,
  SlidersHorizontal,
  ShoppingBag,
  X,
  Receipt,
  LogIn,
  LogOut,
  Gift,
  Phone,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { FAISALABAD_AREAS } from "@/data/areas";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types";

function detectGender(name: string): "female" | "male" {
  const first = name.trim().toLowerCase().split(" ")[0];
  if (!first) return "male";

  const maleExceptions = new Set([
    "hamza", "talha", "usama", "osama", "mustafa", "murtaza",
    "raza", "musa", "isa", "yahya", "zakariya", "huzaifa", "zohaib",
  ]);
  if (maleExceptions.has(first)) return "male";

  const femaleNames = new Set([
    "ayesha", "aisha", "fatima", "zainab", "maryam", "mariam", "sana",
    "hina", "sara", "sarah", "amna", "amina", "maria", "maham", "hira",
    "iqra", "nimra", "kiran", "kinza", "laiba", "eman", "iman", "noor",
    "zoya", "aliza", "alishba", "mehwish", "rabia", "sidra", "sadia",
    "bushra", "farah", "komal", "misbah", "shazia", "uzma", "yasmin",
    "arooba", "dua", "fiza", "javeria", "maheen", "mahnoor", "momina",
  ]);
  if (femaleNames.has(first) || first.endsWith("a") || first.endsWith("ah")) {
    return "female";
  }

  return "male";
}

function GenderAvatar({ name }: { name: string }) {
  const gender = detectGender(name);
  return (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
        gender === "female"
          ? "bg-pink-500/20 text-pink-400"
          : "bg-sky-500/20 text-sky-400"
      }`}
    >
      {gender === "female" ? "👩" : "👨"}
    </span>
  );
}

export default function RestaurantExplorer({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const router = useRouter();
  const { totalItems } = useCart();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [location, setLocation] = useState("");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [under30Min, setUnder30Min] = useState(false);
  const [priceTier, setPriceTier] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"recommended" | "fastest" | "rating">(
    "recommended"
  );

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail(null);
        setUserName("");
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const resolvedName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Profile";

      setUserName(resolvedName);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUserEmail(null);
        setUserName("");
      } else {
        loadUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserName("");
    router.refresh();
  };

  const matchingAreas = useMemo(() => {
    const q = location.toLowerCase().trim();
    if (!q) return FAISALABAD_AREAS;
    return FAISALABAD_AREAS.filter((a) => a.toLowerCase().includes(q));
  }, [location]);

  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter((r) => {
        const q = searchQuery.toLowerCase().trim();
        const loc = location.toLowerCase().trim();

        const matchesSearch =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q));

        const matchesLocation =
          !loc || r.area.toLowerCase().includes(loc.split(" ")[0]);

        const matchesDeals = !onlyDeals || r.discount_percent > 0;
        const matchesTime = !under30Min || r.delivery_minutes <= 30;
        const matchesPrice = !priceTier || r.price_tier === priceTier;

        return (
          matchesSearch &&
          matchesLocation &&
          matchesDeals &&
          matchesTime &&
          matchesPrice
        );
      })
      .sort((a, b) => {
        if (sortBy === "fastest") return a.delivery_minutes - b.delivery_minutes;
        if (sortBy === "rating") return b.rating - a.rating;
        return 0;
      });
  }, [
    restaurants,
    searchQuery,
    location,
    onlyDeals,
    under30Min,
    priceTier,
    sortBy,
  ]);

  const hasActiveFilters =
    onlyDeals ||
    under30Min ||
    priceTier !== null ||
    searchQuery !== "" ||
    location !== "";

  const clearFilters = () => {
    setOnlyDeals(false);
    setUnder30Min(false);
    setPriceTier(null);
    setSearchQuery("");
    setLocation("");
    setSortBy("recommended");
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-clip flex flex-col bg-[#0F1115]">
      {/* Sticky Mobile-Responsive Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
            <img
              src="/logo.png"
              alt="The SP Food"
              className="w-9 h-9 rounded-full object-cover border border-[#FF5A1F]/40 shrink-0"
            />
            <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
              The SP <span className="text-[#FF5A1F]">Food</span>
            </span>
          </Link>

          {/* Desktop Faisalabad Area Autofill */}
          <div className="hidden md:block relative flex-1 max-w-md mx-2">
            <div className="flex items-center bg-[#181B20] border border-white/10 rounded-full px-3.5 py-1.5 focus-within:border-[#FF5A1F]">
              <MapPin className="w-4 h-4 text-[#FF5A1F] shrink-0 mr-2" />
              <input
                type="text"
                value={location}
                onFocus={() => setShowAreaDropdown(true)}
                onBlur={() => setTimeout(() => setShowAreaDropdown(false), 150)}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Select Faisalabad area (e.g. D Ground)..."
                className="bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none w-full"
              />
              {location && (
                <button
                  onClick={() => setLocation("")}
                  className="text-zinc-400 hover:text-white ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showAreaDropdown && (
              <div className="absolute top-11 left-0 right-0 bg-[#181B20] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-white/5">
                  Faisalabad Delivery Zones
                </div>
                {matchingAreas.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-zinc-400">
                    Sorry, we don&apos;t deliver to that area yet.
                  </div>
                ) : (
                  matchingAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onMouseDown={() => {
                        setLocation(area);
                        setShowAreaDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-[#FF5A1F]/15 hover:text-[#FF5A1F] flex items-center gap-2 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {area}, Faisalabad
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Action Buttons (Compact on Mobile so nothing clips) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/orders"
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-zinc-200 text-xs sm:text-sm font-medium p-2 sm:px-3 sm:py-2 rounded-full transition-colors"
              title="My Orders"
            >
              <Receipt className="w-4 h-4 text-[#FF5A1F]" />
              <span className="hidden lg:inline">Orders</span>
            </Link>

            {userEmail ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 hover:border-[#F5C542]/50 text-white text-xs sm:text-sm font-medium p-1.5 sm:px-3 sm:py-1.5 rounded-full transition-colors"
                  title="Profile & Daily Spin"
                >
                  <GenderAvatar name={userName} />
                  <span className="hidden sm:inline max-w-[80px] truncate capitalize">
                    {userName.split(" ")[0]}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="hidden sm:flex items-center gap-1.5 bg-[#181B20] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-400 text-xs sm:text-sm font-medium px-3 py-2 rounded-full transition-colors"
                  title={`Sign out (${userEmail})`}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-zinc-200 text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-2 rounded-full transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#FF5A1F]" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}

            <Link
              href="/cart"
              className="flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-full transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="bg-[#0F1115] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8 w-full flex-1">
        {/* Hero Section */}
        <section className="mb-5">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-snug">
            Faisalabad&apos;s finest,{" "}
            <span className="text-[#FF5A1F]">delivered fast.</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-base mt-1">
            Order fresh meals from top local kitchens in your area.
          </p>

          {/* Daily Spin & Win Banner (Home Screen Only) */}
          <Link
            href={userEmail ? "/profile" : "/login"}
            className="mt-4 flex items-center justify-between gap-3 bg-gradient-to-r from-[#1C1917] via-[#181B20] to-[#181B20] border border-[#F5C542]/30 hover:border-[#F5C542] rounded-2xl px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-[#F5C542]/15 text-[#F5C542] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {userEmail
                    ? "Daily Spin & Win is Ready!"
                    : "Sign in to Spin & Win Free Food Points"}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Win up to Rs. 50 off every 24 hours
                </p>
              </div>
            </div>
            <span className="bg-[#F5C542] text-[#0F1115] text-[11px] sm:text-xs font-extrabold px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Spin
            </span>
          </Link>

          {/* Mobile Area Autofill */}
          <div className="mt-3 md:hidden relative">
            <div className="flex items-center bg-[#181B20] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#FF5A1F]">
              <MapPin className="w-4 h-4 text-[#FF5A1F] shrink-0 mr-2.5" />
              <input
                type="text"
                value={location}
                onFocus={() => setShowAreaDropdown(true)}
                onBlur={() => setTimeout(() => setShowAreaDropdown(false), 150)}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Select Faisalabad area (e.g. D Ground)..."
                className="bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none w-full min-w-0"
              />
            </div>
            {showAreaDropdown && (
              <div className="absolute top-12 left-0 right-0 bg-[#181B20] border border-white/10 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-50">
                {matchingAreas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onMouseDown={() => {
                      setLocation(area);
                      setShowAreaDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-[#FF5A1F]/15 hover:text-[#FF5A1F] flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    {area}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="mt-3 sm:mt-4 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants, burgers, pizza, biryani..."
              className="w-full bg-[#181B20] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#FF5A1F] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Filter Bar (Scrollbar Hidden on Mobile) */}
        <section className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5 bg-[#181B20] border border-white/10 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-200 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5A1F]" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recommended" | "fastest" | "rating")
              }
              className="bg-transparent outline-none cursor-pointer text-zinc-200"
            >
              <option value="recommended" className="bg-[#181B20]">
                Recommended
              </option>
              <option value="fastest" className="bg-[#181B20]">
                Fastest Delivery
              </option>
              <option value="rating" className="bg-[#181B20]">
                Highest Rated
              </option>
            </select>
          </div>

          <button
            onClick={() => setOnlyDeals(!onlyDeals)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors shrink-0 ${
              onlyDeals
                ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                : "bg-[#181B20] border-white/10 text-zinc-300 hover:border-white/25"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Offers &amp; Deals
          </button>

          <button
            onClick={() => setUnder30Min(!under30Min)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors shrink-0 ${
              under30Min
                ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                : "bg-[#181B20] border-white/10 text-zinc-300 hover:border-white/25"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Under 30 min
          </button>

          {[
            { tier: 1, label: "Budget (Rs.)" },
            { tier: 2, label: "Mid (Rs.Rs.)" },
            { tier: 3, label: "Premium" },
          ].map(({ tier, label }) => (
            <button
              key={tier}
              onClick={() => setPriceTier(priceTier === tier ? null : tier)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors shrink-0 ${
                priceTier === tier
                  ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                  : "bg-[#181B20] border-white/10 text-zinc-300 hover:border-white/25"
              }`}
            >
              {label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-white underline px-2 shrink-0"
            >
              Reset
            </button>
          )}
        </section>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            {location ? `Restaurants in ${location}` : "Nearby Restaurants"}
          </h2>
          <span className="text-xs text-zinc-400">
            {filteredRestaurants.length} available
          </span>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-10 text-center">
            <p className="text-zinc-300 font-medium">
              No restaurants match your filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-[#FF5A1F] hover:underline font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredRestaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.slug}`}
                className="group bg-[#181B20] border border-white/10 hover:border-[#FF5A1F]/50 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col"
              >
                <div className="relative h-44 sm:h-48 w-full bg-zinc-900 overflow-hidden">
                  {restaurant.image_url && (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {restaurant.discount_percent > 0 && (
                    <span className="absolute top-3 left-3 bg-[#FF5A1F] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                      {restaurant.discount_percent}% OFF
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 bg-[#0F1115]/90 backdrop-blur-sm text-zinc-100 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                    <Clock className="w-3 h-3 text-[#FF5A1F]" />
                    {restaurant.delivery_time}
                  </span>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-base text-white truncate group-hover:text-[#FF5A1F] transition-colors">
                      {restaurant.name}
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {restaurant.rating}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 flex-1">
                    {restaurant.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mt-4 pt-3 border-t border-white/10">
                    <span className="truncate">{restaurant.cuisine}</span>
                    <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                      <MapPin className="w-3 h-3 text-[#FF5A1F]" />
                      {restaurant.area}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Professional Footer */}
      <footer className="mt-12 border-t border-white/10 bg-[#14171D]">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="The SP Food"
                className="w-8 h-8 rounded-full object-cover border border-[#FF5A1F]/40 shrink-0"
              />
              <span className="font-bold text-base text-white">
                The SP <span className="text-[#FF5A1F]">Food</span>
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Faisalabad&apos;s hyper-local food delivery platform connecting D
              Ground, Kohinoor, People&apos;s Colony 1 &amp; 2, Satiana Road,
              and Madina Town with top kitchens.
            </p>
          </div>

          {/* Support & Help */}
          <div className="space-y-2.5">
            <h3 className="text-white font-semibold uppercase tracking-wider text-[11px]">
              Customer Care
            </h3>
            <ul className="space-y-2 text-zinc-400">
              <li>
                <Link
                  href="/orders"
                  className="hover:text-[#FF5A1F] transition-colors"
                >
                  Track My Order
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/923001234567?text=Salam%20SP%20Food%20Support%2C%20I%20need%20help%20with%20an%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF5A1F] transition-colors"
                >
                  File a Complaint / Late Delivery
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/923001234567?text=Salam%2C%20I%20want%20to%20share%20feedback%20for%20The%20SP%20Food."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF5A1F] transition-colors"
                >
                  Feedback &amp; Reviews
                </a>
              </li>
            </ul>
          </div>

          {/* Partner & Careers */}
          <div className="space-y-2.5">
            <h3 className="text-white font-semibold uppercase tracking-wider text-[11px]">
              Partner With Us
            </h3>
            <ul className="space-y-2 text-zinc-400">
              <li>
                <Link
                  href="/partner"
                  className="hover:text-[#FF5A1F] transition-colors"
                >
                  List Your Restaurant
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/923001234567?text=Salam%2C%20I%20want%20to%20join%20The%20SP%20Food%20as%20a%20delivery%20rider."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF5A1F] transition-colors"
                >
                  Become a Rider (Careers)
                </a>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="hover:text-[#FF5A1F] transition-colors"
                >
                  Restaurant Kitchen Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-2.5">
            <h3 className="text-white font-semibold uppercase tracking-wider text-[11px]">
              Contact (Faisalabad)
            </h3>
            <ul className="space-y-2 text-zinc-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0 mt-0.5" />
                <span>
                  D Ground &amp; People&apos;s Colony No. 1, Faisalabad
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                <a href="tel:+923001234567" className="hover:text-white">
                  +92 300 1234567
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Daily: 12:00 PM – 2:00 AM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 py-4 text-center text-[11px] text-zinc-500">
          © {new Date().getFullYear()} The SP Food (thespstore.com) • All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}