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
