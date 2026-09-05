"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addFollowUp, assignOrder, getBranches, getMe, getOrder, getStoredToken, isDemoMode, updateOrderStatus } from "@/lib/api";
import { demoBranches, demoOrders, demoUser } from "@/lib/demo-data";
import type { Branch, Order, OrderItem, OrderStatus, User } from "@/lib/types";
import { Icon } from "./icons";
import { BrandLogo } from "./brand-logo";
import { ServiceWorker } from "./service-worker";
import { getDashboardSnapshot } from "@/lib/dashboard-cache";
import { getOrderSnapshot, setOrderSnapshot } from "@/lib/order-cache";

const statuses: { value: OrderStatus; label: string; description: string }[] = [
  { value: "on-hold", label: "قيد الانتظار", description: "محتاج تأكيد أو إجراء قبل التجهيز" },
  { value: "processing", label: "جاري التجهيز", description: "الفرع استلم الأوردر وبدأ تحضيره" },
  { value: "completed", label: "تم التسليم", description: "العميل استلم والأوردر اتقفل" },
  { value: "cancelled", label: "ملغي", description: "تم إيقاف تنفيذ الأوردر" },
];

export function OrderDetailsPage({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [initialOrder] = useState(() => isDemoMode ? null : getOrderSnapshot(orderId));
  const [initialUser] = useState(() => isDemoMode ? null : getDashboardSnapshot()?.user || null);
  const [user, setUser] = useState<User | null>(isDemoMode ? demoUser : initialUser);
  const [order, setOrder] = useState<Order | null>(isDemoMode ? demoOrders.find((item) => item.id === orderId) || null : initialOrder);
  const [branches, setBranches] = useState<Branch[]>(isDemoMode ? demoBranches : getDashboardSnapshot()?.branches || []);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "">(isDemoMode ? demoOrders.find((item) => item.id === orderId)?.branch?.id || "" : initialOrder?.branch?.id || "");
  const [loading, setLoading] = useState(!isDemoMode && !initialOrder);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState<OrderItem | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    if (!getStoredToken()) {
      router.replace("/");
      return;
    }
    getMe()
      .then(async (nextUser) => {
        const [nextOrder, nextBranches] = await Promise.all([getOrder(orderId), nextUser.role === "admin" ? getBranches() : Promise.resolve([])]);
        setUser(nextUser); setOrder(nextOrder); setOrderSnapshot(nextOrder); setBranches(nextBranches); setSelectedBranchId(nextOrder.branch?.id || "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "تعذر تحميل الأوردر"))
      .finally(() => setLoading(false));
  }, [orderId, router]);

  useEffect(() => {
    if (!previewItem) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewItem(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewItem]);

  async function changeBranch() {
    if (!order || !selectedBranchId) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const branch = branches.find((item) => item.id === selectedBranchId) || null;
      const updated = isDemoMode ? withDemoActivity({ ...order, branch }, `تم توزيع الأوردر على ${branch?.name || "بدون فرع"} بواسطة ${user?.name}.`) : await assignOrder(order.id, selectedBranchId);
      setOrder(updated); setOrderSnapshot(updated); setMessage("تم توزيع الأوردر بنجاح");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر توزيع الأوردر"); }
    finally { setSaving(false); }
  }

  async function changeStatus(status: OrderStatus) {
    if (!order) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const label = statuses.find((item) => item.value === status)?.label || status;
      const updated = isDemoMode ? withDemoActivity({ ...order, status, status_label: label }, `تم تغيير الحالة إلى «${label}» بواسطة ${user?.name}.`) : await updateOrderStatus(order.id, status);
      setOrder(updated); setOrderSnapshot(updated); setMessage("تم تحديث حالة الأوردر");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحديث الحالة"); }
    finally { setSaving(false); }
  }

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const form = event.currentTarget;
    const note = String(new FormData(form).get("note") || "").trim();
    if (note.length < 2) { setError("اكتب ملاحظة واضحة قبل الحفظ"); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = isDemoMode ? withDemoActivity(order, `متابعة بواسطة ${user?.name}: ${note}`) : await addFollowUp(order.id, note);
      setOrder(updated); setOrderSnapshot(updated); form.reset(); setMessage("تم تسجيل المتابعة على الأوردر");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تسجيل المتابعة"); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="order-state"><span className="loader"/><p>جاري تحميل تفاصيل الأوردر…</p></main>;
  if (!order || !user) return <main className="order-state"><Icon name="orders"/><h1>الأوردر غير متاح</h1><p>{error || "الأوردر غير موجود أو مش متوزع على حسابك."}</p><button className="secondary" onClick={() => router.push("/")}>الرجوع للأوردرات</button></main>;

  const shippingAddress = order.shipping_address_lines?.filter(Boolean).join("\n") || order.shipping_address || order.address || "غير مسجل";
  const orderTotals = order.totals?.filter((line) => !line.label.toLocaleLowerCase().includes("payment method")) || [];

  return (
    <div className="order-page-shell">
      <ServiceWorker />
      <header className="order-topbar">
        <button className="back-button" onClick={() => router.back()}><Icon name="chevron"/>كل الأوردرات</button>
        <div className="compact-brand"><BrandLogo compact /></div>
        <div className="order-user"><span>{user.name.slice(0, 1)}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "مدير النظام" : "مسؤول الفرع"}</small></div></div>
      </header>

      <main className="order-content">
        <section className="order-titlebar">
          <div><p>أوردر #{order.number}</p><h1>تفاصيل الأوردر</h1><small>{formatFullDate(order.created_at)}</small></div>
          <div className="title-actions"><Status status={order.status} label={order.status_label}/><a className="secondary" href={`/orders/${order.id}/print`}><Icon name="print"/>طباعة الفاتورة</a></div>
        </section>

        {error && <div className="alert" role="alert">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}

        <div className="order-layout">
          <div className="order-main-column">
            <section className="detail-card products-card">
              <header><div><span className="section-icon"><Icon name="orders"/></span><div><h2>المنتجات</h2><p>{order.item_count} منتج في الأوردر</p></div></div><strong className="grand-total">{stripHtml(order.total)}</strong></header>
              <div className="product-list">{order.items?.length ? order.items.map((item) => <article key={item.id}><ProductImage item={item} onPreview={() => setPreviewItem(item)}/><div><h3>{item.name}</h3><span>{item.sku&&`SKU: ${item.sku}`}</span><p>الكمية: {item.quantity}</p></div><strong>{stripHtml(item.total)}</strong></article>) : <div className="empty-inline">بيانات المنتجات الكاملة هتظهر بعد الاتصال بـWooCommerce.</div>}</div>
              <footer className="order-totals">{orderTotals.length ? <dl>{orderTotals.map((line, index) => <div className={index === orderTotals.length - 1 ? "is-total" : ""} key={`${line.label}-${index}`}><dt>{line.label}</dt><dd>{stripHtml(line.value)}</dd></div>)}</dl> : <div className="totals-fallback"><span>إجمالي الأوردر</span><strong>{stripHtml(order.total)}</strong></div>}</footer>
            </section>

            <section className="detail-card">
              <header><div><span className="section-icon blue"><Icon name="store"/></span><div><h2>بيانات الاستلام والشحن</h2><p>العنوان وطريقة توصيل الأوردر</p></div></div></header>
              <div className="detail-grid"><Info label="العنوان" value={shippingAddress} multiline/><Info label="طريقة الشحن" value={order.shipping_method || "غير محددة"}/></div>
              {order.customer_note && <div className="customer-note"><strong>ملاحظة العميل</strong><p>{order.customer_note}</p></div>}
            </section>
          </div>

          <aside className="order-side-column">
            <section className="detail-card operations-card">
              <header><div><span className="section-icon orange"><Icon name="grid"/></span><div><h2>تشغيل الأوردر</h2><p>التوزيع والحالة الحالية</p></div></div></header>
              {user.role === "admin" && <div className="distribution-box"><div><strong>{order.branch ? "إعادة توزيع الأوردر" : "الأوردر محتاج يتوزع"}</strong><p>{order.branch ? `موزع حاليًا على ${order.branch.name}` : "اختار الفرع المسؤول ثم اضغط زر التوزيع."}</p></div><label htmlFor="branch-select">الفرع المسؤول</label><select id="branch-select" value={selectedBranchId} disabled={saving} onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : "")}><option value="">اختار الفرع</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><button type="button" className="primary distribute-button" disabled={saving || !selectedBranchId || selectedBranchId === order.branch?.id} onClick={changeBranch}>{saving ? "جاري التوزيع…" : order.branch ? "تأكيد إعادة التوزيع" : "توزيع الأوردر"}</button></div>}
              <fieldset className="status-picker" disabled={saving || !order.branch}><legend>اختار حالة الأوردر</legend>{statuses.map((status) => <button type="button" key={status.value} className={order.status === status.value ? "is-selected" : ""} aria-pressed={order.status === status.value} onClick={() => changeStatus(status.value)}><span><i/>{status.label}</span><small>{status.description}</small></button>)}</fieldset>
              {!order.branch && <p className="field-notice">لازم توزّع الأوردر على فرع قبل تحديث حالته.</p>}
              <div className="assignment"><span>الفرع الحالي</span><strong>{order.branch?.name || "بدون فرع"}</strong></div>
            </section>

            <section className="detail-card customer-card">
              <header><div><span className="section-icon green"><Icon name="phone"/></span><div><h2>بيانات العميل</h2><p>معلومات التواصل</p></div></div></header>
              <dl><div><dt>الاسم</dt><dd>{order.customer}</dd></div><div><dt>رقم الهاتف</dt><dd dir="ltr">{order.phone}</dd></div>{order.email && <div><dt>البريد الإلكتروني</dt><dd dir="ltr">{order.email}</dd></div>}</dl>
              <a className="primary call-button" href={`tel:${order.phone}`}><Icon name="phone"/>اتصال بالعميل</a>
            </section>

            <section className="detail-card payment-card">
              <header><div><span className="section-icon violet"><Icon name="orders"/></span><div><h2>الدفع</h2><p>طريقة وحالة التحصيل</p></div></div></header>
              <div className="payment-row"><span>طريقة الدفع</span><strong>{order.payment_method || "غير محددة"}</strong></div>
              <div className="payment-row"><span>حالة الدفع</span><strong className={order.paid ? "paid" : "unpaid"}>{order.paid ? "مدفوع بالكامل" : "غير مدفوع"}</strong></div>
            </section>
          </aside>

          <section className="detail-card activity-card">
            <header><div><span className="section-icon blue"><Icon name="bell"/></span><div><h2>سجل المتابعة</h2><p>كل إجراء باسم المستخدم ووقت تنفيذه</p></div></div></header>
            <form className="follow-up-form" onSubmit={submitFollowUp}><label htmlFor="follow-up-note">إضافة متابعة جديدة</label><textarea id="follow-up-note" name="note" maxLength={500} placeholder="مثال: تم التواصل مع العميل وتأكيد ميعاد الاستلام" disabled={saving}/><button className="primary" disabled={saving}>{saving ? "جاري الحفظ…" : "تسجيل المتابعة"}</button></form>
            <div className="activity-list">{order.activity?.length ? order.activity.map((item) => <article key={item.id}><span/><div><p>{item.content}</p><time dateTime={item.created_at}>{formatActivityDate(item.created_at)}</time></div></article>) : <div className="empty-inline">لسه مفيش إجراءات مسجلة على الأوردر.</div>}</div>
          </section>
        </div>
      </main>
      {previewItem?.image_full || previewItem?.image ? <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`صورة ${previewItem.name}`} onClick={() => setPreviewItem(null)}><button className="lightbox-close" onClick={() => setPreviewItem(null)} aria-label="إغلاق الصورة"><Icon name="close"/></button><div onClick={(event) => event.stopPropagation()}><Image loader={passthroughImageLoader} unoptimized src={previewItem.image_full || previewItem.image || ""} alt={previewItem.name} width={1200} height={1200}/><p>{previewItem.name}</p></div></div> : null}
    </div>
  );
}

function ProductImage({ item, onPreview }: { item: OrderItem; onPreview: () => void }) {
  if (!item.image) return <div className="product-thumb is-placeholder" aria-label="لا توجد صورة للمنتج">{item.name.slice(0, 1)}</div>;
  return <button type="button" className="product-thumb product-image-button" onClick={onPreview} aria-label={`تكبير صورة ${item.name}`}><Image loader={passthroughImageLoader} unoptimized src={item.image} alt="" width={72} height={72}/></button>;
}

function passthroughImageLoader({ src }: ImageLoaderProps) { return src; }

function Info({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) { return <div className="info-block"><span>{label}</span><strong className={multiline ? "multiline-value" : undefined}>{value}</strong></div>; }
function Status({ status, label }: { status: OrderStatus; label: string }) { return <span className={`status status-${status}`}><i />{label}</span>; }
function stripHtml(value: string) { return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "); }
function formatFullDate(value: string) { return new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "short" }).format(new Date(value)); }
function formatActivityDate(value: string) { return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function withDemoActivity(order: Order, content: string): Order { return { ...order, activity: [{ id: Date.now(), content, created_at: new Date().toISOString() }, ...(order.activity || [])] }; }
