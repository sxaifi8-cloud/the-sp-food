"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Clock,
  Tag,
  Sparkles,
  Upload,
  Save,
  CheckCircle2,
  UtensilsCrossed,
  Flame,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OwnerRestaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  area: string;
  description: string | null;
  image_url: string | null;
  delivery_time: string;
  delivery_minutes: number;
  discount_percent: number;
  deal_banner?: string | null;
  promo_tag?: string | null;
  is_open?: boolean | null;
}

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

export default function OwnerPortalPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "checking" | "authorized" | "unauthorized"
  >("checking");
  const [restaurant, setRestaurant] = useState<OwnerRestaurant | null>(null);

  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("25-35 min");
  const [deliveryMins, setDeliveryMins] = useState(30);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [dealBanner, setDealBanner] = useState("");
  const [promoTag, setPromoTag] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadOwnerStore = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("unauthorized");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner" && profile?.role !== "admin") {
      setStatus("unauthorized");
      return;
    }

    const { data: rest } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    const target = (rest as OwnerRestaurant | null) || null;
    if (!target && profile?.role !== "admin") {
      setStatus("unauthorized");
      return;
    }

    if (target) {
      setRestaurant(target);
      setName(target.name || "");
      setCuisine(target.cuisine || "");
      setDescription(target.description || "");
      setImageUrl(target.image_url || "");
      setDeliveryTime(target.delivery_time || "25-35 min");
      setDeliveryMins(target.delivery_minutes || 30);
      setDiscountPercent(target.discount_percent || 0);
      setDealBanner(target.deal_banner || "");
      setPromoTag(target.promo_tag || "");
      setIsOpen(target.is_open !== false);
    }

    setStatus("authorized");
  }, []);

  useEffect(() => {
    loadOwnerStore();
  }, [loadOwnerStore]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");

    try {
      const compressed = await compressImageFile(file);
      const supabase = createClient();
      const filePath = `restaurants/${Date.now()}-${file.name.replace(
        /\s+/g,
        "-"
      )}`;

      const { error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(filePath, compressed, { contentType: "image/jpeg" });

      if (uploadError) {
        setMessage(`Upload error: ${uploadError.message}`);
      } else {
        const { data } = supabase.storage
          .from("food-images")
          .getPublicUrl(filePath);
        setImageUrl(data.publicUrl);
        setMessage("Cover image uploaded!");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        name: name.trim(),
        cuisine: cuisine.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        delivery_time: deliveryTime.trim(),
        delivery_minutes: Number(deliveryMins) || 30,
        discount_percent: Number(discountPercent) || 0,
        deal_banner: dealBanner.trim() || null,
        promo_tag: promoTag.trim() || null,
        is_open: isOpen,
      })
      .eq("id", restaurant.id);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Store settings saved!");
      setTimeout(() => setMessage(""), 3000);
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">
        Loading Restaurant Owner Studio...
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0F1115] text-white">
        <div className="max-w-md w-full bg-[#181B20] border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-[#FF5A1F] mx-auto" />
          <h1 className="text-xl font-bold">Owner Access Required</h1>
          <p className="text-xs text-zinc-400">
            Sign in with a linked Restaurant Owner account to manage your store.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-sm font-semibold px-5 py-2.5 rounded-full"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="bg-[#0F1115] border border-white/10 text-zinc-300 text-sm font-medium px-5 py-2.5 rounded-full"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-white pb-16">
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="The SP Food"
              className="w-8 h-8 rounded-full object-cover border border-[#FF5A1F]/40 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">
                {restaurant?.name || "Owner Studio"}
              </h1>
              <p className="text-[11px] text-zinc-400 truncate">
                {restaurant?.area}, Faisalabad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/menu"
              className="inline-flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5C542] px-3.5 py-2 rounded-full"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Menu</span>
            </Link>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3.5 py-2 rounded-full"
            >
              <Flame className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Storefront</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-[#181B20] hover:bg-red-500/15 border border-white/10 text-zinc-300 hover:text-red-400 p-2 rounded-full"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <form
          onSubmit={handleSave}
          className="bg-[#181B20] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-[#F5C542]" />
              Store Profile, Delivery Time &amp; Deals
            </h2>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="accent-[#FF5A1F] w-4 h-4"
              />
              <span className={isOpen ? "text-emerald-400" : "text-red-400"}>
                {isOpen ? "Open for Orders" : "Paused / Closed"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Restaurant Name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Cuisine
              </label>
              <input
                required
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Delivery Time Label
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Est. Minutes
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={deliveryMins}
                onChange={(e) => setDeliveryMins(Number(e.target.value))}
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Discount (%)
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-[#FF5A1F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Special Deal Banner
              </label>
              <div className="relative">
                <Sparkles className="w-3.5 h-3.5 text-[#F5C542] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dealBanner}
                  onChange={(e) => setDealBanner(e.target.value)}
                  placeholder="e.g. Free drink on orders Rs. 1,200+"
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1.5">
                Promo Tag
              </label>
              <input
                type="text"
                value={promoTag}
                onChange={(e) => setPromoTag(e.target.value)}
                placeholder="e.g. Combo Deal"
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-zinc-300">
              Cover Image (Upload or Paste URL)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 bg-[#0F1115] hover:bg-white/10 border border-white/15 text-xs font-semibold text-[#F5C542] px-4 py-2.5 rounded-xl shrink-0">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Store Settings"}
            </button>

            {message && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {message}
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}