import type { Branch, Order, OrderQuery, OrdersPage, OrderStatus, ReconciliationItem, ReconciliationPage, ReconciliationQuery, ReconciliationSummary, User } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_SHAMS_WP_URL?.replace(/\/$/, "");
const root = baseUrl ? `${baseUrl}/wp-json/shams-orders/v1` : null;
const catalogRoot = baseUrl ? `${baseUrl}/wp-json/shams-catalog-reconciliation/v1` : null;
export const wpAdminUrl = baseUrl ? `${baseUrl}/wp-admin` : null;
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

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(payload?.message || "تعذر الاتصال بـWordPress", response.status);
  if (payload === null) throw new ApiError(`وصل رد غير صالح من WordPress (${response.status} ${response.headers.get("content-type") || "بدون نوع محتوى"}). حاول تاني أو تواصل مع مسؤول الموقع.`, 502);
  return payload as T;
}

async function request<T>(path: string, init: RequestInit = {}, base: string | null = root): Promise<T> {
  if (!base) throw new Error("demo_mode");
  const token = getStoredToken();
  const response = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  return readResponse<T>(response);
}

async function requestOrders(path: string, page: number): Promise<OrdersPage> {
  if (!root) throw new Error("demo_mode");
  const token = getStoredToken();
  const response = await fetch(`${root}${path}`, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const orders = await readResponse<Order[]>(response);
  return {
    orders,
    page: Number(response.headers.get("X-WP-Page") || page),
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
  return requestOrders(`/orders?${params}`, query.page || 1);
}
export const getOrder = (id: number) => request<Order>(`/orders/${id}`);
export const assignOrder = (id: number, branch_user_id: number) => request<Order>(`/orders/${id}/assign`, { method: "POST", body: JSON.stringify({ branch_user_id }) });
export const bulkAssignOrders = (order_ids: number[], branch_user_id: number) => request<Order[]>("/orders/bulk-assign", { method: "POST", body: JSON.stringify({ order_ids, branch_user_id }) });
export const updateOrderStatus = (id: number, status: OrderStatus) => request<Order>(`/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
export const updateOrderPayment = (id: number, paid: boolean) => request<Order>(`/orders/${id}/payment`, { method: "POST", body: JSON.stringify({ paid }) });
export const addFollowUp = (id: number, note: string) => request<Order>(`/orders/${id}/follow-up`, { method: "POST", body: JSON.stringify({ note }) });

async function requestReconciliationItems(path: string, page: number): Promise<ReconciliationPage> {
  if (!catalogRoot) throw new Error("demo_mode");
  const token = getStoredToken();
  const response = await fetch(`${catalogRoot}${path}`, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const items = await readResponse<ReconciliationItem[]>(response);
  return {
    items,
    page: Number(response.headers.get("X-WP-Page") || page),
    total: Number(response.headers.get("X-WP-Total") || items.length),
    totalPages: Number(response.headers.get("X-WP-TotalPages") || 1),
  };
}

export const getReconciliationSummary = () => request<ReconciliationSummary>("/summary", {}, catalogRoot);
export function getReconciliationItems(query: ReconciliationQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page || 1),
    per_page: String(query.perPage || 20),
  });
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  return requestReconciliationItems(`/items?${params}`, query.page || 1);
}
