# Crystal Care Georgia

Georgian YYLFD 100ml spray storefront. White background, black buttons, navy information sections and black footer. Unit price 24.95 GEL; merchant-requested reference price 49.50 GEL.

## Orders

Guest flow: cart, delivery details, submit, saved order reference. Payment is cash on delivery. Product subtotal is calculated server-side in tetri. Shipping fee and delivery date are explicitly confirmed by phone before dispatch. Customers do not create an account.

Orders persist in Cloudflare D1 binding DB, table orders. The server validates fields, checks request origin and size, limits repeated submissions per phone, and uses unique request keys to avoid duplicates on retries. Personal details are not placed in browser storage.

The private /merchant inbox shows the latest 200 orders after ChatGPT sign-in as the store owner. Only the email in the hosted secret ORDER_ADMIN_EMAIL is authorized. Customer checkout requires no sign-in. Check this inbox manually; no email notifications, courier dispatch or payment processor is connected.

## Source

storefront.html is served by app/route.ts. Assets are in public/. Guest writes are handled by app/api/orders/route.ts; owner reads by app/merchant/route.ts. The standard Sites Vinext starter provides build and deployment support. Database schema is in db/schema.ts; migrations are in drizzle/. Preserve the project ID in .openai/hosting.json. Configure ORDER_ADMIN_EMAIL only as a runtime secret.

## Merchant follow-up

Supply exact shipping pricing and timing, contact/business details and return policy before advertising. Verify supplier performance, labeling, material compatibility and the basis of the 49.50 GEL reference price.

Product source: https://share.temu.com/NKNulOgv1XB . Temu verification blocked the full listing. Facts come from the user screenshot and shared supplier image: YYLFD Lighting Renovation, 100ml pump bottle and supplier's no-disassembly claim. Hero image is AI-refined; the original supplier photo remains viewable on the site.
