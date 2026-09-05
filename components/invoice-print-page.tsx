"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrder, getStoredToken, isDemoMode } from "@/lib/api";
import { demoOrders } from "@/lib/demo-data";
import type { Order } from "@/lib/types";
import { Icon } from "./icons";

export function InvoicePrintPage({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(isDemoMode ? demoOrders.find((item) => item.id === orderId) || null : null);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isDemoMode) return;
    if (!getStoredToken()) {
      router.replace("/");
      return;
    }
    getOrder(orderId)
      .then(setOrder)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "تعذر تحميل الفاتورة"))
      .finally(() => setLoading(false));
  }, [orderId, router]);

  if (loading) return <main className="order-state"><span className="loader"/><p>جاري تجهيز الفاتورة…</p></main>;
  if (!order) return <main className="order-state"><Icon name="print"/><h1>الفاتورة غير متاحة</h1><p>{error || "الطلب غير موجود أو مش متوزع على حسابك."}</p><button className="secondary" onClick={() => router.back()}>رجوع</button></main>;

  const totals = order.totals?.length ? order.totals : [{ label: "الإجمالي", value: order.total }];

  return (
    <main className="invoice-screen">
      <nav className="invoice-toolbar" aria-label="إجراءات الفاتورة">
        <button className="secondary" onClick={() => router.back()}>الرجوع للطلب</button>
        <button className="primary" onClick={() => window.print()}><Icon name="print"/>طباعة الفاتورة</button>
      </nav>

      <article className="invoice-sheet" aria-labelledby="invoice-title" dir="ltr">
        <header className="invoice-header">
          <Image className="invoice-logo" src="/shams-stores-logo.png" alt="Shams Stores" width={2172} height={724} priority />
          <div className="invoice-brand-copy">
            {order.store?.address && <span>{order.store.address}</span>}
            {order.store?.phone && <strong dir="ltr">{order.store.phone}</strong>}
            {order.store?.email && <span>{order.store.email}</span>}
            {order.store?.url && <span>{new URL(order.store.url).hostname}</span>}
          </div>
        </header>

        <section className="invoice-heading">
          <h1 id="invoice-title">Invoice / <span lang="ar" dir="rtl">فاتورة</span></h1>
          <span className={`payment-stamp ${order.paid ? "is-paid" : "is-unpaid"}`}>
            <strong>{order.paid ? "مدفوع" : "غير مدفوع"}</strong>
            <small>{order.paid ? "PAID" : "UNPAID"}</small>
          </span>
        </section>

        <section className="invoice-details">
          <dl className="invoice-facts">
            <Fact label="Order Date:" value={formatDate(order.created_at)} />
            <Fact label="Order Number:" value={order.number} />
            <Fact label="Shipping Method:" value={order.shipping_method || "—"} />
            <Fact label="Payment Method:" value={order.payment_method || "—"} />
          </dl>
          <Address title="Bill to:" customer={order.customer} lines={order.billing_address_lines} value={order.billing_address || order.address || order.customer} />
          <Address title="Ship to:" customer={order.customer} lines={order.shipping_address_lines} value={order.shipping_address || order.address || order.customer} />
        </section>

        <section className="invoice-items" aria-label="منتجات الفاتورة">
          <table>
            <thead><tr><th>Description / المنتج</th><th>Qty / الكمية</th><th>Total / الإجمالي</th></tr></thead>
            <tbody>{order.items?.length ? order.items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>{stripHtml(item.total)}</td></tr>) : <tr><td colSpan={3}>لا توجد منتجات متاحة في بيانات الطلب</td></tr>}</tbody>
          </table>
        </section>

        <footer className="invoice-summary">
          <dl>{totals.map((total, index) => <div className={index === totals.length - 1 ? "invoice-grand-total" : ""} key={`${total.label}-${index}`}><dt>{total.label}</dt><dd>{stripHtml(total.value)}</dd></div>)}</dl>
          <p>Thank you for shopping at Shams Stores <span lang="ar" dir="rtl">— شكرًا لتسوقك من شمس ستورز</span></p>
        </footer>
      </article>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Address({ title, customer, lines, value }: { title: string; customer: string; lines?: string[]; value: string }) {
  const normalized = lines?.filter(Boolean).join("\n") || normalizeAddress(value, customer);
  return <div className="invoice-address"><h2>{title}</h2><p>{normalized || "—"}</p></div>;
}
function normalizeAddress(value: string, customer: string) {
  const cleaned = value.trim();
  if (!customer || !cleaned.toLocaleLowerCase().startsWith(customer.toLocaleLowerCase())) return cleaned;
  const remainder = cleaned.slice(customer.length).trim();
  return [customer, remainder].filter(Boolean).join("\n");
}
function stripHtml(value: string) { return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&#36;/g, "$"); }
function formatDate(value: string) { return value.slice(0, 19).replace("T", " "); }
