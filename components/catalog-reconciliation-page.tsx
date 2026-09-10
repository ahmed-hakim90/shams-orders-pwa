"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredToken, getMe, getReconciliationItems, getReconciliationSummary, getStoredToken, isAuthenticationError, isDemoMode, wpAdminUrl } from "@/lib/api";
import { demoReconciliationItems, demoReconciliationSummary, demoUser } from "@/lib/demo-data";
import type { ReconciliationItem, ReconciliationStatus, ReconciliationSummary, User } from "@/lib/types";
import { Icon } from "./icons";
import { BrandLogo } from "./brand-logo";
import { ServiceWorker } from "./service-worker";
import { formatStoreDateTime } from "@/lib/store-date";

type Tab = "all" | ReconciliationStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "matched", label: "موجود ومربوط" },
  { value: "needs_create", label: "محتاج إنشاء" },
  { value: "needs_review", label: "محتاج مراجعة" },
  { value: "website_only", label: "على الموقع فقط" },
  { value: "sku_issue", label: "مشكلات SKU" },
];

const statusBadgeLabel: Record<ReconciliationStatus, string> = {
  matched: "موجود ومربوط",
  needs_create: "محتاج إنشاء",
  needs_review: "محتاج مراجعة",
  website_only: "على الموقع فقط",
  sku_issue: "مشكلة SKU",
};

const perPage = 20;

export function CatalogReconciliationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(isDemoMode ? demoUser : null);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(isDemoMode ? demoReconciliationSummary : null);
  const [items, setItems] = useState<ReconciliationItem[]>(isDemoMode ? demoReconciliationItems : []);
  const [status, setStatus] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(!isDemoMode);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [detailItem, setDetailItem] = useState<ReconciliationItem | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const statusMounted = useRef(false);

  useEffect(() => {
    if (isDemoMode) return;
    if (!getStoredToken()) { router.replace("/"); return; }
    getMe()
      .then(async (nextUser) => {
        if (nextUser.role !== "admin") { router.replace("/"); return; }
        setUser(nextUser);
        await loadPage("all", 1, "initial");
      })
      .catch((cause) => {
        if (isAuthenticationError(cause)) { clearStoredToken(); router.replace("/"); return; }
        setError(cause instanceof Error ? cause.message : "تعذر تحميل بيانات المطابقة");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isDemoMode || !user) return;
    if (!statusMounted.current) { statusMounted.current = true; return; }
    void loadPage(status, 1, "filter");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!detailItem) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailItem(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailItem]);

  async function loadPage(targetStatus: Tab, targetPage: number, mode: "initial" | "filter" | "refresh" | "more") {
    if (mode === "initial" || mode === "filter") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    if (mode === "more") setLoadingMore(true);
    setError("");
    try {
      const [summaryResult, itemsResult] = await Promise.all([
        getReconciliationSummary(),
        getReconciliationItems({ status: targetStatus, page: targetPage, perPage }),
      ]);
      setSummary(summaryResult);
      setItems((current) => mode === "more" ? [...current, ...itemsResult.items] : itemsResult.items);
      setPage(itemsResult.page); setTotalItems(itemsResult.total); setTotalPages(itemsResult.totalPages);
    } catch (cause) {
      if (isAuthenticationError(cause)) { clearStoredToken(); router.replace("/"); return; }
      setError(cause instanceof Error ? cause.message : "تعذر تحميل بيانات المطابقة");
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }

  function refresh() { void loadPage(status, 1, "refresh"); }
  function loadMore() { if (!loadingMore && page < totalPages) void loadPage(status, page + 1, "more"); }

  const displayItems = useMemo(() => {
    const source = isDemoMode ? demoReconciliationItems.filter((item) => status === "all" || item.status === status) : items;
    const needle = query.trim().toLocaleLowerCase("ar");
    if (!needle) return source;
    return source.filter((item) => [item.sku, item.local_name, item.wc_name].some((value) => value?.toLocaleLowerCase("ar").includes(needle)));
  }, [items, query, status]);

  const displayedTotal = isDemoMode ? displayItems.length : totalItems;

  async function copySku(sku: string) {
    if (!sku) return;
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      window.setTimeout(() => setCopiedSku((current) => current === sku ? null : current), 1600);
    } catch { /* Clipboard access can be blocked by the browser; the SKU stays visible for manual copy. */ }
  }

  if (loading) return <main className="order-state"><span className="loader" /><p>جاري تحميل بيانات المطابقة…</p></main>;
  if (!isDemoMode && (!user || user.role !== "admin")) return <main className="order-state"><Icon name="grid" /><h1>غير متاح</h1><p>{error || "شاشة مطابقة الكتالوج متاحة لمديري النظام فقط."}</p><button className="secondary" onClick={() => router.push("/")}>الرجوع للأوردرات</button></main>;

  return (
    <div className="order-page-shell">
      <ServiceWorker />
      <header className="order-topbar">
        <button className="back-button" onClick={() => router.push("/")}><Icon name="chevron" />كل الأوردرات</button>
        <div className="compact-brand"><BrandLogo compact /></div>
        <div className="order-user"><span>{(user?.name || "أ").slice(0, 1)}</span><div><strong>{user?.name}</strong><small>مدير النظام</small></div></div>
      </header>

      <main className="order-content">
        <section className="order-titlebar">
          <div><p>إدارة الكتالوج</p><h1>مطابقة الكتالوج</h1><small>مقارنة كتالوج السيستم المحلي مع WooCommerce — شاشة مراجعة فقط، من غير أي تعديل مباشر على المنتجات.</small></div>
          <div className="title-actions"><button className="refresh" disabled={refreshing} onClick={refresh}>{refreshing ? "جاري التحديث…" : "تحديث البيانات"}</button></div>
        </section>

        {error && <div className="alert" role="alert">{error}<button onClick={() => setError("")} aria-label="إغلاق"><Icon name="close" /></button></div>}

        <section className="recon-stats" aria-label="ملخص المطابقة">
          <SummaryStat label="إجمالي منتجات السيستم المحلي" value={summary?.local_total ?? 0} icon="store" tone="orange" />
          <SummaryStat label="إجمالي منتجات الموقع" value={summary?.website_total ?? 0} icon="grid" tone="blue" />
          <SummaryStat label="موجود ومربوط" value={summary?.matched ?? 0} icon="orders" tone="green" />
          <SummaryStat label="محتاج إنشاء" value={summary?.needs_create ?? 0} icon="orders" tone="blue" />
          <SummaryStat label="محتاج ربط أو مراجعة" value={summary?.needs_review ?? 0} icon="bell" tone="amber" />
          <SummaryStat label="موجود على الموقع فقط" value={summary?.website_only ?? 0} icon="store" tone="violet" />
          <SummaryStat label="مشكلات SKU" value={summary?.sku_issues ?? 0} icon="close" tone="red" />
          <SummaryStat label="آخر مقارنة" text={summary?.last_run_at ? formatStoreDateTime(summary.last_run_at, "medium") : "لسه مفيش مقارنة"} icon="bell" tone="orange" />
        </section>

        <section className="orders-panel recon-table">
          <div className="toolbar">
            <label className="search"><Icon name="search" /><span className="sr-only">البحث في نتائج المطابقة</span><input type="search" inputMode="search" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو SKU" aria-describedby="recon-results-count" />{query && <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث"><Icon name="close" /></button>}</label>
            <div className="filters" role="tablist" aria-label="فلترة حسب حالة المطابقة">{tabs.map((tab) => <button key={tab.value} role="tab" aria-selected={status === tab.value} onClick={() => setStatus(tab.value)}>{tab.label}</button>)}</div>
          </div>
          <div className="results-summary" id="recon-results-count" aria-live="polite"><strong>{displayedTotal.toLocaleString("ar-EG")}</strong> نتيجة مطابقة{query && <span>للبحث عن «{query.trim()}»</span>}</div>

          {displayItems.length === 0 ? (
            <div className="state-box"><Icon name="search" /><strong>مفيش نتائج مطابقة</strong><p className="recon-empty-hint">{isDemoMode ? "جرّب تبويب أو بحث مختلف." : "شغّل عميل الاكتشاف بايثون وارفع تقرير جديد، أو راجع الفلاتر."}</p></div>
          ) : (
            <>
              <div className="recon-head" role="presentation"><span>المنتج المحلي</span><span>المخزون المحلي</span><span>السعر المحلي</span><span>منتج WooCommerce</span><span>الفاريشن</span><span>حالة الموقع</span><span>حالة المطابقة</span><span>آخر فحص</span><span /></div>
              {displayItems.map((item) => (
                <div className="recon-row" key={item.id}>
                  <div data-label="المنتج المحلي"><b>{item.local_name || (item.sku ? "بدون اسم مسجّل" : "بدون SKU")}</b><small dir="ltr">{item.sku || "—"}</small></div>
                  <span data-label="المخزون المحلي">{item.local_stock ?? "—"}</span>
                  <span data-label="السعر المحلي">{item.local_price != null ? item.local_price.toLocaleString("ar-EG") : "—"}</span>
                  <div data-label="منتج WooCommerce"><b>{item.wc_name || "—"}</b><small>{item.wc_product_id ? `#${item.wc_product_id}` : "—"}</small></div>
                  <span data-label="الفاريشن" className={item.wc_variation_id ? "" : "muted"}>{item.wc_variation_id ? `#${item.wc_variation_id}` : "—"}</span>
                  <span data-label="حالة الموقع" className="muted">{item.website_status || "—"}</span>
                  <span data-label="حالة المطابقة"><span className={`recon-badge recon-badge-${item.status}`}><i />{statusBadgeLabel[item.status]}</span></span>
                  <span data-label="آخر فحص">{item.last_checked_at ? formatStoreDateTime(item.last_checked_at, "short") : "—"}</span>
                  <div className="recon-actions">
                    <button type="button" className={copiedSku === item.sku ? "is-copied" : ""} disabled={!item.sku} title="نسخ SKU" aria-label={`نسخ SKU ${item.sku}`} onClick={() => copySku(item.sku)}><Icon name="copy" /></button>
                    {item.wc_product_id && wpAdminUrl ? (
                      <a href={`${wpAdminUrl}/post.php?post=${item.wc_product_id}&action=edit`} target="_blank" rel="noreferrer" title="فتح في WooCommerce" aria-label="فتح المنتج في WooCommerce"><Icon name="external" /></a>
                    ) : (
                      <span aria-disabled="true" title={isDemoMode ? "غير متاح في النسخة التجريبية" : "لا يوجد منتج مرتبط بعد"}><Icon name="external" /></span>
                    )}
                    <button type="button" title="تفاصيل المطابقة" aria-label="عرض تفاصيل المطابقة" onClick={() => setDetailItem(item)}><Icon name="eye" /></button>
                  </div>
                </div>
              ))}
              {!isDemoMode && page < totalPages && <div className="load-more"><span>تم عرض {items.length.toLocaleString("ar-EG")} من {totalItems.toLocaleString("ar-EG")}</span><button className="secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "جاري التحميل…" : "تحميل نتائج إضافية"}</button></div>}
            </>
          )}
        </section>
      </main>

      {detailItem && <ReconciliationDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}

function SummaryStat({ label, value, text, icon, tone }: { label: string; value?: number; text?: string; icon: string; tone: string }) {
  return <article className={`stat ${text ? "is-meta" : ""}`}><span className={`stat-icon ${tone}`}><Icon name={icon} /></span><div><small>{label}</small><strong>{text ?? (value ?? 0).toLocaleString("ar-EG")}</strong></div></article>;
}

function ReconciliationDetailDialog({ item, onClose }: { item: ReconciliationItem; onClose: () => void }) {
  return (
    <div className="recon-dialog-layer" role="dialog" aria-modal="true" aria-labelledby="recon-dialog-title">
      <button className="recon-dialog-backdrop" aria-label="إغلاق" onClick={onClose} />
      <div className="recon-dialog">
        <header>
          <div><h2 id="recon-dialog-title">تفاصيل المطابقة</h2><p dir="ltr">{item.sku || "بدون SKU"}</p></div>
          <button className="recon-dialog-close" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button>
        </header>
        <dl>
          <div><dt>المنتج المحلي</dt><dd>{item.local_name || "غير مسجل"}</dd></div>
          <div><dt>المخزون المحلي</dt><dd>{item.local_stock ?? "غير متاح"}</dd></div>
          <div><dt>السعر المحلي</dt><dd>{item.local_price != null ? item.local_price.toLocaleString("ar-EG") : "غير متاح"}</dd></div>
          <div><dt>منتج WooCommerce</dt><dd>{item.wc_name || "غير موجود"}{item.wc_product_id ? ` (#${item.wc_product_id})` : ""}</dd></div>
          <div><dt>الفاريشن</dt><dd>{item.wc_variation_id ? `#${item.wc_variation_id}` : "منتج بسيط أو غير موجود"}</dd></div>
          <div><dt>حالة الموقع</dt><dd>{item.website_status || "غير متاح"}</dd></div>
          <div><dt>حالة المطابقة</dt><dd><span className={`recon-badge recon-badge-${item.status}`}><i />{statusBadgeLabel[item.status]}</span></dd></div>
          <div><dt>آخر فحص</dt><dd>{item.last_checked_at ? formatStoreDateTime(item.last_checked_at, "full") : "غير متاح"}</dd></div>
        </dl>
        {item.details && <p className="recon-dialog-notice">{item.details}</p>}
        <div className="recon-dialog-actions">
          <button type="button" disabled title="التفعيل غير متاح بعد">إنشاء مسودة منتج</button>
          <button type="button" disabled title="التفعيل غير متاح بعد">ربط بمنتج موجود</button>
          <button type="button" disabled title="التفعيل غير متاح بعد">تجاهل</button>
        </div>
        <p className="field-notice">الإجراءات دي معطّلة لحد ما يتم تفعيلها بعد اختبار كامل على بيئة Staging. محدش هيعدّل أي منتج أو مخزون من الشاشة دي دلوقتي.</p>
      </div>
    </div>
  );
}
