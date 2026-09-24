# Shams Orders PWA

Responsive Arabic order operations dashboard built with Next.js. It runs in demo mode when no WordPress URL is configured.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SHAMS_WP_URL` to connect the WordPress plugin. Without it, the included realistic fixture data lets the complete admin flow be reviewed safely.

## First release scope

- Admin and branch login through the companion WordPress plugin.
- Server-enforced branch order visibility.
- Search and status filtering.
- Order details, customer, payment and delivery data.
- Admin branch assignment.
- Branch-safe WooCommerce status updates.
- Clear status action cards with an explanation for each operational state.
- A private WooCommerce-backed follow-up timeline for assignment, status and staff notes.
- Foreground polling, browser notification and an audible alert for new orders after the user enables notifications.
- Installable PWA shell with an offline fallback.
- Self-contained bilingual A4 invoice rendered from the authenticated WooCommerce order payload, including addresses and canonical total rows.

Background push handlers are prepared in the service worker. Push subscription persistence and delivery are intentionally deferred until the production origin and VAPID keys are configured.

## WordPress transport

Browser API calls go directly to `${NEXT_PUBLIC_SHAMS_WP_URL}/wp-json/shams-orders/v1` and `${NEXT_PUBLIC_SHAMS_WP_URL}/wp-json/shams-catalog-reconciliation/v1`; Next.js no longer proxies these requests. Set this URL to the canonical WordPress HTTPS origin and rebuild/redeploy the PWA when it changes. Bearer authentication, request bodies, query parameters and client-side `cache: "no-store"` are unchanged. WordPress remains the authorization boundary; no shared service credential is added.

Production CORS is owned by the existing **Shams Headless → Allowed CORS Origins** setting, not Orders Hub. On 24 September 2026 its value was updated from `https://www.shams-stores.com` to `https://www.shams-stores.com,https://shams-orders-pwa.vercel.app`. Its REST hook replaces WordPress's default CORS handling; omitting the PWA origin prevented browsers from reading responses. The production browser now receives JSON for login validation and unauthorized orders/catalog requests, including preflight support for `Authorization` and `Content-Type`. An unrelated origin remains disallowed. Authentication and capabilities are unchanged.

Pagination reads the exposed `X-WP-Total` and `X-WP-TotalPages` headers. If `X-WP-Page` is not exposed, it uses the requested page number. No plugin code or firewall rules need changing.

The service worker v5 only provides the offline HTML shell for same-origin page navigation. API, cross-origin and asset requests bypass it. Invalid JSON responses produce a controlled connection error instead of a JSON parser exception.

The approved production CORS setting is applied; the direct-transport code takes effect when this PWA revision is deployed. No plugin activation, plugin-code edit or firewall change was performed. The v5 service worker and background-load resilience are unchanged. After deployment, reload open PWA tabs and verify the authenticated order workspace. Test mutations only in staging with authorization. Restore the previous CORS value above if that configuration change must be rolled back. A previous PWA deployment can be restored separately, but its proxy was observed to be blocked and is not a verified working fallback.
