// app/partner/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Tag,
  Upload,
  CheckCircle2,
  Sparkles,
  Flame,
  ShieldCheck,
  MessageCircle,
  ChefHat,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FAISALABAD_AREAS } from "@/data/areas";

const CUISINE_OPTIONS = [
  "Burgers & Fast Food",
  "Desi & Karahi",
  "Pizza",
  "Biryani & Pulao",
  "BBQ & Tikka",
  "Chai & Paratha",
  "Chinese & Continental",
  "Desserts & Shakes",
];

async function compressImageFile(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxWidth = 900;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.82);
    };
    img.src = url;
  });
}

export default function PartnerApplicationPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [area, setArea] = useState("D Ground");
  const [cuisine, setCuisine] = useState("Burgers & Fast Food");
  const [deliveryTime, setDeliveryTime] = useState("25-35 min");
  const [discountInput, setDiscountInput] = useState("0");
  const [dealBanner, setDealBanner] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefillUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);
      if (user.email) setOwnerEmail(user.email);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setOwnerName(profile.full_name);
      if (profile?.phone) setOwnerPhone(profile.phone);
    };

    prefillUser();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const compressed = await compressImageFile(file);
      const supabase = createClient();
      const filePath = `partner-uploads/${Date.now()}-${file.name.replace(
        /\s+/g,
        "-"
      )}`;

      const { error: uploadErr } = await supabase.storage
        .from("food-images")
        .upload(filePath, compressed, { contentType: "image/jpeg" });

      if (uploadErr) {
        setError(`Photo upload failed: ${uploadErr.message}`);
      } else {
        const { data } = supabase.storage
          .from("food-images")
          .getPublicUrl(filePath);
        setImageUrl(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const parsedDiscount = Math.min(
      70,
      Math.max(0, Number.parseInt(discountInput, 10) || 0)
    );
    const cleanRestaurantName = restaurantName.trim();
    const cleanOwnerName = ownerName.trim();
    const cleanOwnerPhone = ownerPhone.trim();
    const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
    const cleanCuisine = cuisine.trim();
    const cleanDeliveryTime = deliveryTime.trim();
    const cleanDealBanner = dealBanner.trim() || null;
    const cleanDescription = description.trim() || null;
    const cleanImageUrl = imageUrl.trim() || null;

    const supabase = createClient();
    const { error: insertErr } = await supabase
      .from("partner_requests")
      .insert({
        user_id: userId,
        restaurant_name: cleanRestaurantName,
        owner_name: cleanOwnerName,
        owner_phone: cleanOwnerPhone,
        owner_email: cleanOwnerEmail,
        area,
        cuisine: cleanCuisine,
        delivery_time: cleanDeliveryTime,
        discount_percent: parsedDiscount,
        deal_banner: cleanDealBanner,
        description: cleanDescription,
        image_url: cleanImageUrl,
        status: "pending",
      });

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    // Trigger email notification Edge Function without blocking UI confirmation
    supabase.functions
      .invoke("notify-partner-application", {
        body: {
          record: {
            restaurant_name: cleanRestaurantName,
            owner_name: cleanOwnerName,
            owner_phone: cleanOwnerPhone,
            owner_email: cleanOwnerEmail,
            area,
            cuisine: cleanCuisine,
            delivery_time: cleanDeliveryTime,
            discount_percent: parsedDiscount,
            deal_banner: cleanDealBanner,
            description: cleanDescription,
            image_url: cleanImageUrl,
            status: "pending",
          },
        },
      })
      .catch(() => {
        // Ignore notification error so application confirmation still succeeds
      });

    setDiscountInput(String(parsedDiscount));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    const whatsappMessage = encodeURIComponent(
      `Salam The SP Food Team! New kitchen partner application:\n• Restaurant: ${restaurantName} (${area}, Faisalabad)\n• Owner: ${ownerName}\n• WhatsApp: ${ownerPhone}\n• Email: ${ownerEmail}`
    );

    return (
      <div className="min-h-screen bg-[#1C2029] text-white flex items-center justify-center px-4 py-12 tracking-[0.015em]">
        <div className="max-w-lg w-full bg-[#242934] border border-[#FFD43B]/40 rounded-2xl p-7 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <span className="inline-block bg-[#FFD43B] text-[#1C2029] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Application Submitted
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              Kitchen Application Received!
            </h1>
            <p className="text-sm text-slate-100 leading-relaxed">
              Thank you, <strong className="text-white">{ownerName}</strong>.
              Our Faisalabad onboarding team will verify{" "}
              <strong className="text-[#FFD43B]">{restaurantName}</strong> (
              {area}) and activate your Restaurant Kitchen Studio shortly.
            </p>
          </div>

          <div className="bg-[#2E3442] border border-white/15 rounded-xl p-4 text-left text-xs text-slate-100 space-y-2">
            <p>
              Owner Login Email:{" "}
              <span className="text-[#FFD43B] font-bold">{ownerEmail}</span>
            </p>
            <p className="leading-relaxed">
              Make sure you have registered an account with this exact email on{" "}
              <Link
                href="/login"
                className="text-[#FF8A50] font-semibold underline hover:text-[#FFD43B]"
              >
                Sign In / Register
              </Link>{" "}
              so you can access <strong className="text-white">/owner</strong>{" "}
              as soon as approved.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/923001234567?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-full transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Fast-Track on WhatsApp
            </a>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSubmitted(false);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2E3442] hover:bg-white/15 border border-[#FFD43B]/60 text-[#FFD43B] text-sm font-bold px-5 py-3 rounded-full transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              Edit Application
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B2B] hover:bg-[#ff5714] text-white text-sm font-bold px-6 py-3 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C2029] text-white pb-16 tracking-[0.015em] antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#242934]/95 backdrop-blur-md border-b border-white/15 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-[#2E3442] border border-white/20 p-2 rounded-full text-white hover:border-[#FFD43B] transition-colors shrink-0"
              title="Go Back to Storefront"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/logo.png?v=3"
                alt="The SP Food"
                className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD43B] shrink-0"
              />
              <div className="leading-tight">
                <span className="font-bold text-base sm:text-lg text-[#FFD43B] block">
                  The SP Food
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white block">
                  Partner Onboarding
                </span>
              </div>
            </Link>
          </div>

          <Link
            href="/owner"
            className="text-xs font-bold bg-[#2E3442] hover:bg-white/15 border border-[#FFD43B]/40 px-4 py-2 rounded-full text-[#FFD43B] transition-colors shrink-0"
          >
            Kitchen Portal
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-7 space-y-6">
        {/* Hero Pitch */}
        <section className="bg-[#242934] border border-[#FFD43B]/35 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#1C2029] bg-[#FFD43B] px-3 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5" /> Faisalabad Kitchen Partner Program
            </span>
            <span className="text-xs font-semibold text-emerald-300">
              Free Menu Setup &amp; Listing
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
            List Your Restaurant on{" "}
            <span className="text-[#FFD43B]">The SP Food</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed max-w-2xl">
            Receive direct online orders across{" "}
            <strong className="text-white">
              D Ground, Kohinoor, People&apos;s Colony 1 &amp; 2, Satiana Road,
              and Madina Town
            </strong>
            . Manage your live kitchen queue, menu items, and combo offers
            from your own Owner Studio.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-[#2E3442] border border-white/15 rounded-xl p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">
                  100% Menu Price Protection
                </p>
                <p className="text-[11px] text-slate-200 mt-0.5">
                  Zero deduction from your dish prices for SP Spin Rewards.
                </p>
              </div>
            </div>

            <div className="bg-[#2E3442] border border-white/15 rounded-xl p-3.5 flex items-start gap-2.5">
              <ChefHat className="w-5 h-5 text-[#FFD43B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">
                  Live Kitchen Dashboard
                </p>
                <p className="text-[11px] text-slate-200 mt-0.5">
                  Instant order alerts, item availability toggles &amp; deals.
                </p>
              </div>
            </div>

            <div className="bg-[#2E3442] border border-white/15 rounded-xl p-3.5 flex items-start gap-2.5">
              <TrendingUp className="w-5 h-5 text-[#FF8A50] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">
                  Local Rider Fleet
                </p>
                <p className="text-[11px] text-slate-200 mt-0.5">
                  Fast zone-based dispatch so food arrives hot.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#242934] border border-white/15 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl"
        >
          {/* Step 1: Owner Contact Info */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#FFD43B] border-b border-white/15 pb-2.5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FF6B2B] text-white text-xs font-extrabold inline-flex items-center justify-center">
                1
              </span>
              Owner / Manager Contact Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Owner Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#FFD43B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Bilal Ahmed"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#FFD43B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Login Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#FFD43B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="kitchen@example.com"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Kitchen & Storefront Details */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#FFD43B] border-b border-white/15 pb-2.5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FF6B2B] text-white text-xs font-extrabold inline-flex items-center justify-center">
                2
              </span>
              Kitchen &amp; Storefront Profile
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Restaurant Name *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-[#FF8A50] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Lyallpur Smash Burgers"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Faisalabad Zone *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#FF8A50] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
                  >
                    {FAISALABAD_AREAS.map((a) => (
                      <option key={a} value={a} className="bg-[#242934]">
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Primary Cuisine *
                </label>
                <input
                  required
                  list="sp-cuisine-list"
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Burgers, Pizza, Desi BBQ, Biryani"
                  className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                />
                <datalist id="sp-cuisine-list">
                  {CUISINE_OPTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Avg. Prep &amp; Delivery Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#FFD43B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="25-35 min"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Launch Discount (%)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-[#FF8A50] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={70}
                    step={1}
                    value={discountInput}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    onBlur={() => {
                      const cleaned = Math.min(
                        70,
                        Math.max(0, Number.parseInt(discountInput, 10) || 0)
                      );
                      setDiscountInput(String(cleaned));
                    }}
                    placeholder="0"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Special Opening Deal (Optional)
                </label>
                <input
                  type="text"
                  value={dealBanner}
                  onChange={(e) => setDealBanner(e.target.value)}
                  placeholder="e.g. Free 500ml drink on Rs. 1,000+"
                  className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                />
              </div>
            </div>

            {/* Cover Image Upload or URL */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white">
                Restaurant Cover Banner (Upload Photo or Paste URL)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#2E3442] hover:bg-white/15 border border-[#FFD43B]/50 text-xs font-bold text-[#FFD43B] px-4 py-2.5 rounded-xl shrink-0 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Compressing & Uploading..." : "Upload Cover Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste cover image URL..."
                  className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                />
              </div>
              {imageUrl && (
                <div className="h-36 w-full rounded-xl overflow-hidden border border-white/20 bg-[#1C2029]">
                  <img
                    src={imageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Kitchen Bio &amp; Signature Dishes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell Faisalabad foodies about your specialties, hygiene standards, and best-selling platters..."
                className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-400/40 text-red-200 text-xs font-semibold px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/15">
            <p className="text-xs text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FFD43B] shrink-0" />
              Applications are reviewed within 2 hours during operating hours.
            </p>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full sm:w-auto bg-[#FF6B2B] hover:bg-[#ff5714] disabled:opacity-50 text-white text-sm font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-[#FF6B2B]/25 transition-colors cursor-pointer"
            >
              {submitting
                ? "Submitting Application..."
                : "Submit Restaurant Application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}