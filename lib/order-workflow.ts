import type { Order, OrderStatus } from "./types";

export const operationalStatuses: { value: OrderStatus; label: string; description: string }[] = [
  { value: "on-hold", label: "قيد الانتظار", description: "محتاج تأكيد أو إجراء قبل التجهيز" },
  { value: "processing", label: "جاري التجهيز", description: "الفرع استلم الأوردر وبدأ تحضيره" },
  { value: "completed", label: "تم التسليم", description: "العميل استلم والأوردر اتقفل" },
  { value: "cancelled", label: "ملغي", description: "تم إيقاف تنفيذ الأوردر" },
];

const fallbackTransitions: Record<OrderStatus, OrderStatus[]> = {
  "on-hold": ["processing", "cancelled"],
  processing: ["on-hold", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function allowedStatusTransitions(order: Order) {
  return order.allowed_statuses || fallbackTransitions[order.status] || [];
}

export function statusLabel(status: OrderStatus) {
  return operationalStatuses.find((item) => item.value === status)?.label || status;
}
