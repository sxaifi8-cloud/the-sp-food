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
    <div className="min-h-screen flex flex-col bg-[#1C2029] text-white tracking-[0.015em] antialiased">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#242934]/95 backdrop-blur-md border-b border-white/15 shadow-md">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png?v=3"
              alt="The SP Food"
              className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD43B] shrink-0"
            />
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg text-[#FFD43B] truncate">
                  The SP Food
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-[#FF6B2B] text-white px-2 py-0.5 rounded-full shrink-0">
                  Rider
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-100 flex items-center gap-1.5 truncate">
                <span>Faisalabad Dispatch</span>
                {gpsStatus === "active" && (
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                    • <Navigation className="w-3 h-3" /> Live GPS
                  </span>
                )}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchOrders}
              className="bg-[#2E3442] border border-white/20 text-white p-2.5 rounded-full hover:border-[#FFD43B] transition-colors cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className="w-4 h-4 text-[#FFD43B]" />
            </button>
            <Link
              href="/owner"
              className="flex items-center gap-1.5 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-xs font-bold text-white px-3.5 py-2 rounded-full transition-colors"
            >
              <ChefHat className="w-4 h-4 text-[#FF8A50]" />
              <span>Kitchen</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 w-full flex-1 space-y-5">
        {/* Rider Profile Bar */}
        <section className="bg-[#242934] border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFD43B] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#FFD43B]" />
              Your Rider Profile
            </span>
            {gpsStatus === "error" && (
              <span className="text-xs font-semibold text-[#FFD43B]">
                Allow Location permission for live tracking
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={riderName}
              onChange={(e) => handleSaveProfile(e.target.value, riderPhone)}
              placeholder="Rider Name (e.g. Bilal)"
              className="bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
            />
            <input
              type="tel"
              value={riderPhone}
              onChange={(e) => handleSaveProfile(riderName, e.target.value)}
              placeholder="Rider Phone (e.g. 0300-1234567)"
              className="bg-[#2E3442] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 outline-none focus:border-[#FFD43B]"
            />
          </div>
        </section>

        {/* Orders Feed */}
        {loading ? (
          <div className="h-48 rounded-2xl bg-[#242934] border border-white/15 animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="bg-[#242934] border border-white/15 rounded-2xl p-10 text-center space-y-2 shadow-lg">
            <Bike className="w-11 h-11 text-[#FFD43B] mx-auto mb-2" />
            <p className="text-white font-bold text-base">
              No deliveries ready right now
            </p>
            <p className="text-xs text-slate-200 max-w-sm mx-auto leading-relaxed">
              New orders will appear here automatically when a Faisalabad
              kitchen marks them Ready for Pickup.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const waNumber = formatWhatsAppNumber(order.customer_phone);
            const waMessage = encodeURIComponent(
              `Salam ${order.customer_name || ""}, I am ${
                riderName || "your SP Food rider"
              }. I am on the way with your order #${order.id.slice(
                0,
                6
              )} (COD: Rs. ${order.total_amount}).`
            );

            return (
              <div
                key={order.id}
                className="bg-[#242934] border border-white/15 rounded-2xl p-5 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    Order #{order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      order.status === "ready"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                        : "bg-[#FFD43B]/20 text-[#FFD43B] border border-[#FFD43B]/40"
                    }`}
                  >
                    {order.status === "ready" ? "Ready for Pickup" : "On the Way"}
                  </span>
                </div>

                {/* Pickup & Dropoff */}
                <div className="space-y-3 bg-[#2E3442] border border-white/15 rounded-xl p-4 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Store className="w-4 h-4 text-[#FF8A50] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#FFD43B] font-bold">
                        Pickup From
                      </p>
                      <p className="text-white font-semibold mt-0.5">
                        {order.restaurants?.name}{" "}
                        {order.restaurants?.area
                          ? `(${order.restaurants.area}, Faisalabad)`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/15 pt-3 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                        Deliver To — {order.customer_name || "Customer"}
                      </p>
                      <p className="text-slate-100 mt-0.5">
                        {order.delivery_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* COD Amount */}
                <div className="flex items-center justify-between bg-[#FFD43B]/15 border border-[#FFD43B]/40 rounded-xl px-4 py-3">
                  <span className="text-xs font-bold text-[#FFD43B] flex items-center gap-1.5 uppercase tracking-wider">
                    <Banknote className="w-4 h-4" />
                    Collect Cash (COD)
                  </span>
                  <span className="text-lg font-extrabold text-white">
                    Rs. {order.total_amount}
                  </span>
                </div>

                {/* Call & WhatsApp Buttons */}
                {order.customer_phone && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex items-center justify-center gap-2 bg-[#2E3442] hover:bg-white/15 border border-white/20 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                    >
                      <Phone className="w-4 h-4 text-[#FFD43B]" />
                      Call Customer
                    </a>
                    <a
                      href={`https://wa.me/${waNumber}?text=${waMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-bold py-2.5 rounded-xl transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </div>
                )}

                {/* Rider Action */}
                {order.status === "ready" ? (
                  <button
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => handleAcceptAndPickup(order.id)}
                    className="w-full bg-[#FF6B2B] hover:bg-[#ff5714] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-[#FF6B2B]/25 transition-colors cursor-pointer"
                  >
                    Accept &amp; Pick Up Order
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => handleMarkDelivered(order.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark Delivered &amp; Cash Collected
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