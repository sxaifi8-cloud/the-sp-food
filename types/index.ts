export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  delivery_time: string;
  delivery_minutes: number;
  rating: number;
  is_open: boolean;
  price_tier: 1 | 2 | 3;
  discount_percent: number;
  cuisine: string;
  area: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  restaurant_name: string;
  restaurant_area: string;
}