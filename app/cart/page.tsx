"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

const DELIVERY_FEE = 150;

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Your Cart</h1>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-10 text-center">
          <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium">Your cart is empty</p>
          <Link
            href="/"
            className="inline-block mt-4 bg-[#FF5A1F] text-white text-sm font-semibold px-6 py-2.5 rounded-full"
          >
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-white/10 pb-2">
              Ordering from {items[0].restaurant_name}
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-white">{item.name}</h3>
                  <p className="text-sm text-[#FF5A1F] font-semibold">
                    Rs. {item.price * item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#0F1115] border border-white/10 rounded-full px-2.5 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="text-zinc-300 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-white min-w-[18px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="text-[#FF5A1F]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>Rs. {totalPrice}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Delivery Fee (Faisalabad)</span>
              <span>Rs. {DELIVERY_FEE}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-3 border-t border-white/10">
              <span>Total</span>
              <span className="text-[#FF5A1F]">
                Rs. {totalPrice + DELIVERY_FEE}
              </span>
            </div>

            <Link
              href="/checkout"
              className="block w-full text-center bg-[#FF5A1F] hover:bg-[#e04e18] text-white font-semibold py-3.5 rounded-xl mt-4 transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}