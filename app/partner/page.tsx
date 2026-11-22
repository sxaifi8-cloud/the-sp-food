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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FAISALABAD_AREAS } from "@/data/areas";

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
  const [cuisine, setCuisine] = useState("Fast Food & Burgers");
  const [deliveryTime, setDeliveryTime] = useState("25-35 min");
  const [discountPercent, setDiscountPercent] = useState(10);
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

    const supabase = createClient();
    const { error: insertErr } = await supabase
      .from("partner_requests")
      .insert({
        user_id: userId,
        restaurant_name: restaurantName.trim(),
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        owner_email: ownerEmail.trim().toLowerCase(),
        area,
        cuisine: cuisine.trim(),
        delivery_time: deliveryTime.trim(),
        discount_percent: Number(discountPercent) || 0,
        deal_banner: dealBanner.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        status: "pending",
      });

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-white flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-[#181B20] border border-[#F5C542]/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-extrabold text-white">
            Kitchen Application Received!
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Thank you, <strong>{ownerName}</strong>. Our Faisalabad onboarding
            team will verify <strong>{restaurantName}</strong> ({area}) and
            activate your Restaurant Studio shortly.
          </p>
          <div className="bg-[#0F1115] border border-white/10 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
            <p>
              Owner Login Email:{" "}
              <span className="text-[#F5C542] font-semibold">{ownerEmail}</span>
            </p>
            <p>
              Make sure you have created an account with this email on{" "}
              <Link href="/login" className="text-[#FF5A1F] underline">
                Sign In / Register
              </Link>{" "}
              so you can manage your menu as soon as approved.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-sm font-bold px-6 py-3 rounded-full transition-colors"
            >
              Back to Storefront
            </Link>
            <Link
              href="/login"
              className="bg-[#0F1115] border border-white/10 text-zinc-200 text-sm font-semibold px-6 py-3 rounded-full hover:border-white/25 transition-colors"
            >
              Owner Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="The SP Food"
                className="w-8 h-8 rounded-full object-cover border border-[#FF5A1F]/40"
              />
              <span className="font-bold text-base sm:text-lg text-white">
                Partner With <span className="text-[#FF5A1F]">The SP Food</span>
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold bg-[#181B20] hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-full text-zinc-200"
          >
            Existing Owner Login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Pitch */}
        <section className="bg-gradient-to-r from-[#181B20] via-[#1C1917] to-[#181B20] border border-[#F5C542]/25 rounded-2xl p-6 space-y-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5C542] bg-[#F5C542]/10 border border-[#F5C542]/25 px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" /> Faisalabad Kitchen Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Grow Your Restaurant Orders Across Faisalabad
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            Reach hungry customers in D Ground, Kohinoor, People&apos;s Colony 1 &amp; 2,
            Satiana Road, and Madina Town. Control your own menu photos, delivery
            times, and daily combo deals from your Owner Studio.
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Zero deduction from your food prices for SP Spin Rewards
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#F5C542]" />
              Dedicated Rider Dispatch
            </span>
          </div>
        </section>

        {/* Application Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#181B20] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl"
        >
          {/* Owner Contact Info */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-2.5">
              1. Owner / Manager Contact Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Owner Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#F5C542] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Bilal Ahmed"
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#F5C542] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Login Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#F5C542] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="kitchen@example.com"
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kitchen & Storefront Details */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-2.5">
              2. Kitchen &amp; Storefront Profile
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Restaurant Name *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-[#FF5A1F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Lyallpur Smash Burgers"
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Faisalabad Zone *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#FF5A1F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
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
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Primary Cuisine *
                </label>
                <input
                  required
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Burgers, Pizza, Desi BBQ, Biryani"
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Avg. Prep &amp; Delivery Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="25-35 min"
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Launch Discount (%)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-[#FF5A1F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    max={70}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Special Opening Deal (Optional)
                </label>
                <input
                  type="text"
                  value={dealBanner}
                  onChange={(e) => setDealBanner(e.target.value)}
                  placeholder="e.g. Free 500ml drink on Rs. 1,000+"
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                />
              </div>
            </div>

            {/* Cover Image Upload or URL */}
            <div className="space-y-2">
              <label className="block text-xs text-zinc-300">
                Restaurant Cover Banner (Upload Photo or Paste URL)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 bg-[#0F1115] hover:bg-white/10 border border-white/15 text-xs font-semibold text-[#F5C542] px-4 py-2.5 rounded-xl shrink-0">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Cover Photo"}
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
                  placeholder="Or paste image URL..."
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F5C542]"
                />
              </div>
              {imageUrl && (
                <div className="h-32 w-full rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                  <img
                    src={imageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Kitchen Bio &amp; Signature Dishes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell Faisalabad foodies about your specialties, hygiene standards, and best-selling platters..."
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full sm:w-auto bg-gradient-to-r from-[#FF5A1F] to-[#F59E0B] hover:opacity-95 disabled:opacity-50 text-white text-sm font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-[#FF5A1F]/20 transition-opacity"
          >
            {submitting
              ? "Submitting Application..."
              : "Submit Restaurant Application"}
          </button>
        </form>
      </main>
    </div>
  );
}