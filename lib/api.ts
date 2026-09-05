import type { Branch, Order, OrderStatus, User } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_SHAMS_WP_URL?.replace(/\/$/, "");
const root = baseUrl ? `${baseUrl}/wp-json/shams-orders/v1` : null;
const tokenKey = "shams_orders_token";
const userKey = "shams_orders_user";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  if (token && !localStorage.getItem(tokenKey)) localStorage.setItem(tokenKey, token);
  return token;
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

function storeUser(user: User) {
  localStorage.setItem(userKey, JSON.stringify(user));
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

export const isDemoMode = !root;
export async function login(username: string, password: string) {
  const result = await request<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  localStorage.setItem(tokenKey, result.token);
  storeUser(result.user);
  return result.user;
}
export const getMe = async () => {
  const user = await request<User>("/me");
  storeUser(user);
  return user;
};
export const getBranches = () => request<Branch[]>("/branches");
export const getOrders = () => request<Order[]>("/orders?per_page=50");
export const getOrder = (id: number) => request<Order>(`/orders/${id}`);
export const assignOrder = (id: number, branch_user_id: number) => request<Order>(`/orders/${id}/assign`, { method: "POST", body: JSON.stringify({ branch_user_id }) });
export const bulkAssignOrders = (order_ids: number[], branch_user_id: number) => request<Order[]>("/orders/bulk-assign", { method: "POST", body: JSON.stringify({ order_ids, branch_user_id }) });
export const updateOrderStatus = (id: number, status: OrderStatus) => request<Order>(`/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
export const addFollowUp = (id: number, note: string) => request<Order>(`/orders/${id}/follow-up`, { method: "POST", body: JSON.stringify({ note }) });
