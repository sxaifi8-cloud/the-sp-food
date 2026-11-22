"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ChevronRight, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HistoryOrder {
  id: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  created_at: string;
  restaurants: { name: string } | null;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("orders")
        .select("id, status, total_amount, delivery_address, created_at, restaurants ( name )")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setOrders(data as unknown as HistoryOrder[]);
      setLoading(false);
    };

    loadHistory();
  }, []);

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 w-full space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
      </div>

      {loading ? (
        <div className="h-32 rounded-2xl bg-[#181B20] animate-pulse" />
      ) : !loggedIn ? (
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-10 text-center">
          <p className="text-zinc-300 font-medium">Sign in to view your order history.</p>
          <Link
            href="/login"
            className="inline-block mt-4 bg-[#FF5A1F] text-white text-sm font-semibold px-6 py-2.5 rounded-full"
          >
            Sign In
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium">No orders yet</p>
          <Link
            href="/"
            className="inline-block mt-4 bg-[#FF5A1F] text-white text-sm font-semibold px-6 py-2.5 rounded-full"
          >
            Order Now
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/order/${order.id}`}
              className="flex items-center justify-between bg-[#181B20] border border-white/10 hover:border-[#FF5A1F]/50 rounded-2xl p-4 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {order.restaurants?.name || "Restaurant"}
                  </span>
                  <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F]">
                    {order.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-white">Rs. {order.total_amount}</span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}