import type { Order } from "./types";

const orders = new Map<number, Order>();

export function getOrderSnapshot(orderId: number) { return orders.get(orderId) || null; }
export function setOrderSnapshot(order: Order) { orders.set(order.id, order); }
export function clearOrderSnapshots() { orders.clear(); }
