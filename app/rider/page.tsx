"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Bike,
  Phone,
  MapPin,
  Store,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
  Banknote,
  ChefHat,
  Navigation,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RiderOrder {
  id: string;
  status: "ready" | "picked_up" | "delivered";
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string;
  total_amount: number;
  created_at: string;
  rider_name: string | null;
  rider_phone: string | null;
  restaurants: { name: string; area: string } | null;
}

function formatWhatsAppNumber(phone: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}

export default function RiderPage() {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Rider profile (saved in localStorage)
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "active" | "error">("idle");
  const lastPushRef = useRef<number>(0);

  useEffect(() => {
    const savedName = localStorage.getItem("sp-rider-name") || "";
    const savedPhone = localStorage.getItem("sp-rider-phone") || "";
    setRiderName(savedName);
    setRiderPhone(savedPhone);
  }, []);

  const handleSaveProfile = (name: string, phone: string) => {
    setRiderName(name);
    setRiderPhone(phone);
    localStorage.setItem("sp-rider-name", name);
    localStorage.setItem("sp-rider-phone", phone);
  };

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, status, customer_name, customer_phone,
        delivery_address, total_amount, created_at,
        rider_name, rider_phone,
        restaurants ( name, area )
      `
      )
      .in("status", ["ready", "picked_up"])
      .order("created_at", { ascending: true });

    if (!error && data) {
      setOrders(data as unknown as RiderOrder[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const supabase = createClient();
    const channel = supabase
      .channel("rider-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Live GPS broadcasting while the rider has active 'picked_up' orders
  const activePickupIds = orders
    .filter((o) => o.status === "picked_up")
    .map((o) => o.id);

  useEffect(() => {
    if (activePickupIds.length === 0 || !navigator.geolocation) {
      setGpsStatus("idle");
      return;
    }

    const supabase = createClient();
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setGpsStatus("active");
        const now = Date.now();
        // Throttle updates to once every 10 seconds
        if (now - lastPushRef.current < 10000) return;
        lastPushRef.current = now;

        await supabase
          .from("orders")
          .update({
            rider_lat: pos.coords.latitude,
            rider_lng: pos.coords.longitude,
            last_location_at: new Date().toISOString(),
          })
          .in("id", activePickupIds);
      },
      () => {
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activePickupIds.join(",")]);

  const handleAcceptAndPickup = async (orderId: string) => {
    if (!riderName.trim() || !riderPhone.trim()) {
      alert("Please enter your Rider Name and Phone Number at the top first.");
      return;
    }

    setUpdatingId(orderId);
    const supabase = createClient();

    const pushUpdate = async (lat?: number, lng?: number) => {
      await supabase
        .from("orders")
        .update({
          status: "picked_up",
          rider_name: riderName.trim(),
          rider_phone: riderPhone.trim(),
          ...(lat !== undefined && lng !== undefined
            ? {
                rider_lat: lat,
                rider_lng: lng,
                last_location_at: new Date().toISOString(),
              }
            : {}),
        })
        .eq("id", orderId);

      await fetchOrders();
      setUpdatingId(null);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => pushUpdate(pos.coords.latitude, pos.coords.longitude),
        () => pushUpdate(),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      await pushUpdate();
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    setUpdatingId(orderId);
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    await fetchOrders();
    setUpdatingId(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FF5A1F] flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </span>
            <div>
              <h1 className="font-bold text-base text-white leading-tight">
                Rider Portal
              </h1>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                Faisalabad Deliveries
                {gpsStatus === "active" && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    • <Navigation className="w-3 h-3" /> Live GPS
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="bg-[#181B20] border border-white/10 text-zinc-200 p-2 rounded-full hover:border-[#FF5A1F]"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-[#FF5A1F]" />
            </button>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 bg-[#181B20] border border-white/10 text-xs font-medium text-zinc-200 px-3 py-2 rounded-full"
            >
              <ChefHat className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Kitchen
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 w-full flex-1 space-y-5">
        {/* Rider Profile Bar */}
        <section className="bg-[#181B20] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Your Rider Profile
            </span>
            {gpsStatus === "error" && (
              <span className="text-[11px] text-amber-400">
                Allow Location permission for live tracking
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={riderName}
              onChange={(e) => handleSaveProfile(e.target.value, riderPhone)}
              placeholder="Rider Name (e.g. Bilal)"
              className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#FF5A1F]"
            />
            <input
              type="tel"
              value={riderPhone}
              onChange={(e) => handleSaveProfile(riderName, e.target.value)}
              placeholder="Rider Phone (e.g. 0300-1234567)"
              className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#FF5A1F]"
            />
          </div>
        </section>

        {/* Orders Feed */}
        {loading ? (
          <div className="h-48 rounded-2xl bg-[#181B20] animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-10 text-center">
            <Bike className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-300 font-medium">No deliveries ready right now</p>
            <p className="text-xs text-zinc-500 mt-1">
              New orders will appear here automatically when the kitchen marks them Ready.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const waNumber = formatWhatsAppNumber(order.customer_phone);
            const waMessage = encodeURIComponent(
              `Salam ${order.customer_name || ""}, I am ${riderName || "your SP Food rider"}. I am on the way with your order #${order.id.slice(0, 6)} (COD: Rs. ${order.total_amount}).`
            );

            return (
              <div
                key={order.id}
                className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">
                    Order #{order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                      order.status === "ready"
                        ? "bg-sky-500/15 text-sky-400"
                        : "bg-purple-500/15 text-purple-400"
                    }`}
                  >
                    {order.status === "ready" ? "Ready for Pickup" : "On the Way"}
                  </span>
                </div>

                {/* Pickup & Dropoff */}
                <div className="space-y-3 bg-[#0F1115] border border-white/5 rounded-xl p-3.5 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Store className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] uppercase text-zinc-500 font-semibold">
                        Pickup From
                      </p>
                      <p className="text-white font-medium">
                        {order.restaurants?.name} ({order.restaurants?.area})
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] uppercase text-zinc-500 font-semibold">
                        Deliver To — {order.customer_name}
                      </p>
                      <p className="text-zinc-200">{order.delivery_address}</p>
                    </div>
                  </div>
                </div>

                {/* COD Amount */}
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    Collect Cash (COD)
                  </span>
                  <span className="text-base font-bold text-amber-400">
                    Rs. {order.total_amount}
                  </span>
                </div>

                {/* Call & WhatsApp Buttons */}
                {order.customer_phone && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex items-center justify-center gap-2 bg-[#0F1115] hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      <Phone className="w-4 h-4 text-[#FF5A1F]" />
                      Call Customer
                    </a>
                    <a
                      href={`https://wa.me/${waNumber}?text=${waMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </div>
                )}

                {/* Rider Action */}
                {order.status === "ready" ? (
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleAcceptAndPickup(order.id)}
                    className="w-full bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Accept & Pick Up Order
                  </button>
                ) : (
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleMarkDelivered(order.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark Delivered & Cash Collected
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}