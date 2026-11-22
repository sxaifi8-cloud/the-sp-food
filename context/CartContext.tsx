"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { CartItem, MenuItem } from "@/types";

interface CartContextType {
  items: CartItem[];
  addItem: (
    item: MenuItem,
    restaurantName: string,
    restaurantArea: string
  ) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("sp-food-cart");
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("sp-food-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (
    item: MenuItem,
    restaurantName: string,
    restaurantArea: string
  ) => {
    setItems((prev) => {
      // If adding from a different restaurant, replace cart
      if (prev.length > 0 && prev[0].restaurant_id !== item.restaurant_id) {
        return [
          {
            ...item,
            quantity: 1,
            restaurant_name: restaurantName,
            restaurant_area: restaurantArea,
          },
        ];
      }
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          restaurant_name: restaurantName,
          restaurant_area: restaurantArea,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}