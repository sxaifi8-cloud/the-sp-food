"use client";

import { useEffect, useState, useCallback, use, Suspense } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  Clock,
  Phone,
  MapPin,
  ExternalLink,
  ArrowLeft,
  MessageCircle,
  Receipt,
  Navigation,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OrderItemRow {
  id: string;
  quantity: number;
  price: number;
  menu_items: { name: string } | null;
}

interface TrackedOrder {
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
  delivery_address: string;
  delivery_fee: number;
  total_amount: number;
  created_at: string;
  rider_name: string | null;
  rider_phone: string | null;
  rider_lat: number | null;
  rider_lng: number | null;
  last_location_at: string | null;
  restaurants: { name: string; area: string; delivery_time: string } | null;
  order_items: OrderItemRow[];
}

const STEPS = [
  { key: "pending", label: "Order Placed", desc: "Sent to restaurant", icon: Clock },
  { key: "preparing", label: "Kitchen Preparing", desc: "Freshly cooking your meal", icon: ChefHat },
  { key: "ready", label: "Ready for Pickup", desc: "Packed & waiting for rider", icon: PackageCheck },
  { key: "picked_up", label: "Rider on the Way", desc: "Heading to your doorstep", icon: Bike },
  { key: "delivered", label: "Delivered", desc: "Enjoy your meal!", icon: CheckCircle2 },
];

function formatWhatsAppNumber(phone: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}

function OrderTrackingContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const fetchOrder = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select(
        `
        id, status, customer_name, customer_phone, delivery_address,
        delivery_fee, total_amount, created_at,
        rider_name, rider_phone, rider_lat, rider_lng, last_location_at,
        restaurants ( name, area, delivery_time ),
        order_items ( id, quantity, price, menu_items ( name ) )
      `
      )
      .eq("id", id)
      .single();

    if (data) setOrder(data as unknown as TrackedOrder);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOrder();

    // Update elapsed timer every 30s
    const timer = setInterval(() => setNow(Date.now()), 30000);

    const supabase = createClient();
    const channel = supabase
      .channel(`track-order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        () => fetchOrder()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [id, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto p-6 text-zinc-400">
        Loading live order status...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto p-6 text-center">
        <p className="text-zinc-400">Order not found.</p>
        <Link href="/" className="text-[#FF5A1F] underline mt-3 inline-block">
          Back to Home
        </Link>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);
  const minutesElapsed = Math.max(
    0,
    Math.floor((now - new Date(order.created_at).getTime()) / 60000)
  );
  const isDelayed =
    minutesElapsed > 40 && !["delivered", "cancelled"].includes(order.status);

  const subtotal = order.order_items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee =
    order.delivery_fee || Math.max(0, order.total_amount - subtotal);

  const riderWa = formatWhatsAppNumber(order.rider_phone);
  const riderWaText = encodeURIComponent(
    `Salam ${order.rider_name || ""}, I'm checking on my SP Food order #${order.id.slice(0, 6)}.`
  );

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 w-full space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Live Order Tracking</h1>
            <p className="text-xs text-zinc-400 font-mono">
              #{order.id.slice(0, 8)} • {order.restaurants?.name} (
              {order.restaurants?.area})
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-zinc-500">Placed</p>
          <p className="text-xs font-semibold text-zinc-200">
            {new Date(order.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Delayed Alert Banner */}
      {isDelayed && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300">
          <strong>Taking longer than usual ({minutesElapsed} mins):</strong>{" "}
          Your order is still active. You can contact the rider below for an immediate update.
        </div>
      )}

      {/* Live Progress Timeline */}
      <div className="bg-[#181B20] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Order Status • {minutesElapsed} min elapsed
          </span>
          <span className="text-xs text-[#FF5A1F] font-semibold">
            Est. {order.restaurants?.delivery_time || "25-35 min"}
          </span>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                    isCompleted
                      ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                      : "bg-[#0F1115] border-white/10 text-zinc-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isCompleted ? "text-white" : "text-zinc-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {isCurrent && order.status !== "delivered" ? (
                      <span className="text-[#FF5A1F]">{step.desc}</span>
                    ) : (
                      step.desc
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rider Details & Embedded Live Map */}
      {order.rider_name && (
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-400">Assigned Rider</p>
              <h2 className="text-base font-bold text-white capitalize">
                {order.rider_name}
              </h2>
              {order.last_location_at && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3 h-3" />
                  GPS updated{" "}
                  {new Date(order.last_location_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {order.rider_phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${riderWa}?text=${riderWaText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${order.rider_phone}`}
                  className="flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-[#e04e18] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>
              </div>
            )}
          </div>

          {order.rider_lat && order.rider_lng ? (
            <div className="space-y-2.5">
              <div className="w-full h-52 rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                <iframe
                  title="Rider Live Location"
                  width="100%"
                  height="100%"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${order.rider_lat},${order.rider_lng}&z=15&output=embed`}
                />
              </div>
              <a
                href={`https://www.google.com/maps?q=${order.rider_lat},${order.rider_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between bg-[#0F1115] hover:bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-medium transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Open Live Pin in Google Maps
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Waiting for rider GPS signal...
            </p>
          )}
        </div>
      )}

      {/* Full Itemized Receipt & Delivery Info */}
      <div className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-4 text-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/10 pb-2.5">
          <Receipt className="w-4 h-4 text-[#FF5A1F]" />
          Order Receipt
        </div>

        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-zinc-200"
            >
              <span>
                <span className="text-[#FF5A1F] font-bold mr-2">
                  {item.quantity}x
                </span>
                {item.menu_items?.name || "Menu Item"}
              </span>
              <span className="text-zinc-400">
                Rs. {item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>Rs. {subtotal}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Delivery Fee</span>
            <span>Rs. {deliveryFee}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-2">
            <span>Total (Cash on Delivery)</span>
            <span className="text-[#FF5A1F]">Rs. {order.total_amount}</span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 text-xs space-y-1">
          <p className="text-zinc-500">Delivering to ({order.customer_name})</p>
          <p className="text-zinc-200">{order.delivery_address}</p>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen max-w-2xl mx-auto p-6 text-zinc-400">
          Loading live order status...
        </div>
      }
    >
      <OrderTrackingContent params={params} />
    </Suspense>
  );
}