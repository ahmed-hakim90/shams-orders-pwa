import type { Branch, Order, User } from "./types";

export type DashboardSnapshot = { user: User; orders: Order[]; branches: Branch[] };

let snapshot: DashboardSnapshot | null = null;

export function getDashboardSnapshot() { return snapshot; }
export function setDashboardSnapshot(next: DashboardSnapshot) { snapshot = next; }
export function clearDashboardSnapshot() { snapshot = null; }
