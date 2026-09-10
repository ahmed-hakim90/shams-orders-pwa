export type Role = "admin" | "branch";
export type OrderStatus = "pending" | "processing" | "on-hold" | "completed" | "cancelled" | "refunded" | "failed" | "checkout-draft";

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
  allowed_statuses?: OrderStatus[];
  total: string;
  currency: string;
  payment_method: string;
  payment_method_id?: string;
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

export interface OrdersPage {
  orders: Order[];
  page: number;
  total: number;
  totalPages: number;
}

export interface OrderQuery {
  page?: number;
  perPage?: number;
  status?: "all" | OrderStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  branch?: string;
  paymentMethod?: string;
}

export type ReconciliationStatus = "matched" | "needs_create" | "needs_review" | "website_only" | "sku_issue";

export interface ReconciliationSummary {
  local_total: number;
  website_total: number;
  matched: number;
  needs_create: number;
  needs_review: number;
  website_only: number;
  sku_issues: number;
  last_run_at: string | null;
}

export interface ReconciliationItem {
  id: number;
  sku: string;
  local_name: string | null;
  local_stock: number | null;
  local_price: number | null;
  wc_product_id: number | null;
  wc_variation_id: number | null;
  wc_name: string | null;
  website_status: string | null;
  status: ReconciliationStatus;
  details: string | null;
  last_checked_at: string | null;
}

export interface ReconciliationPage {
  items: ReconciliationItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface ReconciliationQuery {
  status?: "all" | ReconciliationStatus;
  search?: string;
  page?: number;
  perPage?: number;
}
