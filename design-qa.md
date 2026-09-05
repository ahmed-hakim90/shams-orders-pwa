# Invoice design QA

- Source visual truth: `/var/folders/3m/vwzv8hc14j3gdlkm8wtvscg80000gn/T/codex-clipboard-2794b2c5-9b0a-4178-935a-179f7e93669a.png` (1474 × 1808 px) and the three owner-supplied defect captures from 2026-09-04.
- Implementation: `http://127.0.0.1:3100/orders/29694/print`, captured in the Codex in-app browser after the compact-layout pass. The browser API returned the rendered screenshot inline rather than as a persistent file.
- Viewport/state: desktop invoice view, order 29694, unpaid COD state, authenticated admin.
- Density normalization: full-view composition compared by matching the A4 sheet region; defect captures are detail crops at varying scale, so typography was judged from focused regions rather than pixel-for-pixel density.

## Full-view comparison

The revised implementation keeps the brand header, bilingual invoice title, three-column order/address block, orange product header, totals, and thank-you footer within one compact invoice composition. The footer no longer sits in a large reserved gap that forces a second sheet for this three-line order.

## Focused comparison

- Typography: fact values now have usable minimum width and no longer wrap one word per line; labels remain bilingual and scannable.
- Spacing: header, metadata, product table, summary, and footer gaps were reduced to the reference's compact rhythm.
- Colors: orange remains the invoice accent; paid/unpaid states use restrained semantic tints and thinner borders.
- Image quality: the supplied Shams wordmark is preserved at its native aspect ratio and remains sharp at print size.
- Copy/content: payment state is Arabic-first with a small English companion; invoice data remains sourced from WooCommerce.

## Comparison history

1. P1 — fact values wrapped vertically in the first column. Fixed with explicit minimum tracks and smaller print typography.
2. P1 — oversized outlined payment stamp dominated the header. Fixed with a compact semantic badge and clear hierarchy.
3. P1 — footer flowed onto a second page for order 29694. Fixed with reduced print margins/gaps, compact row padding, and break-inside protection for the table and summary.
4. P2 — metadata order and labels differed from the supplied invoice reference. Fixed to use the exact `Order Date`, `Order Number`, `Shipping Method`, `Payment Method`, `Bill to`, and `Ship to` structure.
5. P2 — the address was previously flattened. Verified in the revised browser capture with name, street, area, city, and postcode on separate lines; plugin 0.6.0 now returns those as structured arrays.

## Remaining notes

- Plugin 0.6.0 makes address-line separation independent from WooCommerce's formatted-address HTML.
- Orders with many line items may correctly continue onto additional sheets; the typical three-line order used for QA fits one A4 sheet.

final result: passed
