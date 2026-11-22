"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Store,
  Phone,
  RefreshCw,
  ChefHat,
  Bike,
  Flame,
  Coins,
  CheckCircle2,
  LogOut,
  Search,
  X,
  Plus,
  ChevronRight,
  Download,
  SlidersHorizontal,
  MapPin,
  Clock,
  Tag,
  Save,
  ExternalLink,
  Upload,
  Receipt,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FAISALABAD_AREAS } from "@/data/areas";

interface SuperOrderItem {
  id: string;
  quantity: number;
  price: number;
  menu_items: { name: string } | null;
}

interface SuperOrder {
  id: string;
  customer_id: string | null;
  restaurant_id: string;
  status:
    | "pending"
    | "preparing"
    | "ready"
    | "picked_up"
    | "delivered"
    | "cancelled";
  customer_name: string | null;
  customer_phone: string | null;
  delivery_area: string | null;
  delivery_address: string;
  delivery_fee?: number;
  total_amount: number;
  created_at: string;
  rider_name: string | null;
  rider_phone: string | null;
  restaurants: { id: string; name: string; area: string; slug?: string } | null;
  order_items: SuperOrderItem[];
}

interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  area: string;
  description: string | null;
  image_url: string | null;
  rating: number;
  delivery_time: string;
  delivery_minutes: number;
  discount_percent: number;
  price_tier: number;
}

const DELAY_THRESHOLD_MINS = 25;

const STATUS_BADGE: Record<SuperOrder["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  preparing: "bg-[#FF5A1F]/15 text-[#FF5A1F] border-[#FF5A1F]/30",
  ready: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  picked_up: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

// Fast client-side image compressor before uploading to Supabase Storage
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
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        0.82
      );
    };
    img.src = url;
  });
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<
    "checking" | "authorized" | "unauthorized"
  >("checking");
  const [orders, setOrders] = useState<SuperOrder[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Global Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rewardedOrderId, setRewardedOrderId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(0);

  // Order Detail Pop-Up Modal State
  const [selectedOrder, setSelectedOrder] = useState<SuperOrder | null>(null);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);

  // Restaurant Slide-Over Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"edit" | "create">("edit");
  const [activeRestaurant, setActiveRestaurant] =
    useState<RestaurantRecord | null>(null);
  const [savingRest, setSavingRest] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [restSaveMsg, setRestSaveMsg] = useState("");

  // Restaurant Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCuisine, setFormCuisine] = useState("Fast Food & Burgers");
  const [formArea, setFormArea] = useState("D Ground");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDeliveryTime, setFormDeliveryTime] = useState("25-35 min");
  const [formDeliveryMins, setFormDeliveryMins] = useState(30);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formPriceTier, setFormPriceTier] = useState(2);

  const fetchDashboardData = useCallback(async () => {
    const supabase = createClient();

    const [ordersRes, restRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          `
          id, customer_id, restaurant_id, status, customer_name, customer_phone,
          delivery_area, delivery_address, delivery_fee, total_amount, created_at,
          rider_name, rider_phone,
          restaurants ( id, name, area, slug ),
          order_items ( id, quantity, price, menu_items ( name ) )
        `
        )
        .order("created_at", { ascending: false }),
      supabase.from("restaurants").select("*").order("name", { ascending: true }),
    ]);

    if (!ordersRes.error && ordersRes.data) {
      const fetched = ordersRes.data as unknown as SuperOrder[];
      setOrders(fetched);
      setSelectedOrder((prev) =>
        prev ? fetched.find((o) => o.id === prev.id) || null : null
      );
    }
    if (!restRes.error && restRes.data) {
      setRestaurants(restRes.data as RestaurantRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthState("unauthorized");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setAuthState("authorized");
      } else {
        setAuthState("unauthorized");
      }
    };

    checkRole();
  }, []);

  useEffect(() => {
    if (authState !== "authorized") return;

    setNow(Date.now());
    fetchDashboardData();
    const clock = setInterval(() => setNow(Date.now()), 30000);

    const supabase = createClient();
    const channel = supabase
      .channel("super-admin-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      clearInterval(clock);
      supabase.removeChannel(channel);
    };
  }, [authState, fetchDashboardData]);

  const openEditDrawer = (rest: RestaurantRecord) => {
    setDrawerMode("edit");
    setActiveRestaurant(rest);
    setFormName(rest.name);
    setFormSlug(rest.slug);
    setFormCuisine(rest.cuisine || "");
    setFormArea(rest.area || "D Ground");
    setFormDescription(rest.description || "");
    setFormImageUrl(rest.image_url || "");
    setFormDeliveryTime(rest.delivery_time || "25-35 min");
    setFormDeliveryMins(rest.delivery_minutes || 30);
    setFormDiscount(rest.discount_percent || 0);
    setFormPriceTier(rest.price_tier || 2);
    setRestSaveMsg("");
    setDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setActiveRestaurant(null);
    setFormName("");
    setFormSlug("");
    setFormCuisine("Fast Food & Burgers");
    setFormArea("D Ground");
    setFormDescription("");
    setFormImageUrl("");
    setFormDeliveryTime("25-35 min");
    setFormDeliveryMins(30);
    setFormDiscount(0);
    setFormPriceTier(2);
    setRestSaveMsg("");
    setDrawerOpen(true);
  };

  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    setRestSaveMsg("");

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
        setRestSaveMsg(`Upload error: ${uploadError.message}`);
      } else {
        const { data } = supabase.storage
          .from("food-images")
          .getPublicUrl(filePath);
        setFormImageUrl(data.publicUrl);
        setRestSaveMsg("Image uploaded!");
      }
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRest(true);
    setRestSaveMsg("");
    const supabase = createClient();

    const generatedSlug =
      formSlug.trim() ||
      formName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const payload = {
      name: formName.trim(),
      slug: generatedSlug,
      cuisine: formCuisine.trim(),
      area: formArea,
      description: formDescription.trim() || null,
      image_url: formImageUrl.trim() || null,
      delivery_time: formDeliveryTime.trim(),
      delivery_minutes: Number(formDeliveryMins) || 30,
      discount_percent: Number(formDiscount) || 0,
      price_tier: Number(formPriceTier) || 2,
    };

    if (drawerMode === "edit" && activeRestaurant) {
      const { error } = await supabase
        .from("restaurants")
        .update(payload)
        .eq("id", activeRestaurant.id);
      if (error) {
        setRestSaveMsg(`Error: ${error.message}`);
      } else {
        setRestSaveMsg("Restaurant updated!");
        await fetchDashboardData();
      }
    } else {
      const { error } = await supabase.from("restaurants").insert({
        ...payload,
        rating: 4.8,
      });
      if (error) {
        setRestSaveMsg(`Error: ${error.message}`);
      } else {
        setRestSaveMsg("Restaurant created!");
        await fetchDashboardData();
        setTimeout(() => setDrawerOpen(false), 900);
      }
    }

    setSavingRest(false);
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: SuperOrder["status"]
  ) => {
    setUpdatingOrderStatus(true);
    const supabase = createClient();
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    await fetchDashboardData();
    setUpdatingOrderStatus(false);
  };

  const handleGrantApologyPoints = async (order: SuperOrder) => {
    if (!order.customer_id) return;
    const supabase = createClient();
    await supabase.rpc("grant_apology_points", {
      target_user_id: order.customer_id,
      bonus_pts: 50,
    });
    setRewardedOrderId(order.id);
    setTimeout(() => setRewardedOrderId(null), 3000);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getElapsedMins = useCallback(
    (createdAt: string) => {
      if (!now) return 0;
      return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
    },
    [now]
  );

  const isOrderDelayed = useCallback(
    (o: SuperOrder) =>
      !["delivered", "cancelled"].includes(o.status) &&
      getElapsedMins(o.created_at) >= DELAY_THRESHOLD_MINS,
    [getElapsedMins]
  );

  const delayedOrders = useMemo(
    () => orders.filter(isOrderDelayed),
    [orders, isOrderDelayed]
  );
  const activeOrders = useMemo(
    () => orders.filter((o) => !["delivered", "cancelled"].includes(o.status)),
    [orders]
  );
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered"),
    [orders]
  );
  const totalRevenue = useMemo(
    () => deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [deliveredOrders]
  );

  const enrichedRestaurants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return restaurants
      .map((rest) => {
        const restOrders = orders.filter((o) => o.restaurant_id === rest.id);
        const delivered = restOrders.filter((o) => o.status === "delivered");
        const active = restOrders.filter(
          (o) => !["delivered", "cancelled"].includes(o.status)
        );
        const delayed = restOrders.filter(isOrderDelayed);
        const revenue = delivered.reduce(
          (sum, o) => sum + (o.total_amount || 0),
          0
        );
        return {
          ...rest,
          totalOrders: restOrders.length,
          activeCount: active.length,
          delayedCount: delayed.length,
          revenue,
        };
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q)
        );
      });
  }, [restaurants, orders, searchQuery, isOrderDelayed]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const matchesRest =
        selectedRestaurantId === "all" || o.restaurant_id === selectedRestaurantId;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "delayed"
          ? isOrderDelayed(o)
          : o.status === statusFilter);
      const matchesSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
        (o.rider_name && o.rider_name.toLowerCase().includes(q)) ||
        (o.rider_phone && o.rider_phone.toLowerCase().includes(q)) ||
        (o.delivery_area && o.delivery_area.toLowerCase().includes(q)) ||
        (o.restaurants?.name && o.restaurants.name.toLowerCase().includes(q));

      return matchesRest && matchesStatus && matchesSearch;
    });
  }, [orders, selectedRestaurantId, statusFilter, searchQuery, isOrderDelayed]);

  const exportCsv = () => {
    const headers = [
      "Order ID",
      "Customer",
      "Customer Phone",
      "Restaurant",
      "Rider",
      "Rider Phone",
      "Area",
      "Status",
      "Amount (PKR)",
      "Created At",
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.customer_name || "Guest"}"`,
      `"${o.customer_phone || ""}"`,
      `"${o.restaurants?.name || ""}"`,
      `"${o.rider_name || "Unassigned"}"`,
      `"${o.rider_phone || ""}"`,
      `"${o.delivery_area || ""}"`,
      o.status,
      o.total_amount,
      o.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sp-food-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">
        Verifying Super Admin access...
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#181B20] border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-[#FF5A1F] mx-auto" />
          <h1 className="text-xl font-bold text-white">Restricted Control Tower</h1>
          <p className="text-xs text-zinc-400">
            Sign in with an Admin account to view platform-wide orders and delays.
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
              Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0F1115] text-white">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#F59E0B] flex items-center justify-center shadow-lg shadow-[#FF5A1F]/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                Super Admin Control Tower
              </h1>
              <p className="text-[11px] text-zinc-400">
                Faisalabad Operations, Restaurants &amp; Delay Monitor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
            >
              <ChefHat className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span className="hidden md:inline">Kitchen</span>
            </Link>
            <Link
              href="/rider"
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
            >
              <Bike className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span className="hidden md:inline">Riders</span>
            </Link>
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Storefront
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-[#181B20] hover:bg-red-500/15 border border-white/10 text-zinc-300 hover:text-red-400 p-2 rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6 flex-1">
        {/* Global Command Search Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#F5C542] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants, customer, rider, phone (0300...), area, or order #ID..."
              className="w-full bg-[#181B20] border border-white/15 focus:border-[#F5C542] rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors"
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

          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center justify-center gap-2 bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl shadow-lg shadow-[#FF5A1F]/20 shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Restaurant
          </button>
        </section>

        {/* KPI Summary Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-400">Delivered Revenue</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              Rs. {totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-400">Active Orders</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {activeOrders.length}
            </p>
          </div>
          <div
            className={`bg-[#181B20] border rounded-2xl p-4 ${
              delayedOrders.length > 0 ? "border-red-500/50" : "border-white/10"
            }`}
          >
            <p className="text-xs font-semibold text-red-400">
              Delayed (&gt;{DELAY_THRESHOLD_MINS}m)
            </p>
            <p className="text-2xl font-extrabold text-red-400 mt-1">
              {delayedOrders.length}
            </p>
          </div>
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-400">Total Orders</p>
            <p className="text-2xl font-extrabold text-[#F5C542] mt-1">
              {orders.length}
            </p>
          </div>
        </section>

        {/* Delayed Orders Action Alert */}
        {delayedOrders.length > 0 && (
          <section className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                Action Needed: {delayedOrders.length} Order(s) Delayed Over{" "}
                {DELAY_THRESHOLD_MINS} Minutes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {delayedOrders.map((dOrder) => {
                const mins = getElapsedMins(dOrder.created_at);
                return (
                  <div
                    key={dOrder.id}
                    onClick={() => setSelectedOrder(dOrder)}
                    className="cursor-pointer bg-[#0F1115] border border-red-500/30 hover:border-red-400 rounded-xl p-4 space-y-3 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        {dOrder.restaurants?.name} • #{dOrder.id.slice(0, 6)}
                      </span>
                      <span className="bg-red-500/20 text-red-300 font-bold px-2.5 py-0.5 rounded-full">
                        {mins}m elapsed ({dOrder.status.replace("_", " ")})
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300">
                      Customer:{" "}
                      <strong>{dOrder.customer_name || "Guest"}</strong> (
                      {dOrder.customer_phone || "No phone"}) •{" "}
                      {dOrder.delivery_area || dOrder.delivery_address}
                    </p>

                    <div
                      className="flex flex-wrap items-center gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dOrder.customer_phone && (
                        <a
                          href={`tel:${dOrder.customer_phone}`}
                          className="inline-flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#FF5A1F]" />
                          Call Customer
                        </a>
                      )}
                      {dOrder.rider_phone && (
                        <a
                          href={`tel:${dOrder.rider_phone}`}
                          className="inline-flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-semibold text-sky-400 px-3 py-1.5 rounded-lg"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          Call Rider
                        </a>
                      )}
                      {dOrder.customer_id && (
                        <button
                          onClick={() => handleGrantApologyPoints(dOrder)}
                          className="inline-flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-300 px-3 py-1.5 rounded-lg"
                        >
                          {rewardedOrderId === dOrder.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              +50 Pts Sent
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" />
                              +50 Apology Pts
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* RESTAURANTS DIRECTORY (Clickable Rows) */}
        <section className="bg-[#181B20] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-[#FF5A1F]" />
                Partner Restaurants ({enrichedRestaurants.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any restaurant row to edit its profile, upload photos, or filter orders.
              </p>
            </div>

            {selectedRestaurantId !== "all" && (
              <button
                onClick={() => setSelectedRestaurantId("all")}
                className="text-xs font-semibold text-[#F5C542] hover:underline"
              >
                Show All Restaurants
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#13161B] border-b border-white/10 text-zinc-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Restaurant</th>
                  <th className="py-3 px-4">Faisalabad Zone</th>
                  <th className="py-3 px-4">Delivery / Offer</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Delivered Revenue</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {enrichedRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No restaurants match &ldquo;{searchQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  enrichedRestaurants.map((rest) => {
                    const isSelected = selectedRestaurantId === rest.id;
                    return (
                      <tr
                        key={rest.id}
                        onClick={() => openEditDrawer(rest)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#FF5A1F]/10"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
                              {rest.image_url ? (
                                <img
                                  src={rest.image_url}
                                  alt={rest.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  <Store className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">
                                {rest.name}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {rest.cuisine}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-zinc-200 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
                            {rest.area}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300">
                              {rest.delivery_time}
                            </span>
                            {rest.discount_percent > 0 && (
                              <span className="bg-[#FF5A1F]/20 text-[#FF5A1F] font-bold px-2 py-0.5 rounded-full text-[10px]">
                                {rest.discount_percent}% OFF
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-white">
                          {rest.totalOrders} total
                          {rest.activeCount > 0 && (
                            <span className="ml-1.5 text-[11px] text-sky-400">
                              ({rest.activeCount} live)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {rest.delayedCount > 0 ? (
                            <span className="bg-red-500/20 text-red-300 border border-red-500/30 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                              {rest.delayedCount} Delayed
                            </span>
                          ) : (
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
                              On Time
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm">
                          Rs. {rest.revenue.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F5C542] hover:text-white">
                            Manage
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CUSTOMER ORDER RECORDS TABLE (Clickable Rows + Rider Column) */}
        <section className="bg-[#181B20] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Customer Order Records ({filteredOrders.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any order row to inspect full items, rider details, and status controls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0F1115] border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#181B20]">
                    All Restaurants
                  </option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#181B20]">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0F1115] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#181B20]">
                  All Statuses
                </option>
                <option value="delayed" className="bg-[#181B20]">
                  Delayed Only
                </option>
                <option value="pending" className="bg-[#181B20]">
                  Pending
                </option>
                <option value="preparing" className="bg-[#181B20]">
                  Preparing
                </option>
                <option value="ready" className="bg-[#181B20]">
                  Ready
                </option>
                <option value="picked_up" className="bg-[#181B20]">
                  On the Way
                </option>
                <option value="delivered" className="bg-[#181B20]">
                  Delivered
                </option>
                <option value="cancelled" className="bg-[#181B20]">
                  Cancelled
                </option>
              </select>

              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 bg-[#0F1115] hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#F5C542]" />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="h-40 rounded-xl bg-[#0F1115] animate-pulse" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#13161B] border-b border-white/10 text-zinc-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-5">Order</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Restaurant</th>
                    <th className="py-3 px-4">Assigned Rider</th>
                    <th className="py-3 px-4">Delivery Area</th>
                    <th className="py-3 px-4">Age</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400">
                        No order records match your current search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const mins = getElapsedMins(o.created_at);
                      const delayed = isOrderDelayed(o);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3.5 px-5 font-mono">
                            <span className="text-[#FF5A1F] font-semibold">
                              #{o.id.slice(0, 8)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">
                              {o.customer_name || "Guest"}
                            </div>
                            <div className="text-zinc-400">
                              {o.customer_phone || "—"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-200 font-medium">
                            {o.restaurants?.name || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            {o.rider_name ? (
                              <div>
                                <div className="font-semibold text-sky-300 capitalize">
                                  {o.rider_name}
                                </div>
                                <div className="text-zinc-400">
                                  {o.rider_phone || "—"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            {o.delivery_area || "Faisalabad"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={
                                delayed
                                  ? "text-red-400 font-bold"
                                  : "text-zinc-400"
                              }
                            >
                              {mins}m
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                delayed
                                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                                  : STATUS_BADGE[o.status]
                              }`}
                            >
                              {o.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right font-bold text-white">
                            Rs. {o.total_amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ORDER INSPECTION POP-UP MODAL */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-lg bg-[#14171D] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FF5A1F]">
                    #{selectedOrder.id.slice(0, 8)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      STATUS_BADGE[selectedOrder.status]
                    }`}
                  >
                    {selectedOrder.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedOrder.restaurants?.name || "Restaurant Order"}
                </h3>
                <p className="text-xs text-zinc-400">
                  Placed{" "}
                  {new Date(selectedOrder.created_at).toLocaleString()} (
                  {getElapsedMins(selectedOrder.created_at)} mins ago)
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full bg-[#181B20] border border-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Rider Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#181B20] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#FF5A1F]" /> Customer
                </p>
                <p className="font-bold text-white text-sm">
                  {selectedOrder.customer_name || "Guest"}
                </p>
                <p className="text-zinc-300">
                  {selectedOrder.customer_phone || "No phone"}
                </p>
                <p className="text-zinc-400 pt-1">
                  {selectedOrder.delivery_address}
                </p>
                {selectedOrder.customer_phone && (
                  <a
                    href={`tel:${selectedOrder.customer_phone}`}
                    className="inline-flex items-center gap-1 text-[#FF5A1F] font-semibold pt-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" /> Call Customer
                  </a>
                )}
              </div>

              <div className="bg-[#181B20] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-sky-400" /> Assigned Rider
                </p>
                {selectedOrder.rider_name ? (
                  <>
                    <p className="font-bold text-sky-300 text-sm capitalize">
                      {selectedOrder.rider_name}
                    </p>
                    <p className="text-zinc-300">
                      {selectedOrder.rider_phone || "No phone"}
                    </p>
                    {selectedOrder.rider_phone && (
                      <a
                        href={`tel:${selectedOrder.rider_phone}`}
                        className="inline-flex items-center gap-1 text-sky-400 font-semibold pt-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" /> Call Rider
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-zinc-500 italic pt-1">
                    No rider assigned yet
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Receipt */}
            <div className="bg-[#0F1115] border border-white/10 rounded-xl p-4 space-y-2 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 pb-1">
                <Receipt className="w-3.5 h-3.5 text-[#F5C542]" /> Ordered Items
              </p>
              {selectedOrder.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-zinc-200"
                >
                  <span>
                    <strong className="text-[#FF5A1F] mr-1.5">
                      {item.quantity}x
                    </strong>
                    {item.menu_items?.name || "Menu Item"}
                  </span>
                  <span className="text-zinc-400">
                    Rs. {item.price * item.quantity}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Total Payable (COD)</span>
                <span className="text-emerald-400">
                  Rs. {selectedOrder.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Super Admin Controls */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Override Order Status:
                </label>
                <select
                  disabled={updatingOrderStatus}
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleUpdateOrderStatus(
                      selectedOrder.id,
                      e.target.value as SuperOrder["status"]
                    )
                  }
                  className="bg-[#181B20] border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#F5C542]"
                >
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="picked_up">Picked Up / On Way</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                {selectedOrder.customer_id ? (
                  <button
                    onClick={() => handleGrantApologyPoints(selectedOrder)}
                    className="inline-flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-300 px-3.5 py-2 rounded-xl"
                  >
                    {rewardedOrderId === selectedOrder.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        +50 Apology Pts Sent
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        Grant +50 Apology Pts
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-zinc-500">
                    Guest order (no points account)
                  </span>
                )}

                <Link
                  href={`/order/${selectedOrder.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Live Map Tracker <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER RESTAURANT MANAGEMENT DRAWER */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#14171D] border-l border-white/10 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5C542]">
                    {drawerMode === "edit"
                      ? "Restaurant Control Form"
                      : "Onboard New Kitchen"}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {drawerMode === "edit"
                      ? activeRestaurant?.name
                      : "Add Faisalabad Restaurant"}
                  </h2>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full bg-[#181B20] border border-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions if Editing */}
              {drawerMode === "edit" && activeRestaurant && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRestaurantId(activeRestaurant.id);
                      setDrawerOpen(false);
                    }}
                    className="text-xs font-semibold bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30 px-3 py-1.5 rounded-lg hover:bg-[#FF5A1F]/25"
                  >
                    Filter Orders
                  </button>
                  <Link
                    href={`/restaurants/${activeRestaurant.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-[#181B20] text-zinc-200 border border-white/10 px-3 py-1.5 rounded-lg hover:text-white"
                  >
                    Storefront <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/admin/menu"
                    className="text-xs font-semibold bg-[#181B20] text-[#F5C542] border border-white/10 px-3 py-1.5 rounded-lg hover:border-[#F5C542]/40"
                  >
                    Manage Menu &amp; Dish Photos
                  </Link>
                </div>
              )}

              {/* Restaurant Edit / Create Form */}
              <form onSubmit={handleSaveRestaurant} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Restaurant Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Kohinoor Grill House"
                    className="w-full bg-[#0F1115] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Faisalabad Zone
                    </label>
                    <select
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      className="w-full bg-[#0F1115] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                    >
                      {FAISALABAD_AREAS.map((a) => (
                        <option key={a} value={a} className="bg-[#181B20]">
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Cuisine Category
                    </label>
                    <input
                      required
                      type="text"
                      value={formCuisine}
                      onChange={(e) => setFormCuisine(e.target.value)}
                      placeholder="e.g. BBQ, Burgers, Pizza"
                      className="w-full bg-[#0F1115] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Delivery Time Label
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formDeliveryTime}
                        onChange={(e) => setFormDeliveryTime(e.target.value)}
                        placeholder="25-35 min"
                        className="w-full bg-[#0F1115] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Discount Offer (%)
                    </label>
                    <div className="relative">
                      <Tag className="w-3.5 h-3.5 text-[#FF5A1F] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={formDiscount}
                        onChange={(e) => setFormDiscount(Number(e.target.value))}
                        className="w-full bg-[#0F1115] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                      />
                    </div>
                  </div>
                </div>

                {/* Dual Cover Image Input: Upload File OR Paste URL */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-300">
                    Restaurant Cover Photo (Upload or Paste URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/15 text-xs font-semibold text-[#F5C542] px-3.5 py-2.5 rounded-xl shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImg ? "Uploading..." : "Upload Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImg}
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="Or paste image URL..."
                      className="w-full bg-[#0F1115] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F5C542]"
                    />
                  </div>
                  {formImageUrl && (
                    <div className="h-28 w-full rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Signature smash burgers, charcoal grills, and fresh naan..."
                    className="w-full bg-[#0F1115] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#F5C542]"
                  />
                </div>

                {restSaveMsg && (
                  <p
                    className={`text-xs font-semibold ${
                      restSaveMsg.startsWith("Error") ||
                      restSaveMsg.startsWith("Upload error")
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {restSaveMsg}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingRest || uploadingImg}
                    className="flex-1 bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {savingRest
                      ? "Saving..."
                      : drawerMode === "edit"
                      ? "Save Changes"
                      : "Create Restaurant"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="bg-[#181B20] border border-white/10 text-zinc-300 text-sm font-medium px-5 py-3 rounded-xl hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}