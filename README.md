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

Browser API calls use `/api/wordpress/shams-orders/v1` and `/api/wordpress/shams-catalog-reconciliation/v1`. Next.js rewrites these two namespaces to the configured `NEXT_PUBLIC_SHAMS_WP_URL` at build time, preserving bearer authentication, request bodies, query parameters and pagination headers. Set this URL to the canonical WordPress HTTPS origin (avoid redirecting aliases) and rebuild/redeploy the PWA when it changes. WordPress remains the authorization boundary; no shared service credential is added. API responses are private and not cached.

The service worker v5 only provides the offline HTML shell for same-origin page navigation. API, cross-origin and asset requests bypass it. Invalid JSON responses produce a controlled connection error instead of a JSON parser exception.

This transport correction is local and requires a PWA deployment to take effect. No WordPress activation or production configuration change was performed. After deployment, reload open PWA tabs to pick up the new worker and verify login, orders, branches, pagination and an authorized mutation in staging. Roll back by redeploying the previous PWA release if needed.
