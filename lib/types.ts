export type Role = "admin" | "branch";
export type OrderStatus = "processing" | "on-hold" | "completed" | "cancelled";

export interface User { id: number; name: string; role: Role }
export interface Branch { id: number; name: string }
export interface OrderItem { id: number; name: string; sku?: string; quantity: number; total: string; image?: string | null; image_full?: string | null }
export interface OrderTotal { label: string; value: string }
export interface StoreDetails { name: string; address: string; phone: string; email: string; url: string }
export interface OrderActivity { id: number; content: string; created_at: string }
export interface Order {
  id: number;
  number: string;
  created_at: string;
  modified_at?: string;
  status: OrderStatus;
  status_label: string;
  total: string;
  currency: string;
  payment_method: string;
  paid: boolean;
  customer: string;
  phone: string;
  email?: string;
  address?: string;
  billing_address?: string;
  shipping_address?: string;
  billing_address_lines?: string[];
  shipping_address_lines?: string[];
  customer_note?: string;
  shipping_method?: string;
  branch: Branch | null;
  item_count: number;
  items?: OrderItem[];
  totals?: OrderTotal[];
  store?: StoreDetails;
  activity?: OrderActivity[];
}
