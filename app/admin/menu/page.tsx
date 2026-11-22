"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant, MenuItem } from "@/types";

export default function MenuManagementPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestId, setSelectedRestId] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);

  // New Item Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Main");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadRestaurants = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("restaurants").select("*").order("name");
      if (data && data.length > 0) {
        setRestaurants(data as Restaurant[]);
        setSelectedRestId(data[0].id);
      }
    };
    loadRestaurants();
  }, []);

  const fetchMenu = useCallback(async () => {
    if (!selectedRestId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", selectedRestId)
      .order("name");
    if (data) setItems(data as MenuItem[]);
  }, [selectedRestId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestId) return;
    setSaving(true);

    const supabase = createClient();
    await supabase.from("menu_items").insert({
      restaurant_id: selectedRestId,
      name,
      description,
      price: Number(price),
      category,
      image_url: imageUrl || null,
      is_available: true,
    });

    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    await fetchMenu();
    setSaving(false);
  };

  const toggleAvailability = async (item: MenuItem) => {
    const supabase = createClient();
    await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    fetchMenu();
  };

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu();
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="bg-[#181B20] border border-white/10 p-2 rounded-full text-white hover:border-[#FF5A1F]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#FF5A1F]" />
              Menu Management
            </h1>
            <p className="text-xs text-zinc-400">Add, disable, or remove dishes</p>
          </div>
        </div>

        <select
          value={selectedRestId}
          onChange={(e) => setSelectedRestId(e.target.value)}
          className="bg-[#181B20] border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#FF5A1F]"
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.id} className="bg-[#181B20]">
              {r.name} ({r.area})
            </option>
          ))}
        </select>
      </div>

      {/* Add Dish Form */}
      <form
        onSubmit={handleAddItem}
        className="bg-[#181B20] border border-white/10 rounded-2xl p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white">Add New Dish</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dish Name (e.g. Zinger Burger)"
            className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
          />
          <input
            required
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price in Rs. (e.g. 650)"
            className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Burgers, Deals)"
            className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description..."
            className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
          />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FF5A1F]"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-[#FF5A1F] hover:bg-[#e04e18] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {saving ? "Adding..." : "Add to Menu"}
        </button>
      </form>

      {/* Existing Menu Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-[#181B20] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4"
          >
            <div>
              <h3 className="font-semibold text-white">{item.name}</h3>
              <p className="text-xs text-zinc-400">{item.category} • Rs. {item.price}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAvailability(item)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  item.is_available
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-zinc-800 border-white/10 text-zinc-400"
                }`}
              >
                {item.is_available ? "In Stock" : "Sold Out"}
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}