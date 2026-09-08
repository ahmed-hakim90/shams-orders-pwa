import type { Order } from "./types";

export function orderConfirmationWhatsAppUrl(order: Pick<Order, "customer" | "number" | "phone" | "total" | "address" | "shipping_address">) {
  const phone = whatsAppPhone(order.phone || "");
  if (!phone) return "";
  const total = order.total.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  const address = (order.shipping_address || order.address || "").replace(/\s*\n\s*/g, "، ").trim();
  const message = [
    `أهلًا ${order.customer}،`,
    `مع حضرتك فريق شمس ستورز بخصوص الأوردر رقم #${order.number}.`,
    `إجمالي الطلب: ${total}.`,
    ...(address ? [`عنوان الاستلام: ${address}.`] : []),
    "برجاء تأكيد الطلب وبيانات الاستلام.",
    "شكرًا لحضرتك.",
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function whatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
}
