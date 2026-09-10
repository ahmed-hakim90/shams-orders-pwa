import type { Branch, Order, ReconciliationItem, ReconciliationSummary, User } from "./types";

export const demoUser: User = { id: 1, name: "أحمد — الإدارة", role: "admin" };
export const demoBranches: Branch[] = [{ id: 21, name: "فرع مدينة نصر" }, { id: 22, name: "فرع وسط البلد" }];
export const demoOrders: Order[] = [
  { id: 1842, number: "1842", created_at: "2026-09-02T11:42:00+03:00", status: "processing", status_label: "جاري التنفيذ", total: "12,450 ج.م", currency: "EGP", payment_method: "بطاقة بنكية", paid: true, customer: "محمد حسام", phone: "010 1234 5678", email: "mohamed@example.com", address: "مدينة نصر، القاهرة", billing_address: "محمد حسام\nمدينة نصر، القاهرة\nمصر", shipping_address: "محمد حسام\nمدينة نصر، القاهرة\nمصر", shipping_method: "شحن سريع", customer_note: "التواصل قبل الوصول", branch: null, item_count: 2, items: [{ id: 1, name: "Sony Alpha Camera", quantity: 1, total: "11,900 ج.م" }, { id: 2, name: "Memory Card 128GB", quantity: 1, total: "550 ج.م" }], totals: [{ label: "الإجمالي الفرعي", value: "12,200 ج.م" }, { label: "الشحن", value: "250 ج.م" }, { label: "الإجمالي", value: "12,450 ج.م" }], activity: [{ id: 1, content: "تم إنشاء الأوردر واستلام الدفع الإلكتروني.", created_at: "2026-09-02T11:42:00+03:00" }] },
  { id: 1841, number: "1841", created_at: "2026-09-02T10:18:00+03:00", status: "on-hold", status_label: "قيد الانتظار", total: "3,250 ج.م", currency: "EGP", payment_method: "الدفع عند الاستلام", paid: false, customer: "سارة علي", phone: "011 2398 1160", address: "المعادي، القاهرة", shipping_method: "شحن عادي", branch: demoBranches[0], item_count: 1, items: [{ id: 3, name: "Wireless Microphone", quantity: 1, total: "3,250 ج.م" }] },
  { id: 1839, number: "1839", created_at: "2026-09-01T18:06:00+03:00", status: "completed", status_label: "مكتمل", total: "8,900 ج.م", currency: "EGP", payment_method: "InstaPay", paid: true, customer: "كريم محمود", phone: "012 4401 7732", address: "الدقي، الجيزة", shipping_method: "استلام من الفرع", branch: demoBranches[1], item_count: 3, items: [{ id: 4, name: "Camera Lens", quantity: 1, total: "8,900 ج.م" }] },
  { id: 1838, number: "1838", created_at: "2026-09-01T16:32:00+03:00", status: "cancelled", status_label: "ملغي", total: "1,790 ج.م", currency: "EGP", payment_method: "الدفع عند الاستلام", paid: false, customer: "نور خالد", phone: "010 9831 2254", branch: demoBranches[0], item_count: 1 },
];

export const demoReconciliationItems: ReconciliationItem[] = [
  { id: 1, sku: "SHM-1001", local_name: "Sony Alpha Camera", local_stock: 12, local_price: 45500, wc_product_id: 5510, wc_variation_id: null, wc_name: "Sony Alpha Camera", website_status: "publish", status: "matched", details: null, last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 2, sku: "SHM-1002", local_name: "Memory Card 128GB", local_stock: 30, local_price: 950, wc_product_id: 5522, wc_variation_id: null, wc_name: "Memory Card 128GB", website_status: "publish", status: "matched", details: null, last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 3, sku: "SHM-1003", local_name: "Wireless Microphone Kit", local_stock: 4, local_price: 3250, wc_product_id: 5533, wc_variation_id: 5534, wc_name: "Wireless Microphone Kit — أسود", website_status: "draft", status: "needs_review", details: "The WooCommerce product/variation status is \"draft\", not published.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 4, sku: "SHM-1004", local_name: "Camera Lens 50mm", local_stock: 0, local_price: 6100, wc_product_id: 5545, wc_variation_id: null, wc_name: "Camera Lens 50mm", website_status: "publish", status: "needs_review", details: "Local stock (0) does not match WooCommerce stock (3).", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 5, sku: "SHM-1105", local_name: "Studio Tripod Stand", local_stock: 8, local_price: 1800, wc_product_id: null, wc_variation_id: null, wc_name: null, website_status: "missing", status: "needs_create", details: "No WooCommerce product or variation has this SKU.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 6, sku: "SHM-1108", local_name: "Camera Cleaning Kit", local_stock: 15, local_price: 420, wc_product_id: null, wc_variation_id: null, wc_name: null, website_status: "missing", status: "needs_create", details: "No WooCommerce product or variation has this SKU.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 7, sku: "SHM-0871", local_name: null, local_stock: null, local_price: null, wc_product_id: 5211, wc_variation_id: null, wc_name: "Vintage Film Camera Body", website_status: "publish", status: "website_only", details: "This SKU exists on the website but was not present in the last local snapshot.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 8, sku: "SHM-0902", local_name: null, local_stock: null, local_price: null, wc_product_id: 5233, wc_variation_id: 5240, wc_name: "Studio Backdrop — أبيض", website_status: "publish", status: "website_only", details: "This SKU exists on the website but was not present in the last local snapshot.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 9, sku: "SHM-1200", local_name: "Flash Trigger (فرع مدينة نصر)", local_stock: 6, local_price: 980, wc_product_id: null, wc_variation_id: null, wc_name: null, website_status: null, status: "sku_issue", details: "This SKU appears 2 times in the local snapshot. Resolve the duplicate in the local system before reconciling.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 10, sku: "SHM-1200", local_name: "Flash Trigger (فرع وسط البلد)", local_stock: 3, local_price: 980, wc_product_id: null, wc_variation_id: null, wc_name: null, website_status: null, status: "sku_issue", details: "This SKU appears 2 times in the local snapshot. Resolve the duplicate in the local system before reconciling.", last_checked_at: "2026-09-10T09:00:00+03:00" },
  { id: 11, sku: "", local_name: "منتج بدون كود صنف", local_stock: 2, local_price: null, wc_product_id: null, wc_variation_id: null, wc_name: null, website_status: null, status: "sku_issue", details: "This local product row has no SKU, so it cannot be matched against WooCommerce.", last_checked_at: "2026-09-10T09:00:00+03:00" },
];

export const demoReconciliationSummary: ReconciliationSummary = {
  local_total: 9,
  website_total: 9,
  matched: 2,
  needs_create: 2,
  needs_review: 2,
  website_only: 2,
  sku_issues: 3,
  last_run_at: "2026-09-10T09:00:00+03:00",
};
