"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Coins,
  Gift,
  Sparkles,
  CheckCircle2,
  LogOut,
  Crown,
  ChevronDown,
  ChevronUp,
  UserCog,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FAISALABAD_AREAS } from "@/data/areas";

// 6 slices (60° each) — Luxury Obsidian, Gold & Ember palette with strict high-contrast text
const WHEEL_SLICES = [
  { label: "Try Again", points: 0, weight: 35, bg: "#14171D", text: "#FACC15" }, // Obsidian + Gold text
  { label: "Rs. 5", points: 5, weight: 30, bg: "#F5C542", text: "#0F1115" },     // Luxury Gold + Black text
  { label: "Try Again", points: 0, weight: 20, bg: "#1E232C", text: "#FFFFFF" }, // Charcoal + White text
  { label: "Rs. 10", points: 10, weight: 10, bg: "#FF5A1F", text: "#FFFFFF" },   // Ember Orange + White text
  { label: "Rs. 25", points: 25, weight: 4, bg: "#FEF3C7", text: "#0F1115" },    // Champagne Cream + Black text
  { label: "Rs. 50", points: 50, weight: 1, bg: "#10B981", text: "#052E16" },    // Emerald + Deep Dark text
];

function pickWeightedIndex() {
  const totalWeight = WHEEL_SLICES.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < WHEEL_SLICES.length; i++) {
    rand -= WHEEL_SLICES[i].weight;
    if (rand <= 0) return i;
  }
  return 0;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showContactMobile, setShowContactMobile] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultArea, setDefaultArea] = useState("D Ground");
  const [defaultAddress, setDefaultAddress] = useState("");
  const [points, setPoints] = useState(0);
  const [lastSpinAt, setLastSpinAt] = useState<string | null>(null);

  // Wheel animation state
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || user.user_metadata?.full_name || "");
        setPhone(profile.phone || "");
        setDefaultArea(profile.default_area || "D Ground");
        setDefaultAddress(profile.default_address || "");
        setPoints(profile.points || 0);
        setLastSpinAt(profile.last_spin_at || null);
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSavedMsg("");

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        default_area: defaultArea,
        default_address: defaultAddress,
      })
      .eq("id", userId);

    setSaving(false);
    setSavedMsg("Profile saved!");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const canSpinToday = () => {
    if (!lastSpinAt) return true;
    const hoursPassed =
      (Date.now() - new Date(lastSpinAt).getTime()) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  };

  const handleSpin = () => {
    if (!userId || spinning || !canSpinToday()) return;

    setSpinning(true);
    setSpinResult(null);

    const winningIndex = pickWeightedIndex();
    const picked = WHEEL_SLICES[winningIndex];
    const sliceAngle = 360 / WHEEL_SLICES.length; // 60deg

    const sliceCenter = winningIndex * sliceAngle + sliceAngle / 2;
    const extraSpins = 5 * 360;
    const targetRotation =
      rotation + extraSpins + (360 - sliceCenter - (rotation % 360));

    setRotation(targetRotation);

    setTimeout(async () => {
      const newPoints = points + picked.points;
      const nowIso = new Date().toISOString();

      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({
          points: newPoints,
          last_spin_at: nowIso,
        })
        .eq("id", userId);

      setPoints(newPoints);
      setLastSpinAt(nowIso);
      setSpinning(false);
      setSpinResult(
        picked.points > 0
          ? `You won ${picked.points} SP Points (Rs. ${picked.points} off)!`
          : "Try Again tomorrow! Come back in 24 hours."
      );
    }, 4100);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen max-w-6xl mx-auto p-6 text-zinc-400">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6 pb-16">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="bg-[#181B20] border border-white/10 p-2.5 rounded-full text-white hover:border-[#F5C542] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                My Profile
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30">
                <Crown className="w-3 h-3" /> SP Member
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{email}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 bg-[#181B20] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-zinc-300 hover:text-red-400 px-4 py-2.5 rounded-full transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </header>

      {/* Luxury SP Points Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#181B20] via-[#1C1917] to-[#181B20] border border-[#F5C542]/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F5C542] flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            SP Reward Points Balance
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {points}
            </span>
            <span className="text-sm font-semibold text-[#F5C542]">pts</span>
          </div>
          <p className="text-xs text-zinc-300">
            Worth <span className="text-emerald-400 font-semibold">Rs. {points}</span>{" "}
            • Redeemable at Checkout on orders over Rs. 800
          </p>
        </div>

        <Link
          href="/cart"
          className="inline-flex items-center justify-center bg-gradient-to-r from-[#FF5A1F] to-[#F59E0B] hover:opacity-95 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-full shadow-lg shadow-[#FF5A1F]/20 shrink-0 transition-opacity"
        >
          Redeem at Checkout
        </Link>
      </section>

      {/* Mobile-Only Toggle Button for Contact Details */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowContactMobile(!showContactMobile)}
          className="w-full flex items-center justify-between bg-[#181B20] border border-[#F5C542]/30 hover:border-[#F5C542] rounded-2xl px-5 py-3.5 text-sm font-semibold text-white transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <UserCog className="w-4 h-4 text-[#F5C542]" />
            Contact &amp; Delivery Details
          </span>
          {showContactMobile ? (
            <ChevronUp className="w-4 h-4 text-[#F5C542]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>

      {/* Main 2-Column Layout: Left = Contact Details (collapsible on mobile), Right = Luxury Spinner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDE: Account & Delivery Info */}
        <form
          onSubmit={handleSaveProfile}
          className={`${
            showContactMobile ? "block" : "hidden"
          } lg:block lg:col-span-7 bg-[#181B20] border border-white/10 rounded-2xl p-6 space-y-5 shadow-xl`}
        >
          <div className="border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white">
              Account &amp; Delivery Details
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Saved details auto-fill at Checkout for faster ordering.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#F5C542] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#F5C542] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#F5C542] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#F5C542] transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                disabled
                type="email"
                value={email}
                className="w-full bg-[#0F1115]/60 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Default Faisalabad Area
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#FF5A1F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={defaultArea}
                onChange={(e) => setDefaultArea(e.target.value)}
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#F5C542] transition-colors"
              >
                {FAISALABAD_AREAS.map((a) => (
                  <option key={a} value={a} className="bg-[#181B20]">
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Default Street Address
            </label>
            <input
              type="text"
              value={defaultAddress}
              onChange={(e) => setDefaultAddress(e.target.value)}
              placeholder="House 14, Street 3, near Main Park"
              className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#F5C542] transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-md shadow-[#FF5A1F]/20 transition-colors"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>

            {savedMsg && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {savedMsg}
              </span>
            )}
          </div>
        </form>

        {/* RIGHT SIDE: Luxury Daily Spin & Win */}
        <section className="lg:col-span-5 bg-gradient-to-b from-[#1A1D24] to-[#14171D] border border-[#F5C542]/25 rounded-2xl p-6 space-y-6 text-center shadow-2xl">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5C542] bg-[#F5C542]/10 border border-[#F5C542]/20 px-3 py-1 rounded-full mb-2">
              <Gift className="w-3.5 h-3.5" />
              Daily Rewards
            </span>
            <h2 className="text-xl font-extrabold text-white">
              Spin &amp; Win SP Points
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Spin once every 24 hours to win instant food discounts.
            </p>
          </div>

          {/* Wheel + Luxury Gold Rim & High-Contrast Labels */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto">
            {/* Fixed Top Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[13px] border-l-transparent border-r-[13px] border-r-transparent border-t-[24px] border-t-[#F5C542] drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]" />
            </div>

            {/* Outer Luxury Gold Ring */}
            <div className="w-full h-full rounded-full p-1.5 bg-gradient-to-tr from-[#B45309] via-[#F5C542] to-[#FEF08A] shadow-[0_0_35px_rgba(245,197,66,0.2)]">
              {/* Rotating Wheel */}
              <div
                className="w-full h-full rounded-full overflow-hidden relative border-2 border-[#0F1115]"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                    : "none",
                  background: `conic-gradient(
                    ${WHEEL_SLICES.map(
                      (s, i) => `${s.bg} ${i * 60}deg ${(i + 1) * 60}deg`
                    ).join(", ")}
                  )`,
                }}
              >
                {WHEEL_SLICES.map((slice, i) => {
                  const angle = i * 60 + 30;
                  return (
                    <div
                      key={i}
                      className="absolute inset-0 flex justify-center pt-6 sm:pt-7"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <span
                        className="text-[11px] sm:text-xs font-black tracking-wide uppercase select-none"
                        style={{ color: slice.text }}
                      >
                        {slice.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center Luxury Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[#0F1115] border-4 border-[#F5C542] flex items-center justify-center z-20 shadow-xl">
              <span className="text-xs font-black tracking-wider text-[#F5C542]">
                SP
              </span>
            </div>
          </div>

          {spinResult && (
            <div className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-semibold rounded-xl px-4 py-3">
              {spinResult}
            </div>
          )}

          <button
            onClick={handleSpin}
            disabled={spinning || !canSpinToday()}
            className="w-full bg-gradient-to-r from-[#F5C542] to-[#FF5A1F] hover:opacity-95 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-[#0F1115] font-extrabold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            {spinning
              ? "Spinning..."
              : canSpinToday()
              ? "Spin the Wheel"
              : "Already Spun Today (Come back in 24h)"}
          </button>
        </section>
      </div>
    </div>
  );
}