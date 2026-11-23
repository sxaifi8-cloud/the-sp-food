// app/super-admin/page.tsx
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
  UserCheck,
  Mail,
  Trash2,
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
  deal_banner?: string | null;
  owner_id?: string | null;
  is_open?: boolean | null;
}

interface PartnerRequestRecord {
  id: string;
  user_id: string | null;
  restaurant_name: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  area: string;
  cuisine: string;
  delivery_time: string;
  discount_percent: number;
  deal_banner: string | null;
  description: string | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
}

const DELAY_THRESHOLD_MINS = 25;

const STATUS_BADGE: Record<SuperOrder["status"], string> = {
  pending: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  preparing: "bg-[#FF6B2B]/20 text-[#FF8A50] border-[#FF6B2B]/40",
  ready: "bg-sky-500/20 text-sky-200 border-sky-400/40",
  picked_up: "bg-purple-500/20 text-purple-200 border-purple-400/40",
  delivered: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  cancelled: "bg-red-500/20 text-red-200 border-red-400/40",
};

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

function parseDeliveryMinutes(label: string | null | undefined): number {
  if (!label) return 30;
  const match = label.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) || 30 : 30;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<
    "checking" | "authorized" | "unauthorized"
  >("checking");
  const [orders, setOrders] = useState<SuperOrder[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<
    PartnerRequestRecord[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Partner Request Approval State
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [partnerNotice, setPartnerNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
  const [formCuisine, setFormCuisine] = useState("Burgers & Fast Food");
  const [formArea, setFormArea] = useState("D Ground");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDeliveryTime, setFormDeliveryTime] = useState("25-35 min");
  const [formDeliveryMins, setFormDeliveryMins] = useState(30);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formPriceTier, setFormPriceTier] = useState(2);

  const fetchDashboardData = useCallback(async () => {
    const supabase = createClient();

    const [ordersRes, restRes, reqRes] = await Promise.all([
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
      supabase
        .from("partner_requests")
        .select("*")
        .order("created_at", { ascending: false }),
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
    if (!reqRes.error && reqRes.data) {
      setPartnerRequests(reqRes.data as PartnerRequestRecord[]);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_requests" },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      clearInterval(clock);
      supabase.removeChannel(channel);
    };
  }, [authState, fetchDashboardData]);

  const handleApproveAndPromote = async (req: PartnerRequestRecord) => {
    setProcessingReqId(req.id);
    setPartnerNotice(null);
    const supabase = createClient();

    try {
      // 1. Locate matching profile by user_id or owner_email so we can promote to 'owner'
      let targetOwnerId: string | null = req.user_id;

      if (!targetOwnerId && req.owner_email) {
        const { data: matchedProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", req.owner_email.trim())
          .limit(1)
          .maybeSingle();

        if (matchedProfile?.id) {
          targetOwnerId = matchedProfile.id;
        }
      }

      if (targetOwnerId) {
        await supabase
          .from("profiles")
          .update({ role: "owner" })
          .eq("id", targetOwnerId);
      }

      // 2. Create live restaurant listing in `restaurants`
      const baseSlug = req.restaurant_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const uniqueSlug = `${baseSlug || "kitchen"}-${req.id.slice(0, 4)}`;

      const { error: restErr } = await supabase.from("restaurants").insert({
        name: req.restaurant_name.trim(),
        slug: uniqueSlug,
        cuisine: req.cuisine.trim(),
        area: req.area.trim(),
        description: req.description,
        image_url: req.image_url,
        rating: 4.8,
        delivery_time: req.delivery_time || "25-35 min",
        delivery_minutes: parseDeliveryMinutes(req.delivery_time),
        discount_percent: Number(req.discount_percent) || 0,
        price_tier: 2,
        deal_banner: req.deal_banner,
        owner_id: targetOwnerId,
        is_open: true,
      });

      if (restErr) {
        setPartnerNotice({
          type: "error",
          text: `Failed to publish restaurant: ${restErr.message}`,
        });
        setProcessingReqId(null);
        return;
      }

      // 3. Mark partner request as approved
      const { error: reqErr } = await supabase
        .from("partner_requests")
        .update({ status: "approved", user_id: targetOwnerId ?? req.user_id })
        .eq("id", req.id);

      if (reqErr) {
        setPartnerNotice({
          type: "error",
          text: `Restaurant created, but status update failed: ${reqErr.message}`,
        });
      } else {
        setPartnerNotice({
          type: "success",
          text: targetOwnerId
            ? `Approved "${req.restaurant_name}", promoted ${req.owner_email} to Owner, and published live!`
            : `Approved "${req.restaurant_name}" and published live! (No profile found yet for ${req.owner_email} — they will get Owner access once they register with that email.)`,
        });
      }

      await fetchDashboardData();
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    setProcessingReqId(reqId);
    setPartnerNotice(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("partner_requests")
      .update({ status: "rejected" })
      .eq("id", reqId);

    if (error) {
      setPartnerNotice({ type: "error", text: error.message });
    } else {
      setPartnerNotice({ type: "success", text: "Application marked as rejected." });
      await fetchDashboardData();
    }
    setProcessingReqId(null);
  };

  const handleDeleteRequest = async (reqId: string) => {
    setProcessingReqId(reqId);
    setPartnerNotice(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("partner_requests")
      .delete()
      .eq("id", reqId);

    if (error) {
      setPartnerNotice({ type: "error", text: error.message });
    } else {
      setPartnerNotice({ type: "success", text: "Application deleted." });
      await fetchDashboardData();
    }
    setProcessingReqId(null);
  };

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
    setFormCuisine("Burgers & Fast Food");
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
      return Math.max(
        0,
        Math.floor((now - new Date(createdAt).getTime()) / 60000)
      );
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

  const pendingRequests = useMemo(
    () => partnerRequests.filter((r) => r.status === "pending"),
    [partnerRequests]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return partnerRequests;
    return partnerRequests.filter(
      (r) =>
        r.restaurant_name.toLowerCase().includes(q) ||
        r.owner_name.toLowerCase().includes(q) ||
        r.owner_email.toLowerCase().includes(q) ||
        r.owner_phone.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [partnerRequests, searchQuery]);

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
      <div className="min-h-screen bg-[#1C2029] flex items-center justify-center text-slate-100 text-sm font-medium">
        Verifying Super Admin access...
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen bg-[#1C2029] text-white flex items-center justify-center px-4 tracking-[0.015em]">
        <div className="max-w-md w-full bg-[#242934] border border-white/15 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-[#FF8A50] mx-auto" />
          <h1 className="text-xl font-extrabold text-[#FFD43B]">
            Restricted Control Tower
          </h1>
          <p className="text-xs text-slate-100 leading-relaxed">
            Sign in with an Admin account to view platform-wide orders, partner
            applications, and delays.
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
              Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1C2029] text-white tracking-[0.015em] antialiased">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-[#242934]/95 backdrop-blur-md border-b border-white/15 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png?v=3"
              alt="The SP Food"
              className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD43B] shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg text-[#FFD43B] truncate">
                  The SP Food
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FF6B2B] text-white px-2 py-0.5 rounded-full shrink-0">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-100 truncate">
                Faisalabad Operations, Partner Approvals &amp; Delay Monitor
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3 py-2 rounded-full transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FFD43B]" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/owner"
              className="flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3 py-2 rounded-full transition-colors"
            >
              <ChefHat className="w-3.5 h-3.5 text-[#FF8A50]" />
              <span className="hidden md:inline">Kitchen</span>
            </Link>
            <Link
              href="/rider"
              className="flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3 py-2 rounded-full transition-colors"
            >
              <Bike className="w-3.5 h-3.5 text-[#FFD43B]" />
              <span className="hidden md:inline">Riders</span>
            </Link>
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3 py-2 rounded-full transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-[#FF8A50]" />
              Storefront
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="bg-[#2E3442] hover:bg-red-500/20 border border-white/20 text-slate-100 hover:text-red-300 p-2 rounded-full transition-colors cursor-pointer"
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
            <Search className="w-4 h-4 text-[#FFD43B] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partner applications, restaurants, customer, rider, phone (0300...), area, or order #ID..."
              className="w-full bg-[#242934] border border-white/20 focus:border-[#FFD43B] rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder:text-slate-300 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center justify-center gap-2 bg-[#FF6B2B] hover:bg-[#ff5714] text-white text-xs sm:text-sm font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-[#FF6B2B]/25 shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Restaurant
          </button>
        </section>

        {/* KPI Summary Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#242934] border border-white/15 rounded-2xl p-4 shadow-md">
            <p className="text-xs font-semibold text-slate-200">
              Delivered Revenue
            </p>
            <p className="text-2xl font-extrabold text-emerald-300 mt-1">
              Rs. {totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#242934] border border-white/15 rounded-2xl p-4 shadow-md">
            <p className="text-xs font-semibold text-slate-200">
              Active Orders
            </p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {activeOrders.length}
            </p>
          </div>
          <div
            className={`bg-[#242934] border rounded-2xl p-4 shadow-md ${
              delayedOrders.length > 0 ? "border-red-400/60" : "border-white/15"
            }`}
          >
            <p className="text-xs font-bold text-red-300">
              Delayed (&gt;{DELAY_THRESHOLD_MINS}m)
            </p>
            <p className="text-2xl font-extrabold text-red-300 mt-1">
              {delayedOrders.length}
            </p>
          </div>
          <div className="bg-[#242934] border border-white/15 rounded-2xl p-4 shadow-md">
            <p className="text-xs font-semibold text-slate-200">
              Pending Partner Apps
            </p>
            <p className="text-2xl font-extrabold text-[#FFD43B] mt-1">
              {pendingRequests.length}
            </p>
          </div>
        </section>

        {/* PARTNER KITCHEN APPLICATIONS (partner_requests) */}
        <section className="bg-[#242934] border border-[#FFD43B]/35 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#FFD43B] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#FFD43B]" />
                Kitchen Partner Applications ({filteredRequests.length})
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                Review incoming applications from{" "}
                <code className="text-[#FFD43B]">/partner</code> and click{" "}
                <strong className="text-white">
                  Approve &amp; Promote to Owner
                </strong>{" "}
                to publish the restaurant and grant Owner studio access.
              </p>
            </div>
            <Link
              href="/partner"
              className="text-xs font-bold bg-[#2E3442] hover:bg-white/15 border border-white/20 text-white px-3.5 py-2 rounded-full transition-colors"
            >
              Open Partner Form
            </Link>
          </div>

          {partnerNotice && (
            <div
              className={`mx-5 mt-4 px-4 py-3 rounded-xl text-xs font-bold border ${
                partnerNotice.type === "success"
                  ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                  : "bg-red-500/15 border-red-400/40 text-red-200"
              }`}
            >
              {partnerNotice.text}
            </div>
          )}

          <div className="p-5">
            {filteredRequests.length === 0 ? (
              <div className="bg-[#2E3442] border border-white/15 rounded-xl p-6 text-center text-xs text-slate-200">
                No kitchen partner applications found.
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredRequests.map((req) => {
                  const isBusy = processingReqId === req.id;
                  const statusStyle =
                    req.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                      : req.status === "rejected"
                      ? "bg-red-500/20 text-red-200 border-red-400/40"
                      : "bg-[#FFD43B]/20 text-[#FFD43B] border-[#FFD43B]/40";

                  return (
                    <div
                      key={req.id}
                      className="bg-[#2E3442] border border-white/15 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {req.image_url ? (
                          <img
                            src={req.image_url}
                            alt={req.restaurant_name}
                            className="w-16 h-16 rounded-xl object-cover border border-white/20 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-[#1C2029] border border-white/15 flex items-center justify-center text-[#FFD43B] shrink-0">
                            <Store className="w-6 h-6" />
                          </div>
                        )}

                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-base text-white">
                              {req.restaurant_name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusStyle}`}
                            >
                              {req.status}
                            </span>
                            <span className="text-xs font-semibold text-[#FFD43B]">
                              {req.area}, Faisalabad • {req.cuisine}
                            </span>
                            {req.discount_percent > 0 && (
                              <span className="text-[11px] font-bold bg-[#FF6B2B] text-white px-2 py-0.5 rounded-full">
                                {req.discount_percent}% OFF
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-100">
                            <span>
                              Owner:{" "}
                              <strong className="text-white">
                                {req.owner_name}
                              </strong>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-[#FFD43B]" />
                              {req.owner_email}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-[#FF8A50]" />
                              {req.owner_phone}
                            </span>
                            <span>Prep: {req.delivery_time}</span>
                          </div>

                          {(req.deal_banner || req.description) && (
                            <p className="text-xs text-slate-200 line-clamp-2">
                              {req.deal_banner && (
                                <strong className="text-[#FFD43B] mr-2">
                                  Deal: {req.deal_banner}
                                </strong>
                              )}
                              {req.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {req.status !== "approved" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApproveAndPromote(req)}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isBusy
                              ? "Approving..."
                              : "Approve & Promote to Owner"}
                          </button>
                        )}

                        {req.status === "pending" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRejectRequest(req.id)}
                            className="inline-flex items-center gap-1 bg-[#1C2029] hover:bg-red-500/20 border border-white/20 text-red-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDeleteRequest(req.id)}
                          className="inline-flex items-center justify-center bg-[#1C2029] hover:bg-red-500/20 border border-white/20 text-slate-200 hover:text-red-300 p-2.5 rounded-xl transition-colors cursor-pointer"
                          title="Delete Application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Delayed Orders Action Alert */}
        {delayedOrders.length > 0 && (
          <section className="bg-red-500/15 border border-red-400/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-200 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-300" />
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
                    className="cursor-pointer bg-[#242934] border border-red-400/40 hover:border-[#FFD43B] rounded-xl p-4 space-y-3 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        {dOrder.restaurants?.name} • #{dOrder.id.slice(0, 6)}
                      </span>
                      <span className="bg-red-500/25 text-red-200 font-bold px-2.5 py-0.5 rounded-full">
                        {mins}m elapsed ({dOrder.status.replace("_", " ")})
                      </span>
                    </div>

                    <p className="text-xs text-slate-100">
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
                          className="inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#FF8A50]" />
                          Call Customer
                        </a>
                      )}
                      {dOrder.rider_phone && (
                        <a
                          href={`tel:${dOrder.rider_phone}`}
                          className="inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-semibold text-sky-300 px-3 py-1.5 rounded-lg"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          Call Rider
                        </a>
                      )}
                      {dOrder.customer_id && (
                        <button
                          type="button"
                          onClick={() => handleGrantApologyPoints(dOrder)}
                          className="inline-flex items-center gap-1.5 bg-[#FFD43B]/20 hover:bg-[#FFD43B]/30 border border-[#FFD43B]/40 text-xs font-bold text-[#FFD43B] px-3 py-1.5 rounded-lg"
                        >
                          {rewardedOrderId === dOrder.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
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

        {/* RESTAURANTS DIRECTORY */}
        <section className="bg-[#242934] border border-white/15 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-[#FFD43B]" />
                Partner Restaurants ({enrichedRestaurants.length})
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                Click any restaurant row to edit its profile, upload photos, or
                filter orders.
              </p>
            </div>

            {selectedRestaurantId !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedRestaurantId("all")}
                className="text-xs font-bold text-[#FFD43B] hover:underline"
              >
                Show All Restaurants
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2E3442] border-b border-white/15 text-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Restaurant</th>
                  <th className="py-3 px-4">Faisalabad Zone</th>
                  <th className="py-3 px-4">Delivery / Offer</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Delivered Revenue</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {enrichedRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-200">
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
                            ? "bg-[#FF6B2B]/15"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#1C2029] border border-white/15 overflow-hidden shrink-0">
                              {rest.image_url ? (
                                <img
                                  src={rest.image_url}
                                  alt={rest.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#FFD43B]">
                                  <Store className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">
                                {rest.name}
                              </p>
                              <p className="text-[11px] text-slate-200">
                                {rest.cuisine}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-100 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#FF8A50]" />
                            {rest.area}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-100">
                              {rest.delivery_time}
                            </span>
                            {rest.discount_percent > 0 && (
                              <span className="bg-[#FF6B2B] text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                                {rest.discount_percent}% OFF
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-white">
                          {rest.totalOrders} total
                          {rest.activeCount > 0 && (
                            <span className="ml-1.5 text-[11px] text-sky-300">
                              ({rest.activeCount} live)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {rest.delayedCount > 0 ? (
                            <span className="bg-red-500/20 text-red-200 border border-red-400/40 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                              {rest.delayedCount} Delayed
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
                              On Time
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-300 text-sm">
                          Rs. {rest.revenue.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FFD43B] hover:text-white">
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

        {/* CUSTOMER ORDER RECORDS TABLE */}
        <section className="bg-[#242934] border border-white/15 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Customer Order Records ({filteredOrders.length})
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                Click any order row to inspect full items, rider details, and
                status controls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#2E3442] border border-white/20 rounded-xl px-3 py-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FFD43B]" />
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#242934]">
                    All Restaurants
                  </option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#242934]">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#2E3442] border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#242934]">
                  All Statuses
                </option>
                <option value="delayed" className="bg-[#242934]">
                  Delayed Only
                </option>
                <option value="pending" className="bg-[#242934]">
                  Pending
                </option>
                <option value="preparing" className="bg-[#242934]">
                  Preparing
                </option>
                <option value="ready" className="bg-[#242934]">
                  Ready
                </option>
                <option value="picked_up" className="bg-[#242934]">
                  On the Way
                </option>
                <option value="delivered" className="bg-[#242934]">
                  Delivered
                </option>
                <option value="cancelled" className="bg-[#242934]">
                  Cancelled
                </option>
              </select>

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#FFD43B]" />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="h-40 rounded-xl bg-[#2E3442] animate-pulse" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#2E3442] border-b border-white/15 text-slate-200 uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-white/10">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-200">
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
                          className="cursor-pointer hover:bg-white/[0.04] transition-colors"
                        >
                          <td className="py-3.5 px-5 font-mono">
                            <span className="text-[#FFD43B] font-bold">
                              #{o.id.slice(0, 8)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">
                              {o.customer_name || "Guest"}
                            </div>
                            <div className="text-slate-200">
                              {o.customer_phone || "—"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-100 font-medium">
                            {o.restaurants?.name || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            {o.rider_name ? (
                              <div>
                                <div className="font-bold text-sky-300 capitalize">
                                  {o.rider_name}
                                </div>
                                <div className="text-slate-200">
                                  {o.rider_phone || "—"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-100">
                            {o.delivery_area || "Faisalabad"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={
                                delayed
                                  ? "text-red-300 font-extrabold"
                                  : "text-slate-200"
                              }
                            >
                              {mins}m
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                delayed
                                  ? "bg-red-500/20 text-red-200 border-red-400/40"
                                  : STATUS_BADGE[o.status]
                              }`}
                            >
                              {o.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right font-extrabold text-white">
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
            className="w-full max-w-lg bg-[#242934] border border-white/20 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FFD43B]">
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
                <p className="text-xs text-slate-200">
                  Placed {new Date(selectedOrder.created_at).toLocaleString()} (
                  {getElapsedMins(selectedOrder.created_at)} mins ago)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full bg-[#2E3442] border border-white/20 text-slate-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#2E3442] border border-white/15 rounded-xl p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFD43B] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer
                </p>
                <p className="font-bold text-white text-sm">
                  {selectedOrder.customer_name || "Guest"}
                </p>
                <p className="text-slate-100">
                  {selectedOrder.customer_phone || "No phone"}
                </p>
                <p className="text-slate-200 pt-1">
                  {selectedOrder.delivery_address}
                </p>
                {selectedOrder.customer_phone && (
                  <a
                    href={`tel:${selectedOrder.customer_phone}`}
                    className="inline-flex items-center gap-1 text-[#FF8A50] font-semibold pt-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" /> Call Customer
                  </a>
                )}
              </div>

              <div className="bg-[#2E3442] border border-white/15 rounded-xl p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5" /> Assigned Rider
                </p>
                {selectedOrder.rider_name ? (
                  <>
                    <p className="font-bold text-sky-300 text-sm capitalize">
                      {selectedOrder.rider_name}
                    </p>
                    <p className="text-slate-100">
                      {selectedOrder.rider_phone || "No phone"}
                    </p>
                    {selectedOrder.rider_phone && (
                      <a
                        href={`tel:${selectedOrder.rider_phone}`}
                        className="inline-flex items-center gap-1 text-sky-300 font-semibold pt-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" /> Call Rider
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-slate-300 italic pt-1">
                    No rider assigned yet
                  </p>
                )}
              </div>
            </div>

            <div className="bg-[#1C2029] border border-white/15 rounded-xl p-4 space-y-2 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFD43B] flex items-center gap-1.5 pb-1">
                <Receipt className="w-3.5 h-3.5" /> Ordered Items
              </p>
              {selectedOrder.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-slate-100"
                >
                  <span>
                    <strong className="text-[#FF8A50] mr-1.5">
                      {item.quantity}x
                    </strong>
                    {item.menu_items?.name || "Menu Item"}
                  </span>
                  <span className="text-slate-200">
                    Rs. {item.price * item.quantity}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/15">
                <span>Total Payable (COD)</span>
                <span className="text-emerald-300">
                  Rs. {selectedOrder.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-white">
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
                  className="bg-[#2E3442] border border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#FFD43B]"
                >
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="picked_up">Picked Up / On Way</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
                {selectedOrder.customer_id ? (
                  <button
                    type="button"
                    onClick={() => handleGrantApologyPoints(selectedOrder)}
                    className="inline-flex items-center gap-1.5 bg-[#FFD43B]/20 hover:bg-[#FFD43B]/30 border border-[#FFD43B]/40 text-xs font-bold text-[#FFD43B] px-3.5 py-2 rounded-xl"
                  >
                    {rewardedOrderId === selectedOrder.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        +50 Pts Sent
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        Grant +50 Apology Pts
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-300">
                    Guest order (no points account)
                  </span>
                )}

                <Link
                  href={`/order/${selectedOrder.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 bg-[#FF6B2B] hover:bg-[#ff5714] text-white text-xs font-bold px-4 py-2 rounded-xl"
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
            className="w-full max-w-lg bg-[#242934] border-l border-white/20 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFD43B]">
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
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full bg-[#2E3442] border border-white/20 text-slate-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drawerMode === "edit" && activeRestaurant && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRestaurantId(activeRestaurant.id);
                      setDrawerOpen(false);
                    }}
                    className="text-xs font-bold bg-[#FF6B2B]/20 text-[#FF8A50] border border-[#FF6B2B]/40 px-3 py-1.5 rounded-lg hover:bg-[#FF6B2B]/30"
                  >
                    Filter Orders
                  </button>
                  <Link
                    href={`/restaurants/${activeRestaurant.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold bg-[#2E3442] text-white border border-white/20 px-3 py-1.5 rounded-lg hover:border-[#FFD43B]"
                  >
                    Storefront <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/admin/menu"
                    className="text-xs font-bold bg-[#2E3442] text-[#FFD43B] border border-white/20 px-3 py-1.5 rounded-lg hover:border-[#FFD43B]"
                  >
                    Manage Menu &amp; Dish Photos
                  </Link>
                </div>
              )}

              <form onSubmit={handleSaveRestaurant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Restaurant Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Kohinoor Grill House"
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Faisalabad Zone
                    </label>
                    <select
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
                    >
                      {FAISALABAD_AREAS.map((a) => (
                        <option key={a} value={a} className="bg-[#242934]">
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Cuisine Category
                    </label>
                    <input
                      required
                      type="text"
                      value={formCuisine}
                      onChange={(e) => setFormCuisine(e.target.value)}
                      placeholder="e.g. BBQ, Burgers, Pizza"
                      className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Delivery Time Label
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-[#FFD43B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formDeliveryTime}
                        onChange={(e) => setFormDeliveryTime(e.target.value)}
                        placeholder="25-35 min"
                        className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Discount Offer (%)
                    </label>
                    <div className="relative">
                      <Tag className="w-3.5 h-3.5 text-[#FF8A50] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={formDiscount}
                        onChange={(e) => setFormDiscount(Number(e.target.value))}
                        className="w-full bg-[#2E3442] border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD43B]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-white">
                    Restaurant Cover Photo (Upload or Paste URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-[#FFD43B]/50 text-xs font-bold text-[#FFD43B] px-3.5 py-2.5 rounded-xl shrink-0">
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
                      className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                    />
                  </div>
                  {formImageUrl && (
                    <div className="h-28 w-full rounded-xl overflow-hidden border border-white/15 bg-[#1C2029]">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Signature smash burgers, charcoal grills, and fresh naan..."
                    className="w-full bg-[#2E3442] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
                  />
                </div>

                {restSaveMsg && (
                  <p
                    className={`text-xs font-bold ${
                      restSaveMsg.startsWith("Error") ||
                      restSaveMsg.startsWith("Upload error")
                        ? "text-red-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {restSaveMsg}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingRest || uploadingImg}
                    className="flex-1 bg-[#FF6B2B] hover:bg-[#ff5714] disabled:opacity-50 text-white text-sm font-extrabold py-3 rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                    className="bg-[#2E3442] border border-white/20 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:border-[#FFD43B]"
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