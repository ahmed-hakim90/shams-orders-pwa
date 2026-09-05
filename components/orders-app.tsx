"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkAssignOrders, clearStoredToken, getBranches, getMe, getOrders, getStoredToken, getStoredUser, isAuthenticationError, isDemoMode, login } from "@/lib/api";
import { demoBranches, demoOrders, demoUser } from "@/lib/demo-data";
import type { Branch, Order, OrderStatus, User } from "@/lib/types";
import { Icon } from "./icons";
import { BrandLogo } from "./brand-logo";
import { ServiceWorker } from "./service-worker";
import { clearDashboardSnapshot, getDashboardSnapshot, setDashboardSnapshot } from "@/lib/dashboard-cache";
import { clearOrderSnapshots } from "@/lib/order-cache";

const statusOptions: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "الكل" }, { value: "processing", label: "جاري التنفيذ" },
  { value: "on-hold", label: "قيد الانتظار" }, { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];
type NotificationEvent = { id: string; orderId: number; orderNumber: string; title: string; message: string; createdAt: string };

export function OrdersApp() {
  const router = useRouter();
  const [initialSnapshot] = useState(() => isDemoMode ? null : getDashboardSnapshot());
  const [view, setView] = useState<"overview" | "orders" | "branches">("orders");
  const [user, setUser] = useState<User | null>(isDemoMode ? demoUser : initialSnapshot?.user || null);
  const [sessionReady, setSessionReady] = useState(isDemoMode || Boolean(initialSnapshot));
  const [orders, setOrders] = useState<Order[]>(isDemoMode ? demoOrders : initialSnapshot?.orders || []);
  const [branches, setBranches] = useState<Branch[]>(isDemoMode ? demoBranches : initialSnapshot?.branches || []);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBranchId, setBulkBranchId] = useState<number | "">("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(!isDemoMode && !initialSnapshot);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationEvent[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toast, setToast] = useState<NotificationEvent | null>(null);
  const knownOrders = useRef<Map<number, Order>>(new Map((isDemoMode ? demoOrders : initialSnapshot?.orders || []).map((order) => [order.id, order])));

  useEffect(() => {
    if (isDemoMode) return;
    const token = getStoredToken();
    const storedUser = getStoredUser();
    queueMicrotask(() => {
      if (storedUser) setUser(storedUser);
      setSessionReady(true);
    });
    if (!token) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    getMe()
      .then(async (nextUser) => {
        const [nextOrders, nextBranches] = await Promise.all([getOrders(), nextUser.role === "admin" ? getBranches() : Promise.resolve([])]);
        knownOrders.current = new Map(nextOrders.map((order) => [order.id, order]));
        setUser(nextUser); setOrders(nextOrders); setBranches(nextBranches);
      })
      .catch((cause) => {
        if (isAuthenticationError(cause)) { clearStoredToken(); clearDashboardSnapshot(); clearOrderSnapshots(); setUser(null); }
        else setError(cause instanceof Error ? cause.message : "تعذر تحميل البيانات");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => setNotificationsEnabled("Notification" in window && Notification.permission === "granted" && localStorage.getItem("shams_orders_notifications") === "on"));
  }, []);

  useEffect(() => {
    if (!isDemoMode && user) setDashboardSnapshot({ user, orders, branches });
  }, [branches, orders, user]);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(notificationStorageKey(user.id));
    queueMicrotask(() => {
      try { setNotificationItems(saved ? JSON.parse(saved) : []); } catch { setNotificationItems([]); }
      setUnreadNotifications(0);
    });
  }, [user]);

  useEffect(() => {
    if (!user || isDemoMode) return;
    const poll = async () => {
      try {
        const nextOrders = await getOrders();
        const events = detectOrderEvents(knownOrders.current, nextOrders, user);
        knownOrders.current = new Map(nextOrders.map((order) => [order.id, order]));
        setOrders(nextOrders);
        publishEvents(events);
      } catch { /* Keep the last known list during a temporary network failure. */ }
    };
    const timer = window.setInterval(poll, 15_000);
    return () => window.clearInterval(timer);
    // publishEvents intentionally shares this polling lifecycle's current user and permission state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsEnabled, user]);

  function publishEvents(events: NotificationEvent[]) {
    if (!events.length || !user) return;
    setNotificationItems((current) => {
      const next = [...events, ...current].slice(0, 40);
      localStorage.setItem(notificationStorageKey(user.id), JSON.stringify(next));
      return next;
    });
    setUnreadNotifications((current) => current + events.length);
    setToast(events[0]);
    if (notificationsEnabled) {
      playAlertSound();
      events.slice(0, 3).forEach((item) => { void showSystemNotification(item).catch(() => undefined); });
    }
  }

  function toggleNotificationCenter() {
    setNotificationOpen((current) => !current);
    setUnreadNotifications(0);
  }

  function openNotification(item: NotificationEvent) {
    setNotificationOpen(false); setToast(null); router.push(`/orders/${item.orderId}`);
  }

  function clearNotifications() {
    if (!user) return;
    localStorage.removeItem(notificationStorageKey(user.id));
    setNotificationItems([]); setUnreadNotifications(0); setNotificationOpen(false);
  }

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesStatus = status === "all" || order.status === status;
    const needle = query.trim().toLocaleLowerCase("ar");
    return matchesStatus && (!needle || `${order.number} ${order.customer} ${order.phone}`.toLocaleLowerCase("ar").includes(needle));
  }), [orders, query, status]);

  const counts = useMemo(() => ({
    total: orders.length,
    unassigned: orders.filter((order) => !order.branch).length,
    active: orders.filter((order) => ["processing", "on-hold"].includes(order.status)).length,
    completed: orders.filter((order) => order.status === "completed").length,
  }), [orders]);

  const branchSummaries = useMemo(() => branches.map((branch) => {
    const assigned = orders.filter((order) => order.branch?.id === branch.id);
    return {
      ...branch,
      total: assigned.length,
      active: assigned.filter((order) => ["processing", "on-hold"].includes(order.status)).length,
      completed: assigned.filter((order) => order.status === "completed").length,
    };
  }), [branches, orders]);

  async function handleLogin(username: string, password: string, remember: boolean) {
    setLoading(true); setError("");
    try {
      const nextUser = await login(username, password, remember);
      const [nextOrders, nextBranches] = await Promise.all([getOrders(), nextUser.role === "admin" ? getBranches() : Promise.resolve([])]);
      knownOrders.current = new Map(nextOrders.map((order) => [order.id, order]));
      setUser(nextUser); setOrders(nextOrders); setBranches(nextBranches);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تسجيل الدخول"); }
    finally { setLoading(false); }
  }

  function logout() { clearStoredToken(); clearDashboardSnapshot(); clearOrderSnapshots(); setUser(null); setOrders([]); setNotificationItems([]); setNotificationOpen(false); }

  async function refreshData() {
    if (isDemoMode || refreshing) return;
    setRefreshing(true); setError("");
    try {
      const [nextOrders, nextBranches] = await Promise.all([getOrders(), user?.role === "admin" ? getBranches() : Promise.resolve([])]);
      const events = user ? detectOrderEvents(knownOrders.current, nextOrders, user) : [];
      knownOrders.current = new Map(nextOrders.map((order) => [order.id, order]));
      setOrders(nextOrders); setBranches(nextBranches);
      publishEvents(events);
    } catch (cause) {
      if (isAuthenticationError(cause)) { clearStoredToken(); clearDashboardSnapshot(); clearOrderSnapshots(); setUser(null); }
      else setError(cause instanceof Error ? cause.message : "تعذر تحديث البيانات");
    } finally { setRefreshing(false); }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { setError("المتصفح ده مش بيدعم الإشعارات"); return; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setError("اسمح بالإشعارات من إعدادات المتصفح عشان التنبيه يشتغل"); return; }
    localStorage.setItem("shams_orders_notifications", "on");
    setNotificationsEnabled(true);
    playAlertSound();
  }

  async function handleBulkAssign() {
    if (!bulkBranchId || selectedIds.size === 0) return;
    setBulkSaving(true); setError("");
    try {
      const ids = Array.from(selectedIds);
      const branch = branches.find((item) => item.id === bulkBranchId) || null;
      const updated = isDemoMode
        ? orders.filter((order) => selectedIds.has(order.id)).map((order) => ({ ...order, branch }))
        : await bulkAssignOrders(ids, bulkBranchId);
      const updates = new Map(updated.map((order) => [order.id, order]));
      setOrders((current) => current.map((order) => updates.get(order.id) || order));
      setSelectedIds(new Set()); setBulkBranchId("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر توزيع الأوردرات"); }
    finally { setBulkSaving(false); }
  }

  if (!sessionReady) return <main className="order-state"><span className="loader"/><p>جاري استعادة جلسة الدخول…</p></main>;
  if (!user) return <><ServiceWorker /><Login loading={loading} error={error} onLogin={handleLogin} /></>;

  return (
    <div className="app-shell">
      <ServiceWorker />
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <BrandLogo />
        <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة"><Icon name="close" /></button>
        <nav aria-label="القائمة الرئيسية">
          <button className={`nav-item ${view === "overview" ? "is-active" : ""}`} aria-current={view === "overview" ? "page" : undefined} onClick={() => { setView("overview"); setMenuOpen(false); }}><Icon name="grid" /><span>نظرة عامة</span></button>
          <button className={`nav-item ${view === "orders" ? "is-active" : ""}`} aria-current={view === "orders" ? "page" : undefined} onClick={() => { setView("orders"); setMenuOpen(false); }}><Icon name="orders" /><span>الأوردرات</span><b>{counts.total}</b></button>
          {user.role === "admin" && <button className={`nav-item ${view === "branches" ? "is-active" : ""}`} aria-current={view === "branches" ? "page" : undefined} onClick={() => { setView("branches"); setMenuOpen(false); }}><Icon name="store" /><span>الفروع</span><b>{branches.length}</b></button>}
        </nav>
        <div className="profile"><span>{user.name.slice(0, 1)}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "مدير النظام" : "مسؤول الفرع"}</small></div><button onClick={logout} aria-label="تسجيل الخروج"><Icon name="logout" /></button></div>
      </aside>
      {menuOpen && <button className="sidebar-backdrop" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)} />}

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة"><span/><span/><span/></button>
          <div><p>مساء الخير، {user.name.split(" ")[0]} 👋</p><small>تابع أوردراتك وحدّث حالتها بسهولة</small></div>
          <div className="top-actions"><span className={`connection ${isDemoMode ? "demo" : ""}`}>{isDemoMode ? "نسخة تجريبية" : "متصل بـWooCommerce"}</span><button className={`notification-button ${notificationOpen ? "is-open" : ""}`} onClick={toggleNotificationCenter} aria-label="فتح الإشعارات" aria-expanded={notificationOpen}><Icon name="bell" />{unreadNotifications > 0 && <b>{unreadNotifications > 9 ? "+9" : unreadNotifications.toLocaleString("ar-EG")}</b>}</button>{notificationsEnabled ? <span className="notification-label is-enabled">الصوت مفعّل</span> : <button className="notification-permission" onClick={enableNotifications}>تفعيل الصوت</button>}{notificationOpen && <NotificationCenter items={notificationItems} onOpen={openNotification} onClear={clearNotifications} />}</div>
        </header>

        {toast && <div className="order-toast" role="alert" aria-live="assertive"><button className="toast-open" type="button" onClick={() => openNotification(toast)} aria-label={`${toast.title}: ${toast.message}`}><span><Icon name="bell" /></span><span><strong>{toast.title}</strong><small>{toast.message}</small></span><Icon name="chevron" /></button><button className="toast-close" type="button" onClick={() => setToast(null)} aria-label="إغلاق الإشعار"><Icon name="close" /></button></div>}

        <div className="content">
          <section className="page-heading"><div><p>إدارة التشغيل</p><h1>{view === "overview" ? "نظرة عامة" : view === "branches" ? "الفروع" : "الأوردرات"}</h1></div><button className="refresh" disabled={refreshing} onClick={refreshData}>{refreshing ? "جاري التحديث…" : "تحديث البيانات"}</button></section>
          {error && <div className="alert" role="alert">{error}<button onClick={() => setError("")} aria-label="إغلاق"><Icon name="close" /></button></div>}
          {view !== "branches" && <section className="stats" aria-label="ملخص الأوردرات">
            <Stat label="كل الأوردرات" value={counts.total} icon="orders" tone="orange" />
            <Stat label="بدون فرع" value={counts.unassigned} icon="store" tone="red" />
            <Stat label="قيد التنفيذ" value={counts.active} icon="grid" tone="blue" />
            <Stat label="مكتمل" value={counts.completed} icon="orders" tone="green" />
          </section>}

          {view === "overview" && <Overview orders={orders} counts={counts} onOpenOrders={() => setView("orders")} onOpenOrder={(order) => router.push(`/orders/${order.id}`)} />}

          {view === "branches" && user.role === "admin" && <BranchesPage branches={branchSummaries} />}

          {view === "orders" && <section className="orders-panel">
            <div className="toolbar">
              <div className="filters" role="tablist" aria-label="فلترة حسب الحالة">{statusOptions.map((option) => <button key={option.value} role="tab" aria-selected={status === option.value} onClick={() => setStatus(option.value)}>{option.label}</button>)}</div>
              <label className="search"><Icon name="search" /><span className="sr-only">ابحث</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="رقم الأوردر، العميل أو الهاتف" /></label>
            </div>
            {user.role === "admin" && selectedIds.size > 0 && <div className="bulk-bar" role="region" aria-label="توزيع الأوردرات المحددة"><strong>تم اختيار {selectedIds.size.toLocaleString("ar-EG")} أوردر</strong><label><span className="sr-only">اختار الفرع</span><select value={bulkBranchId} onChange={(event) => setBulkBranchId(event.target.value ? Number(event.target.value) : "")}><option value="">اختار الفرع</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button className="primary" disabled={!bulkBranchId || bulkSaving} onClick={handleBulkAssign}>{bulkSaving ? "جاري التوزيع…" : "توزيع الأوردرات"}</button><button className="clear-selection" onClick={() => setSelectedIds(new Set())}>إلغاء التحديد</button></div>}
            {loading ? <div className="state-box"><span className="loader"/>جاري تحميل الأوردرات…</div> : filtered.length === 0 ? <div className="state-box"><Icon name="search"/><strong>مفيش أوردرات مطابقة</strong><small>جرّب تغير الفلتر أو كلمة البحث.</small></div> : <OrderList orders={filtered} isAdmin={user.role === "admin"} selectedIds={selectedIds} onSelect={(order) => router.push(`/orders/${order.id}`)} onToggle={(id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onToggleAll={() => setSelectedIds((current) => filtered.every((order) => current.has(order.id)) ? new Set() : new Set(filtered.map((order) => order.id)))} />}
          </section>}
        </div>
      </main>
    </div>
  );
}

function NotificationCenter({ items, onOpen, onClear }: { items: NotificationEvent[]; onOpen: (item: NotificationEvent) => void; onClear: () => void }) {
  return <section className="notification-center" aria-label="آخر الإشعارات"><header><div><strong>الإشعارات</strong><small>آخر تحديثات الأوردرات</small></div>{items.length > 0 && <button onClick={onClear}>مسح الكل</button>}</header>{items.length ? <div className="notification-feed">{items.map((item) => <button key={item.id} onClick={() => onOpen(item)}><span className="notification-feed-icon"><Icon name="bell"/></span><span><strong>{item.title}</strong><small>{item.message}</small><time dateTime={item.createdAt}>{formatNotificationDate(item.createdAt)}</time></span></button>)}</div> : <div className="notification-empty"><Icon name="bell"/><strong>مفيش إشعارات جديدة</strong><small>أي أوردر جديد أو تعديل هيظهر هنا.</small></div>}</section>;
}

function Login({ loading, error, onLogin }: { loading: boolean; error: string; onLogin: (username: string, password: string, remember: boolean) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); onLogin(String(data.get("username")), String(data.get("password")), data.get("remember") === "on");
  }
  return <main className="login-page"><section className="login-card"><BrandLogo/><div className="login-intro"><p className="eyebrow">منصة تشغيل الفروع</p><h1>أهلًا بيك</h1><p>سجّل دخولك لمتابعة الأوردرات الموزعة عليك.</p></div>{error && <div className="alert" role="alert">{error}</div>}<form onSubmit={submit}><label>اسم المستخدم<input name="username" autoComplete="username" inputMode="text" required /></label><label>كلمة المرور<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword}><Icon name={showPassword ? "eye-off" : "eye"} /></button></span></label><label className="remember-option"><input name="remember" type="checkbox" /><span>تذكرني على الجهاز ده</span></label><button className="primary" disabled={loading}>{loading ? "جاري الدخول…" : "تسجيل الدخول"}</button></form><small className="login-help">بيانات الدخول هي نفس حساب مستخدم الفرع في WordPress.</small></section></main>;
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  return <article className="stat"><span className={`stat-icon ${tone}`}><Icon name={icon}/></span><div><small>{label}</small><strong>{value.toLocaleString("ar-EG")}</strong></div></article>;
}

function Overview({ orders, counts, onOpenOrders, onOpenOrder }: { orders: Order[]; counts: { total: number; unassigned: number; active: number; completed: number }; onOpenOrders: () => void; onOpenOrder: (order: Order) => void }) {
  const recent = orders.slice(0, 5);
  return <div className="overview-grid"><section className="overview-focus"><div><p>أولوية التشغيل</p><h2>{counts.unassigned ? `${counts.unassigned.toLocaleString("ar-EG")} أوردر محتاج توزيع` : "كل الأوردرات متوزعة"}</h2><span>{counts.active.toLocaleString("ar-EG")} أوردر قيد التنفيذ حاليًا</span></div><button className="primary" onClick={onOpenOrders}>فتح الأوردرات</button></section><section className="overview-recent"><header><div><h2>أحدث الأوردرات</h2><p>آخر الطلبات اللي وصلت للنظام</p></div><button onClick={onOpenOrders}>عرض الكل</button></header>{recent.length ? <div>{recent.map((order) => <button key={order.id} onClick={() => onOpenOrder(order)}><span><strong>#{order.number}</strong><small>{order.customer}</small></span><Status status={order.status} label={order.status_label}/><b>{stripHtml(order.total)}</b></button>)}</div> : <div className="state-box"><Icon name="orders"/><strong>لسه مفيش أوردرات</strong></div>}</section></div>;
}

function BranchesPage({ branches }: { branches: Array<Branch & { total: number; active: number; completed: number }> }) {
  return <section className="branches-panel"><header><div><h2>فريق تشغيل الفروع</h2><p>ملخص الأوردرات الظاهرة والموزعة على كل حساب فرع</p></div><span>{branches.length.toLocaleString("ar-EG")} فروع</span></header>{branches.length ? <div className="branch-grid">{branches.map((branch) => <article key={branch.id}><span className="branch-avatar">{branch.name.slice(0, 1)}</span><div className="branch-name"><h3>{branch.name}</h3><p>مستخدم فرع نشط</p></div><dl><div><dt>كل الأوردرات</dt><dd>{branch.total.toLocaleString("ar-EG")}</dd></div><div><dt>قيد التنفيذ</dt><dd>{branch.active.toLocaleString("ar-EG")}</dd></div><div><dt>مكتمل</dt><dd>{branch.completed.toLocaleString("ar-EG")}</dd></div></dl></article>)}</div> : <div className="state-box"><Icon name="store"/><strong>مفيش مستخدمي فروع</strong><small>أنشئ مستخدمًا بدور Shams Branch Operator من WordPress.</small></div>}</section>;
}

function OrderList({ orders, isAdmin, selectedIds, onSelect, onToggle, onToggleAll }: { orders: Order[]; isAdmin: boolean; selectedIds: Set<number>; onSelect: (order: Order) => void; onToggle: (id: number) => void; onToggleAll: () => void }) {
  const allSelected = orders.length > 0 && orders.every((order) => selectedIds.has(order.id));
  return <div className={`order-list ${isAdmin ? "has-selection" : ""}`}><div className="table-head">{isAdmin && <label className="select-order"><input type="checkbox" checked={allSelected} onChange={onToggleAll}/><span className="sr-only">تحديد كل الأوردرات الظاهرة</span></label>}<span>الأوردر</span><span>العميل</span><span>الدفع</span><span>الفرع</span><span>الحالة</span><span>الإجمالي</span><span /></div>{orders.map((order) => <div className={`order-row-shell ${selectedIds.has(order.id) ? "is-selected" : ""}`} key={order.id}>{isAdmin && <label className="select-order"><input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => onToggle(order.id)}/><span className="sr-only">تحديد الأوردر رقم {order.number}</span></label>}<button className="order-row" onClick={() => onSelect(order)}><span className="order-id"><b>#{order.number}</b><small>{formatDate(order.created_at)}</small></span><span className="customer"><b>{order.customer}</b><small dir="ltr">{order.phone}</small></span><span><b>{order.payment_method || "—"}</b><small className={order.paid ? "paid" : "unpaid"}>{order.paid ? "مدفوع" : "غير مدفوع"}</small></span><span className={order.branch ? "" : "muted"}>{order.branch?.name || "لم يتم التوزيع"}</span><span><Status status={order.status} label={order.status_label} /></span><span className="total">{stripHtml(order.total)}</span><span className="row-arrow"><Icon name="chevron" /></span></button></div>)}</div>;
}

function Status({ status, label }: { status: OrderStatus; label: string }) { return <span className={`status status-${status}`}><i />{label}</span>; }

function stripHtml(value: string) { return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "); }
function formatDate(value: string) { return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function formatNotificationDate(value: string) { return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(value)); }
function notificationStorageKey(userId: number) { return `shams_orders_notification_feed_${userId}`; }
function orderSignature(order: Order) { return order.modified_at || [order.status, order.paid, order.total, order.branch?.id || 0, order.customer, order.phone].join("|"); }
function detectOrderEvents(previous: Map<number, Order>, nextOrders: Order[], user: User): NotificationEvent[] {
  const createdAt = new Date().toISOString();
  return nextOrders.flatMap((order) => {
    const old = previous.get(order.id);
    if (!old) return [{ id: `${order.id}-${order.modified_at || createdAt}-new`, orderId: order.id, orderNumber: order.number, title: user.role === "branch" ? `تم توزيع أوردر #${order.number} عليك` : `أوردر جديد #${order.number}`, message: `${order.customer} • ${stripHtml(order.total)}`, createdAt }];
    if (orderSignature(old) === orderSignature(order)) return [];
    let message = `تم تحديث بيانات الأوردر • ${stripHtml(order.total)}`;
    if (old.branch?.id !== order.branch?.id) message = order.branch ? `تم توزيعه على ${order.branch.name}` : "تم إلغاء توزيع الأوردر";
    else if (old.status !== order.status) message = `الحالة الجديدة: ${order.status_label}`;
    else if (old.paid !== order.paid) message = order.paid ? "تم تسجيل الأوردر كمدفوع" : "تم تحديث الأوردر إلى غير مدفوع";
    return [{ id: `${order.id}-${order.modified_at || createdAt}-updated`, orderId: order.id, orderNumber: order.number, title: `تحديث على أوردر #${order.number}`, message, createdAt }];
  }).reverse();
}
async function showSystemNotification(item: NotificationEvent) {
  const registration = await navigator.serviceWorker?.ready;
  const options = { body: item.message, icon: "/shams-icon-192.png", badge: "/shams-icon-192.png", tag: item.id, data: { url: `/orders/${item.orderId}` } };
  if (registration) await registration.showNotification(item.title, options);
  else new Notification(item.title, options);
}
function playAlertSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine"; oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(660, context.currentTime + .13);
  gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.18, context.currentTime + .02); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .28);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .3);
  oscillator.addEventListener("ended", () => context.close());
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext } }
