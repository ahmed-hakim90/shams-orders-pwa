import type { Branch, Order, OrderQuery, OrdersPage, OrderStatus, User } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_SHAMS_WP_URL?.replace(/\/$/, "");
const root = baseUrl ? `${baseUrl}/wp-json/shams-orders/v1` : null;
const tokenKey = "shams_orders_token";
const userKey = "shams_orders_user";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  sessionStorage.removeItem(userKey);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(userKey) || sessionStorage.getItem(userKey);
  if (!value) return null;
  try { return JSON.parse(value) as User; }
  catch { localStorage.removeItem(userKey); sessionStorage.removeItem(userKey); return null; }
}

function storeUser(user: User, persistent = Boolean(localStorage.getItem(tokenKey))) {
  const storage = persistent ? localStorage : sessionStorage;
  storage.setItem(userKey, JSON.stringify(user));
  (persistent ? sessionStorage : localStorage).removeItem(userKey);
}

export function isAuthenticationError(cause: unknown) { return cause instanceof ApiError && cause.status === 401; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!root) throw new Error("demo_mode");
  const token = getStoredToken();
  const response = await fetch(`${root}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new ApiError((await response.json().catch(() => null))?.message || "تعذر الاتصال بـWordPress", response.status);
  return response.json() as Promise<T>;
}

async function requestOrders(path: string): Promise<OrdersPage> {
  if (!root) throw new Error("demo_mode");
  const token = getStoredToken();
  const response = await fetch(`${root}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError((await response.json().catch(() => null))?.message || "تعذر الاتصال بـWordPress", response.status);
  const orders = await response.json() as Order[];
  return {
    orders,
    page: Number(response.headers.get("X-WP-Page") || 1),
    total: Number(response.headers.get("X-WP-Total") || orders.length),
    totalPages: Number(response.headers.get("X-WP-TotalPages") || 1),
  };
}

export const isDemoMode = !root;
export async function login(username: string, password: string, remember: boolean) {
  const result = await request<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(tokenKey, result.token);
  (remember ? sessionStorage : localStorage).removeItem(tokenKey);
  storeUser(result.user, remember);
  return result.user;
}
export const getMe = async () => {
  const user = await request<User>("/me");
  storeUser(user);
  return user;
};
export const getBranches = () => request<Branch[]>("/branches");
export function getOrders(query: OrderQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page || 1),
    per_page: String(query.perPage || 20),
  });
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.dateFrom) params.set("date_from", query.dateFrom);
  if (query.dateTo) params.set("date_to", query.dateTo);
  if (query.branch) params.set("branch", query.branch);
  if (query.paymentMethod) params.set("payment_method", query.paymentMethod);
  return requestOrders(`/orders?${params}`);
}
export const getOrder = (id: number) => request<Order>(`/orders/${id}`);
export const assignOrder = (id: number, branch_user_id: number) => request<Order>(`/orders/${id}/assign`, { method: "POST", body: JSON.stringify({ branch_user_id }) });
export const bulkAssignOrders = (order_ids: number[], branch_user_id: number) => request<Order[]>("/orders/bulk-assign", { method: "POST", body: JSON.stringify({ order_ids, branch_user_id }) });
export const updateOrderStatus = (id: number, status: OrderStatus) => request<Order>(`/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
export const updateOrderPayment = (id: number, paid: boolean) => request<Order>(`/orders/${id}/payment`, { method: "POST", body: JSON.stringify({ paid }) });
export const addFollowUp = (id: number, note: string) => request<Order>(`/orders/${id}/follow-up`, { method: "POST", body: JSON.stringify({ note }) });
