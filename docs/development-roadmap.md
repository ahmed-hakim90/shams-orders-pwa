# Shams Orders — Development Roadmap

This roadmap keeps product work in reviewable batches. Each batch is completed on a preview deployment and verified on mobile, tablet, and desktop before the next batch starts.

## Batch 1 — Usability, search, and filters

Status: implemented locally on 6 September 2026; pending preview deployment and owner review.

- Responsive order cards for mobile and tablet.
- Server-side search by customer name, order number, and phone.
- Paginated results with an explicit load-more action.
- Filters for status, date range, branch, and payment method.
- Quick call, WhatsApp, and open-order actions on mobile.
- Preserve filters and list scroll position when returning from an order.

Acceptance: staff can reach any order quickly without losing their working context.

## Batch 2 — Order workflow

- Finalize operational statuses and transitions.
- Add quick status changes and follow-ups from the list.
- Record the actor and timestamp for every action.
- Prevent invalid status transitions.

Acceptance: every order has a clear state and auditable history.

## Batch 3 — Assignment and branches

- Improve single and bulk assignment.
- Show branch workload before assignment.
- Suggest a branch from the delivery area.
- Record reassignment reasons and enforce role visibility.

Acceptance: admins distribute work quickly and branches only access assigned orders.

## Batch 4 — Production notifications

- Persist push subscriptions and deliver background notifications.
- Notify admins about new orders and branches about assignments.
- Notify relevant users about status or assignment changes.
- Prevent duplicate alerts and retain notification history.

Acceptance: the correct user receives one alert even when the PWA is closed.

## Batch 5 — Offline resilience and performance

- Structured list and detail caching.
- Stale-data and last-updated indicators.
- Automatic retries after connectivity returns.
- Progressive image/data loading and skeleton states.

Acceptance: core order access remains understandable on weak connections.

## Batch 6 — Invoice and printing

- Lock the approved invoice template.
- Verify A4 and optional thermal layouts.
- Handle long addresses and multi-item orders without bad page breaks.
- Include shipping, fees, discounts, payment, PDF download, and direct print.

Acceptance: invoice totals match WooCommerce and print consistently.

## Batch 7 — Reports and administration

- Branch workload and throughput.
- Preparation time, late orders, cancellations, and returns.
- Collections by branch and payment method.
- Date ranges and CSV/Excel export.

Acceptance: operational reports reconcile with WooCommerce.

## Batch 8 — Security and production hardening

- Secure token renewal and session controls.
- API rate limiting and endpoint capability review.
- Production monitoring, backups, and rollback documentation.
- Cross-device release testing.

Acceptance: the production release is observable, recoverable, and permission-safe.

## Delivery workflow

For every batch: implement → run focused tests → verify responsive UI → deploy a preview → owner review → merge and release.
