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
  User,
  Heart,
  Bike,
  Store,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { FAISALABAD_AREAS } from "@/data/areas";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types";

const CUISINE_CARDS = [
  {
    label: "Burgers & Fast Food",
    keyword: "Burger",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Desi & Karahi",
    keyword: "Desi",
    image:
      "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Pizza",
    keyword: "Pizza",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Biryani & Pulao",
    keyword: "Biryani",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "BBQ & Tikka",
    keyword: "BBQ",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Chai & Paratha",
    keyword: "Chai",
    image:
      "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=400&q=80",
  },
];

export default function RestaurantExplorer({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const router = useRouter();
  const { totalItems } = useCart();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [location, setLocation] = useState("");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [under30Min, setUnder30Min] = useState(false);
  const [priceTier, setPriceTier] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"recommended" | "fastest" | "rating">(
    "recommended"
  );

  useEffect(() => {
    const savedFavs = localStorage.getItem("sp_food_favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch {
        // ignore invalid json
      }
    }

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
        .select("full_name, area")
        .eq("id", user.id)
        .single();

      const resolvedName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Foodie";

      setUserName(resolvedName);
      if (profile?.area) {
        setLocation((prev) => prev || profile.area);
      }
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

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      localStorage.setItem("sp_food_favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserName("");
    setDrawerOpen(false);
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
        const cui = selectedCuisine.toLowerCase().trim();

        const matchesSearch =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q));

        const matchesCuisine =
          !cui ||
          r.cuisine.toLowerCase().includes(cui) ||
          r.name.toLowerCase().includes(cui);

        const matchesLocation =
          !loc || r.area.toLowerCase().includes(loc.split(" ")[0]);

        const matchesDeals = !onlyDeals || r.discount_percent > 0;
        const matchesTime = !under30Min || r.delivery_minutes <= 30;
        const matchesPrice = !priceTier || r.price_tier === priceTier;

        return (
          matchesSearch &&
          matchesCuisine &&
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
    selectedCuisine,
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
    selectedCuisine !== "" ||
    location !== "";

  const clearFilters = () => {
    setOnlyDeals(false);
    setUnder30Min(false);
    setPriceTier(null);
    setSearchQuery("");
    setSelectedCuisine("");
    setLocation("");
    setSortBy("recommended");
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-clip flex flex-col bg-[#1C2029] text-white tracking-[0.015em] antialiased">
      {/* Slide-out Account & Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-[#242934] border-r border-white/15 h-full p-5 flex flex-col justify-between z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png?v=3"
                    alt="The SP Food"
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#FFD43B]"
                  />
                  <div>
                    <p className="font-semibold text-sm text-white tracking-wide">
                      {userName || "Welcome Foodie"}
                    </p>
                    <p className="text-xs font-medium text-[#FFD43B] tracking-wide mt-0.5">
                      {userEmail || "Faisalabad Delivery"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1.5 text-sm font-medium tracking-wide">
                <Link
                  href="/orders"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 text-white"
                >
                  <span className="flex items-center gap-3">
                    <Receipt className="w-4 h-4 text-[#FF8A50]" />
                    Orders &amp; Reordering
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </Link>

                <Link
                  href={userEmail ? "/profile" : "/login"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 text-white"
                >
                  <span className="flex items-center gap-3">
                    <User className="w-4 h-4 text-[#FFD43B]" />
                    My Profile &amp; Address
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </Link>

                <Link
                  href={userEmail ? "/profile" : "/login"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 text-[#FFD43B]"
                >
                  <span className="flex items-center gap-3">
                    <Gift className="w-4 h-4 text-[#FFD43B]" />
                    SP Daily Spin Rewards
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#FFD43B]" />
                </Link>

                <Link
                  href="/partner"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 text-white"
                >
                  <span className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-[#FF8A50]" />
                    Partner With Us (Restaurants)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </Link>

                <a
                  href="https://wa.me/923001234567?text=Salam%20SP%20Food%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 text-white"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    Help Center (WhatsApp)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </a>
              </nav>
            </div>

            <div className="border-t border-white/15 pt-4">
              {userEmail ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 font-semibold tracking-wide text-sm py-3 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF6B2B] hover:bg-[#ff5714] text-white font-semibold tracking-wide text-sm py-3 rounded-xl"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In / Register
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Top App Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#242934]/95 backdrop-blur-md border-b border-white/15 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          {/* Left Profile / Menu Trigger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-[#2E3442] hover:bg-white/15 border border-white/15 text-white p-2 sm:px-3.5 sm:py-2 rounded-full transition-colors shrink-0"
            title="Account & Menu"
          >
            <User className="w-5 h-5 text-[#FFD43B]" />
            <span className="hidden sm:inline text-xs font-semibold tracking-wide text-white">
              {userName ? userName.split(" ")[0] : "Account"}
            </span>
          </button>

          {/* Center Brand Logo (Larger Emblem + Yellow Title) */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/logo.png?v=3"
              alt="The SP Food"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#FFD43B] shadow-sm shrink-0"
            />
            <div className="leading-tight">
              <span className="font-bold text-base sm:text-xl tracking-wide text-[#FFD43B] block">
                The SP Food
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-white block">
                Signature Plates
              </span>
            </div>
          </Link>

          {/* Right Orders + Cart */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/orders"
              className="hidden md:flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/15 text-white text-xs font-semibold tracking-wide px-3.5 py-2 rounded-full"
            >
              <Receipt className="w-4 h-4 text-[#FFD43B]" />
              <span>Orders</span>
            </Link>

            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 bg-[#FF6B2B] hover:bg-[#ff5714] text-white text-xs sm:text-sm font-semibold tracking-wide px-3.5 py-2 rounded-full shadow-lg shadow-[#FF6B2B]/25 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="bg-[#FFD43B] text-[#1C2029] text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Location Selector Bar */}
        <div className="bg-[#242934] border-t border-white/15 py-2.5 px-3 sm:px-4">
          <div className="max-w-3xl mx-auto relative">
            <div className="flex items-center justify-between bg-[#2E3442] border border-white/20 focus-within:border-[#FFD43B] rounded-full px-4 py-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-[#FF8A50] shrink-0" />
                <input
                  type="text"
                  value={location}
                  onFocus={() => setShowAreaDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowAreaDropdown(false), 160)
                  }
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Select Faisalabad Zone (e.g. D Ground, Kohinoor, Madina Town)..."
                  className="bg-transparent text-xs sm:text-sm font-medium tracking-wide text-white placeholder:text-slate-200 outline-none w-full truncate"
                />
              </div>
              {location ? (
                <button
                  onClick={() => setLocation("")}
                  className="text-[#FFD43B] hover:text-white ml-2 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[11px] font-semibold tracking-wider text-[#FFD43B] shrink-0 ml-2">
                  Faisalabad
                </span>
              )}
            </div>

            {showAreaDropdown && (
              <div className="absolute top-12 left-0 right-0 bg-[#242934] border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#FFD43B] border-b border-white/15">
                  Active Delivery Zones in Faisalabad
                </div>
                {matchingAreas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onMouseDown={() => {
                      setLocation(area);
                      setShowAreaDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-normal tracking-wide text-white hover:bg-[#FF6B2B]/20 hover:text-[#FFD43B] flex items-center gap-2.5 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-[#FF8A50]" />
                    {area}, Faisalabad
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Storefront Feed */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-7 w-full flex-1 space-y-7">
        {/* Delivery Pill + Search Input */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="inline-flex items-center gap-2 border-b-2 border-[#FF6B2B] pb-2 px-1 self-start sm:self-center shrink-0">
            <Bike className="w-5 h-5 text-[#FFD43B]" />
            <span className="font-semibold tracking-wide text-sm text-white">
              Delivery
            </span>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#FFD43B] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants, burgers, karahi, pizza..."
              className="w-full bg-[#242934] border border-white/20 rounded-full pl-11 pr-10 py-3 text-sm font-normal tracking-wide text-white placeholder:text-slate-200 outline-none focus:border-[#FFD43B] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Your Daily Deals */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold tracking-wide text-white">
            Your daily deals
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Deal Card 1: Daily Spin & Win */}
            <Link
              href={userEmail ? "/profile" : "/login"}
              className="bg-gradient-to-r from-[#FF6B2B] to-[#E85316] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-lg hover:opacity-95 transition-opacity"
            >
              <div className="space-y-1.5">
                <span className="inline-block bg-white text-[#1C2029] text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  Daily Reward
                </span>
                <h3 className="text-lg sm:text-xl font-bold tracking-wide text-white leading-snug">
                  Win up to Rs. 50 OFF
                </h3>
                <p className="text-xs font-semibold tracking-wide text-[#FFD43B]">
                  Spin the SP Wheel free every 24 hrs
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Gift className="w-7 h-7 text-[#FFD43B]" />
              </div>
            </Link>

            {/* Deal Card 2: Filter Active Discounts */}
            <button
              type="button"
              onClick={() => setOnlyDeals((prev) => !prev)}
              className="text-left bg-[#242934] border border-[#FFD43B]/60 hover:border-[#FFD43B] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-lg transition-colors"
            >
              <div className="space-y-1.5">
                <span className="inline-block bg-[#FFD43B] text-[#1C2029] text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  {onlyDeals ? "Showing Deals ✓" : "Tap to Filter"}
                </span>
                <h3 className="text-lg sm:text-xl font-bold tracking-wide text-white leading-snug">
                  Flat Discounts &amp; Combos
                </h3>
                <p className="text-xs font-semibold tracking-wide text-[#FF8A50]">
                  + Free delivery on selected Faisalabad kitchens
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFD43B]/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-[#FFD43B]" />
              </div>
            </button>
          </div>
        </section>

        {/* Cuisines For You */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold tracking-wide text-white">
              Cuisines for you
            </h2>
            {selectedCuisine && (
              <button
                onClick={() => setSelectedCuisine("")}
                className="text-xs font-semibold tracking-wide text-[#FFD43B] hover:underline"
              >
                Show All
              </button>
            )}
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CUISINE_CARDS.map((item) => {
              const active = selectedCuisine === item.keyword;
              return (
                <button
                  key={item.keyword}
                  type="button"
                  onClick={() =>
                    setSelectedCuisine(active ? "" : item.keyword)
                  }
                  className="flex flex-col items-center gap-2 shrink-0 group"
                >
                  <div
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border transition-all ${
                      active
                        ? "border-[#FFD43B] ring-2 ring-[#FFD43B]/40 scale-105"
                        : "border-white/20 group-hover:border-[#FFD43B]"
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.label}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className={`text-xs font-medium tracking-wide text-center max-w-[105px] leading-snug ${
                      active ? "text-[#FFD43B] font-semibold" : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick Filter Chips */}
        <section className="flex items-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5 bg-[#242934] border border-white/20 rounded-full px-3.5 py-2 text-xs font-medium tracking-wide text-white shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FFD43B]" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recommended" | "fastest" | "rating")
              }
              className="bg-transparent outline-none cursor-pointer text-white font-medium tracking-wide"
            >
              <option value="recommended" className="bg-[#242934]">
                Recommended
              </option>
              <option value="fastest" className="bg-[#242934]">
                Fastest Delivery
              </option>
              <option value="rating" className="bg-[#242934]">
                Top Rated
              </option>
            </select>
          </div>

          <button
            onClick={() => setOnlyDeals(!onlyDeals)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium tracking-wide border transition-colors shrink-0 ${
              onlyDeals
                ? "bg-[#FF6B2B] border-[#FF6B2B] text-white"
                : "bg-[#242934] border-white/20 text-white hover:border-[#FFD43B]"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-[#FFD43B]" />
            Offers &amp; Deals
          </button>

          <button
            onClick={() => setUnder30Min(!under30Min)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium tracking-wide border transition-colors shrink-0 ${
              under30Min
                ? "bg-[#FF6B2B] border-[#FF6B2B] text-white"
                : "bg-[#242934] border-white/20 text-white hover:border-[#FFD43B]"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#FFD43B]" />
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
              className={`rounded-full px-4 py-2 text-xs font-medium tracking-wide border transition-colors shrink-0 ${
                priceTier === tier
                  ? "bg-[#FF6B2B] border-[#FF6B2B] text-white"
                  : "bg-[#242934] border-white/20 text-white hover:border-[#FFD43B]"
              }`}
            >
              {label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold tracking-wide text-[#FFD43B] hover:underline px-2 shrink-0"
            >
              Reset All
            </button>
          )}
        </section>

        {/* Restaurant Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold tracking-wide text-white">
              {location
                ? `Restaurants in ${location}`
                : "All Faisalabad Restaurants"}
            </h2>
            <span className="text-xs font-semibold tracking-wider text-[#FFD43B]">
              {filteredRestaurants.length} kitchens
            </span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="bg-[#242934] border border-white/20 rounded-2xl p-10 text-center space-y-3">
              <p className="text-white font-medium tracking-wide text-base">
                No kitchens match your current filter.
              </p>
              <button
                onClick={clearFilters}
                className="bg-[#FF6B2B] text-white text-xs font-semibold tracking-wider px-5 py-2.5 rounded-full"
              >
                Show All Restaurants
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRestaurants.map((restaurant) => {
                const isFav = favorites.includes(restaurant.id);
                return (
                  <Link
                    key={restaurant.id}
                    href={`/restaurants/${restaurant.slug}`}
                    className="group bg-[#242934] border border-white/15 hover:border-[#FFD43B] rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col"
                  >
                    {/* Large Food Photo Card */}
                    <div className="relative h-48 w-full bg-[#2E3442] overflow-hidden">
                      {restaurant.image_url && (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Top Right Favorite Heart Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, restaurant.id)}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-[#1C2029] flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                        title="Save favorite"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFav
                              ? "fill-[#FF6B2B] text-[#FF6B2B]"
                              : "text-[#1C2029]"
                          }`}
                        />
                      </button>

                      {/* Top Left Discount Pill */}
                      {restaurant.discount_percent > 0 && (
                        <span className="absolute top-3 left-3 bg-[#FF6B2B] text-white text-xs font-semibold tracking-wider px-3 py-1 rounded-full shadow-md">
                          {restaurant.discount_percent}% OFF
                        </span>
                      )}
                    </div>

                    {/* Card Metadata with High-Contrast Typography & Letter Spacing */}
                    <div className="p-4 flex flex-col flex-1 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base sm:text-lg tracking-wide text-white truncate group-hover:text-[#FFD43B] transition-colors">
                          {restaurant.name}
                        </h3>
                        <span className="flex items-center gap-1 text-xs font-bold tracking-wide text-[#FFD43B] shrink-0">
                          <Star className="w-4 h-4 fill-[#FFD43B] text-[#FFD43B]" />
                          {restaurant.rating}
                        </span>
                      </div>

                      <p className="text-xs font-medium tracking-wide text-slate-100 leading-relaxed">
                        From {restaurant.delivery_time} •{" "}
                        <span className="text-[#FFD43B] font-semibold">
                          {"Rs.".repeat(restaurant.price_tier || 1)}
                        </span>{" "}
                        • {restaurant.cuisine}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#FF8A50]">
                        <Bike className="w-3.5 h-3.5 shrink-0" />
                        <span>Free delivery on 1st order</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-100 pt-2.5 border-t border-white/15 mt-auto">
                        <span className="flex items-center gap-1.5 font-medium tracking-wide">
                          <MapPin className="w-3.5 h-3.5 text-[#FF8A50]" />
                          {restaurant.area}, Faisalabad
                        </span>
                        {restaurant.discount_percent > 0 && (
                          <span className="bg-[#FF6B2B]/25 text-[#FFD43B] font-semibold tracking-wider px-2.5 py-0.5 rounded-full text-[11px]">
                            Up to {restaurant.discount_percent}% off
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* High-Contrast Footer */}
      <footer className="mt-12 border-t border-white/15 bg-[#242934]">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs tracking-wide">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png?v=3"
                alt="The SP Food"
                className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD43B] shrink-0"
              />
              <span className="font-bold text-lg tracking-wide text-[#FFD43B]">
                The SP Food
              </span>
            </div>
            <p className="text-slate-100 font-normal leading-relaxed">
              Faisalabad&apos;s hyper-local food delivery platform serving D
              Ground, Kohinoor, People&apos;s Colony 1 &amp; 2, Satiana Road,
              and Madina Town.
            </p>
          </div>

          {/* Customer Care */}
          <div className="space-y-2.5">
            <h3 className="text-[#FFD43B] font-bold uppercase tracking-widest text-[11px]">
              Customer Care
            </h3>
            <ul className="space-y-2 text-white font-medium">
              <li>
                <Link href="/orders" className="hover:text-[#FFD43B]">
                  Track My Order
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/923001234567?text=Salam%20SP%20Food%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFD43B]"
                >
                  Help Center &amp; Complaints
                </a>
              </li>
              <li>
                <Link href="/profile" className="hover:text-[#FFD43B]">
                  SP Spin Rewards
                </Link>
              </li>
            </ul>
          </div>

          {/* Partner With Us */}
          <div className="space-y-2.5">
            <h3 className="text-[#FFD43B] font-bold uppercase tracking-widest text-[11px]">
              Partner With Us
            </h3>
            <ul className="space-y-2 text-white font-medium">
              <li>
                <Link href="/partner" className="hover:text-[#FFD43B]">
                  List Your Restaurant
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/923001234567?text=Salam%2C%20I%20want%20to%20join%20as%20a%20rider."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFD43B]"
                >
                  Become a Rider (Careers)
                </a>
              </li>
              <li>
                <Link href="/owner" className="hover:text-[#FFD43B]">
                  Restaurant Owner Studio
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-2.5">
            <h3 className="text-[#FFD43B] font-bold uppercase tracking-widest text-[11px]">
              Contact (Faisalabad)
            </h3>
            <ul className="space-y-2 text-white font-medium">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#FF8A50] shrink-0 mt-0.5" />
                <span>D Ground &amp; People&apos;s Colony No. 1, Faisalabad</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FFD43B] shrink-0" />
                <a href="tel:+923001234567" className="hover:text-[#FFD43B]">
                  +92 300 1234567
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Daily: 12:00 PM – 2:00 AM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 py-4 text-center text-xs font-medium tracking-wider text-slate-100">
          © {new Date().getFullYear()} The SP Food (thespfood.pk) • All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}