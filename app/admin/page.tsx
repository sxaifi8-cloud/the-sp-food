"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Bike,
  Flame,
  UtensilsCrossed,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OrderItemRow {
  id: string;
  quantity: number;
  price: number;
  menu_items: { name: string } | null;
}

interface OrderRow {
  id: string;
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
  delivery_fee: number;
  total_amount: number;
  created_at: string;
  restaurants: { name: string; area: string } | null;
  order_items: OrderItemRow[];
}

const STATUS_STYLES: Record<OrderRow["status"], string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  preparing: "bg-[#FF5A1F]/15 text-[#FF5A1F] border-[#FF5A1F]/30",
  ready: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  picked_up: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function RestaurantAdminPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, status, customer_name, customer_phone, delivery_area,
        delivery_address, delivery_fee, total_amount, created_at,
        restaurants ( name, area ),
        order_items ( id, quantity, price, menu_items ( name ) )
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as OrderRow[]);
    }
    setLoading(false);
  }, []);

  // Verify Admin role
  useEffect(() => {
    const verifyAdmin = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthStatus("unauthorized");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setAuthStatus("authorized");
      } else {
        setAuthStatus("unauthorized");
      }
    };

    verifyAdmin();
  }, []);

  // Load & subscribe to orders once authorized
  useEffect(() => {
    if (authStatus !== "authorized") return;

    fetchOrders();

    const supabase = createClient();
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authStatus, fetchOrders]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const updateStatus = async (orderId: string, newStatus: OrderRow["status"]) => {
    setUpdatingId(orderId);
    const supabase = createClient();
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    await fetchOrders();
    setUpdatingId(null);
  };

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">
        Verifying admin access...
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#181B20] border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-[#FF5A1F] mx-auto" />
          <h1 className="text-xl font-bold text-white">Admin Access Required</h1>
          <p className="text-xs text-zinc-400">
            Please sign in with an Admin account to access the Kitchen Dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="bg-[#0F1115] border border-white/10 text-zinc-300 text-sm font-medium px-5 py-2.5 rounded-full hover:text-white transition-colors"
            >
              Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter((o) =>
    ["pending", "preparing", "ready", "picked_up"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["delivered", "cancelled"].includes(o.status)
  );
  const displayedOrders = tab === "active" ? activeOrders : completedOrders;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FF5A1F] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </span>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                Kitchen Dashboard
              </h1>
              <p className="text-[11px] text-zinc-400">Live Order Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
              title="Refresh Orders"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span className="hidden md:inline">Refresh</span>
            </button>
            <Link
              href="/admin/menu"
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Manage Menu
            </Link>
            <Link
              href="/rider"
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full transition-colors"
            >
              <Bike className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span className="hidden sm:inline">Rider App</span>
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
              className="flex items-center gap-1.5 bg-[#181B20] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-xs font-medium text-zinc-300 hover:text-red-400 px-3 py-2 rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              tab === "active"
                ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                : "bg-[#181B20] border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            Active Orders ({activeOrders.length})
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              tab === "completed"
                ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                : "bg-[#181B20] border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            History ({completedOrders.length})
          </button>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-[#181B20] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-12 text-center text-zinc-400">
            No {tab} orders right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#181B20] border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
                    <div>
                      <p className="text-xs font-semibold text-[#FF5A1F]">
                        {order.restaurants?.name || "Restaurant"}
                      </p>
                      <h2 className="font-bold text-white text-base mt-0.5">
                        {order.customer_name || "Customer"}
                      </h2>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                        STATUS_STYLES[order.status]
                      }`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-3 space-y-1.5 text-xs text-zinc-300">
                    {order.customer_phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#FF5A1F]" />
                        {order.customer_phone}
                      </p>
                    )}
                    <p className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0 mt-0.5" />
                      <span>{order.delivery_address}</span>
                    </p>
                    <p className="flex items-center gap-2 text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Items List */}
                  <div className="mt-4 bg-[#0F1115] border border-white/5 rounded-xl p-3 space-y-1.5">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-xs text-zinc-200"
                      >
                        <span>
                          <span className="text-[#FF5A1F] font-bold mr-1.5">
                            {item.quantity}x
                          </span>
                          {item.menu_items?.name || "Menu Item"}
                        </span>
                        <span className="text-zinc-400">
                          Rs. {item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-white pt-2 mt-2 border-t border-white/10">
                      <span>Total (COD)</span>
                      <span className="text-[#FF5A1F]">Rs. {order.total_amount}</span>
                    </div>
                  </div>
                </div>

                {/* Kitchen Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {order.status === "pending" && (
                    <>
                      <button
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "preparing")}
                        className="flex-1 bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Accept & Prepare
                      </button>
                      <button
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "cancelled")}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium px-3.5 py-2.5 rounded-xl transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {order.status === "preparing" && (
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, "ready")}
                      className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Bike className="w-4 h-4" />
                      Mark Ready for Rider
                    </button>
                  )}

                  {order.status === "ready" && (
                    <div className="w-full text-center text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 py-2.5 rounded-xl">
                      Waiting for Rider to pick up...
                    </div>
                  )}

                  {order.status === "picked_up" && (
                    <div className="w-full text-center text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 py-2.5 rounded-xl">
                      Rider is on the way to customer
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}