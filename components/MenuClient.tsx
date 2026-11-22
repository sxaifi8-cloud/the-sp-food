"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Check, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Restaurant, MenuItem } from "@/types";

export function RestaurantMenuClient({
  restaurant,
  items,
  isOpen,
}: {
  restaurant: Restaurant;
  items: MenuItem[];
  isOpen: boolean;
}) {
  const { addItem, items: cartItems, totalItems, totalPrice } = useCart();
  const [activeCategory, setActiveCategory] = useState("All");
  const [dishSearch, setDishSearch] = useState("");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(items.map((i) => i.category || "Main"))
    );
    return ["All", ...unique];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = dishSearch.toLowerCase().trim();
    return items.filter((item) => {
      const cat = item.category || "Main";
      const matchesCat = activeCategory === "All" || cat === activeCategory;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [items, activeCategory, dishSearch]);

  const handleAdd = (item: MenuItem) => {
    if (!isOpen || !item.is_available) return;
    addItem(item, restaurant.id, restaurant.area);
    setJustAddedId(item.id);
    setTimeout(() => setJustAddedId(null), 900);
  };

  const getItemQtyInCart = (id: string) =>
    cartItems.find((c) => c.id === id)?.quantity || 0;

  return (
    <div className="space-y-5">
      {/* Search + Category Filter Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={dishSearch}
            onChange={(e) => setDishSearch(e.target.value)}
            placeholder={`Search ${restaurant.name} menu...`}
            className="w-full bg-[#181B20] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#FF5A1F]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors shrink-0 ${
                activeCategory === cat
                  ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                  : "bg-[#181B20] border-white/10 text-zinc-300 hover:border-white/25"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#181B20] border border-white/10 rounded-2xl p-10 text-center text-sm text-zinc-400">
          No dishes match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const qty = getItemQtyInCart(item.id);
            const disabled = !isOpen || !item.is_available;

            return (
              <div
                key={item.id}
                className={`bg-[#181B20] border rounded-2xl p-4 flex justify-between gap-4 transition-colors ${
                  disabled
                    ? "border-white/5 opacity-60"
                    : "border-white/10 hover:border-[#FF5A1F]/40"
                }`}
              >
                <div className="flex flex-col justify-between min-w-0 flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base truncate">
                        {item.name}
                      </h3>
                      {!item.is_available && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                          Sold Out
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4">
                    <span className="font-extrabold text-[#FF5A1F] text-sm">
                      Rs. {item.price}
                    </span>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleAdd(item)}
                      className="inline-flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-[#e04e18] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
                    >
                      {justAddedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          {qty > 0 ? `Add (${qty})` : "Add"}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {item.image_url && (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-zinc-900 overflow-hidden border border-white/10 shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar when items are in Cart */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
          <Link
            href="/cart"
            className="flex items-center justify-between bg-[#FF5A1F] hover:bg-[#e04e18] text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/60 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4" />
              {totalItems} {totalItems === 1 ? "item" : "items"} in cart
            </span>
            <span className="text-sm">View Cart • Rs. {totalPrice}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default RestaurantMenuClient;