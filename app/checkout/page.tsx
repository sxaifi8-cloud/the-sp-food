"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, CheckCircle2, Bike, Coins } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { FAISALABAD_AREAS, calculateDeliveryFee } from "@/data/areas";

const MIN_ORDER_FOR_POINTS = 800;
const MAX_POINTS_PER_ORDER = 150;

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("D Ground");
  const [street, setStreet] = useState("");

  // SP Points state
  const [availablePoints, setAvailablePoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);

  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Auto-fill profile details & load SP Points if logged in
  useEffect(() => {
    const loadUserAndProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, default_area, default_address, points")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.full_name) setName(profile.full_name);
        else if (user.user_metadata?.full_name) setName(user.user_metadata.full_name);
        if (profile.phone) setPhone(profile.phone);
        if (profile.default_area) setArea(profile.default_area);
        if (profile.default_address) setStreet(profile.default_address);
        setAvailablePoints(profile.points || 0);
      } else if (user.user_metadata?.full_name) {
        setName(user.user_metadata.full_name);
      }
    };

    loadUserAndProfile();
  }, []);

  const restaurantArea = items[0]?.restaurant_area || "D Ground";
  const { fee: deliveryFee, distanceKm } = calculateDeliveryFee(
    restaurantArea,
    area
  );

  // Margin guardrails: min Rs. 800 food subtotal, max Rs. 150 off per order
  const canRedeem = availablePoints > 0 && totalPrice >= MIN_ORDER_FOR_POINTS;
  const maxRedeemable = Math.min(availablePoints, MAX_POINTS_PER_ORDER);
  const pointsDiscount = usePoints && canRedeem ? maxRedeemable : 0;

  const grandTotal = Math.max(0, totalPrice + deliveryFee - pointsDiscount);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: items[0].restaurant_id,
        customer_id: userId,
        customer_name: name,
        customer_phone: phone,
        delivery_area: area,
        delivery_address: `${street}, ${area}, Faisalabad`,
        delivery_fee: deliveryFee,
        total_amount: grandTotal,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      setError(orderError?.message || "Failed to place order.");
      setLoading(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    await supabase.from("order_items").insert(orderItems);

    // Deduct redeemed SP Points from the user's profile
    if (userId && pointsDiscount > 0) {
      await supabase
        .from("profiles")
        .update({ points: Math.max(0, availablePoints - pointsDiscount) })
        .eq("id", userId);
    }

    clearCart();
    setOrderId(order.id);
    setLoading(false);
  };

  if (orderId) {
    return (
      <div className="min-h-screen max-w-xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white">Order Confirmed!</h1>
        <p className="text-zinc-400 mt-2">
          Your order has been sent to the kitchen. Pay{" "}
          <span className="text-white font-semibold">Cash on Delivery</span>.
        </p>
        <div className="bg-[#181B20] border border-white/10 rounded-xl p-4 mt-6 text-xs text-zinc-400">
          Order ID: <span className="text-[#FF5A1F] font-mono">{orderId}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Link
            href={`/order/${orderId}`}
            className="bg-[#FF5A1F] hover:bg-[#e04e18] text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Track Live Order
          </Link>
          <Link
            href="/"
            className="bg-[#181B20] hover:bg-white/10 border border-white/10 text-zinc-200 font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Your cart is empty.</p>
        <Link href="/" className="text-[#FF5A1F] underline mt-3 inline-block">
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 w-full pb-12">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/cart"
          className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Checkout</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-6">
        {/* Delivery Details */}
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Delivery Details (Faisalabad)</h2>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Full Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hamza Ali"
              className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Phone Number</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300-1234567"
              className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Select Area (Calculates Delivery Fee)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#FF5A1F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
              >
                {FAISALABAD_AREAS.map((a) => (
                  <option key={a} value={a} className="bg-[#181B20]">
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-[#FF5A1F]" />
              From {restaurantArea} → {area} (~{distanceKm} km)
            </p>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              House / Street / Landmark
            </label>
            <input
              required
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="House 14, Street 3, near Main Park"
              className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
            />
          </div>
        </div>

        {/* Redeem SP Points Card */}
        {userId && (
          <div className="bg-[#181B20] border border-[#FF5A1F]/30 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#FF5A1F]" />
                <span className="font-semibold text-white text-sm">
                  Redeem SP Points ({availablePoints} pts available)
                </span>
              </div>
              {availablePoints === 0 ? (
                <p className="text-xs text-zinc-400">
                  Spin the daily wheel on your{" "}
                  <Link href="/profile" className="text-[#FF5A1F] underline">
                    Profile
                  </Link>{" "}
                  to earn free points.
                </p>
              ) : totalPrice < MIN_ORDER_FOR_POINTS ? (
                <p className="text-xs text-amber-400">
                  Add Rs. {MIN_ORDER_FOR_POINTS - totalPrice} more in food to unlock
                  points (min. order Rs. {MIN_ORDER_FOR_POINTS}).
                </p>
              ) : (
                <p className="text-xs text-emerald-400">
                  Save Rs. {maxRedeemable} on this order (max Rs. {MAX_POINTS_PER_ORDER}/order).
                </p>
              )}
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={usePoints && canRedeem}
                disabled={!canRedeem}
                onChange={(e) => setUsePoints(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-disabled:opacity-40 rounded-full peer peer-checked:bg-[#FF5A1F] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-2.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal ({items.length} items)</span>
            <span>Rs. {totalPrice}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Delivery Fee (~{distanceKm} km)</span>
            <span className="text-emerald-400 font-medium">Rs. {deliveryFee}</span>
          </div>
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>SP Points Discount</span>
              <span>- Rs. {pointsDiscount}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-400">
            <span>Payment Method</span>
            <span className="text-white">Cash on Delivery</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-3 border-t border-white/10">
            <span>Total Payable</span>
            <span className="text-[#FF5A1F]">Rs. {grandTotal}</span>
          </div>

          {error && <p className="text-red-400 text-xs pt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl mt-3 transition-colors"
          >
            {loading ? "Placing Order..." : `Place Order • Rs. ${grandTotal}`}
          </button>
        </div>
      </form>
    </div>
  );
}