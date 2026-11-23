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
  ChefHat,
  RefreshCw,
  MapPin,
  Phone,
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

interface KitchenOrder {
  id: string;
  status: "pending" | "preparing" | "ready" | "picked_up" | "delivered" | string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string;
  total_amount: number;
  created_at: string;
  restaurant_id: string;
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
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

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

  const loadKitchenOrders = useCallback(async (restaurantId?: string) => {
    const supabase = createClient();
    let query = supabase
      .from("orders")
      .select(
        "id, status, customer_name, customer_phone, delivery_address, total_amount, created_at, restaurant_id"
      )
      .in("status", ["pending", "preparing", "ready", "picked_up"])
      .order("created_at", { ascending: false });

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setOrders(data as KitchenOrder[]);
    }
  }, []);

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
      await loadKitchenOrders(target.id);
    } else {
      await loadKitchenOrders();
    }

    setStatus("authorized");
  }, [loadKitchenOrders]);

  useEffect(() => {
    loadOwnerStore();
  }, [loadOwnerStore]);

  useEffect(() => {
    if (status !== "authorized") return;

    const supabase = createClient();
    const channel = supabase
      .channel("owner-kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadKitchenOrders(restaurant?.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, restaurant?.id, loadKitchenOrders]);

  const handleOrderStatusChange = async (
    orderId: string,
    nextStatus: "preparing" | "ready"
  ) => {
    setUpdatingOrderId(orderId);
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);
    await loadKitchenOrders(restaurant?.id);
    setUpdatingOrderId(null);
  };

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
      <div className="min-h-screen bg-[#1C2029] flex items-center justify-center text-slate-100 text-sm font-medium">
        Loading Restaurant Kitchen Studio...
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#1C2029] text-white tracking-[0.015em]">
        <div className="max-w-md w-full bg-[#242934] border border-white/15 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-[#FF8A50] mx-auto" />
          <h1 className="text-xl font-extrabold text-[#FFD43B]">
            Kitchen Owner Access Required
          </h1>
          <p className="text-xs text-slate-100 leading-relaxed">
            Sign in with a linked Restaurant Owner account to manage your live
            kitchen orders, menu, and store settings.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="bg-[#FF6B2B] hover:bg-[#ff5714] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="bg-[#2E3442] border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:border-[#FFD43B] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C2029] text-white pb-16 tracking-[0.015em] antialiased">
      <header className="sticky top-0 z-40 bg-[#242934]/95 backdrop-blur-md border-b border-white/15 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png?v=3"
              alt="The SP Food"
              className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD43B] shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg text-[#FFD43B] truncate">
                  {restaurant?.name || "The SP Food"}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-[#FF6B2B] text-white px-2 py-0.5 rounded-full shrink-0">
                  Kitchen
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-100 truncate">
                {restaurant?.area ? `${restaurant.area}, Faisalabad` : "Owner Studio"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/menu"
              className="inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-[#FFD43B]/40 text-xs font-bold text-[#FFD43B] px-3.5 py-2 rounded-full transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Menu</span>
            </Link>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3.5 py-2 rounded-full transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-[#FF8A50]" />
              <span>Storefront</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="bg-[#2E3442] hover:bg-red-500/20 border border-white/20 text-slate-100 hover:text-red-300 p-2.5 rounded-full transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Live Kitchen Orders Queue */}
        <section className="bg-[#242934] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3.5">
            <h2 className="text-base sm:text-lg font-bold text-[#FFD43B] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#FF8A50]" />
              Live Kitchen Order Queue
            </h2>
            <button
              type="button"
              onClick={() => loadKitchenOrders(restaurant?.id)}
              className="inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FFD43B]" />
              <span>Refresh</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-[#2E3442] border border-white/15 rounded-xl p-6 text-center space-y-1">
              <p className="text-sm font-bold text-white">
                No active kitchen orders right now
              </p>
              <p className="text-xs text-slate-200">
                Incoming Faisalabad customer orders appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#2E3442] border border-white/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#FFD43B]">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1C2029] text-white border border-white/15">
                        {order.status.replace("_", " ")}
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        Rs. {order.total_amount}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {order.customer_name || "Customer"}
                      {order.customer_phone && (
                        <span className="inline-flex items-center gap-1 text-slate-200 font-normal ml-2">
                          <Phone className="w-3 h-3 text-[#FFD43B]" />
                          {order.customer_phone}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-200 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#FF8A50] shrink-0" />
                      {order.delivery_address}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {order.status === "pending" && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() =>
                          handleOrderStatusChange(order.id, "preparing")
                        }
                        className="bg-[#FF6B2B] hover:bg-[#ff5714] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Start Preparing
                      </button>
                    )}
                    {(order.status === "pending" ||
                      order.status === "preparing") && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() =>
                          handleOrderStatusChange(order.id, "ready")
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Mark Ready for Rider
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Store Profile & Deals Form */}
        <form
          onSubmit={handleSave}
          className="bg-[#242934] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#FFD43B] flex items-center gap-2">
              <Store className="w-4 h-4 text-[#FFD43B]" />
              Store Profile, Delivery Time &amp; Deals
            </h2>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold bg-[#2E3442] border border-white/20 px-3.5 py-2 rounded-full">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="accent-[#FF6B2B] w-4 h-4"
              />
              <span className={isOpen ? "text-emerald-300" : "text-red-300"}>
                {isOpen ? "Open for Orders" : "Paused / Closed"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Restaurant Name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Cuisine
              </label>
              <input
                required
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Delivery Time Label
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#FFD43B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Est. Minutes
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={deliveryMins}
                onChange={(e) => setDeliveryMins(Number(e.target.value))}
                className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Discount (%)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-[#FF8A50] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Special Deal Banner
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-[#FFD43B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dealBanner}
                  onChange={(e) => setDealBanner(e.target.value)}
                  placeholder="e.g. Free drink on orders Rs. 1,200+"
                  className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Promo Tag
              </label>
              <input
                type="text"
                value={promoTag}
                onChange={(e) => setPromoTag(e.target.value)}
                placeholder="e.g. Combo Deal"
                className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white">
              Cover Image (Upload or Paste URL)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#2E3442] hover:bg-white/15 border border-[#FFD43B]/50 text-xs font-bold text-[#FFD43B] px-4 py-2.5 rounded-xl shrink-0 transition-colors">
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
                className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-[#FF6B2B] hover:bg-[#ff5714] disabled:opacity-50 text-white text-sm font-extrabold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-lg shadow-[#FF6B2B]/25 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Store Settings"}
            </button>

            {message && (
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
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