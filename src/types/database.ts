export type AppRole = "admin" | "customer";
export type OrderStatus = "pending" | "preparing" | "completed";

export interface Restaurant {
  id: string;
  name: string;
  logo: string | null;
  owner_id: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export interface Order {
  id: string;
  restaurant_id: string;
  customer_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  menu_item?: { name: string } | null;
}
