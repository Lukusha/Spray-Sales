# Order alerts

Every new order on the direct Cloudflare store is saved in `spray-sales-orders` (`orders` table). Checkout reports success only after the order is confirmed in D1. The same D1 transaction creates three records in `order_notifications`:

- Email: `luckysaba37@gmail.com`
- Email: `ekatibua1974@gmail.com`
- SMS: `+995599856057`

The recipients are fixed on the server; checkout cannot change them. Existing orders remain intact; old orders are not automatically emailed. Email includes the order details; SMS includes only the order reference, quantity, subtotal and private dashboard link, to keep texts short and avoid putting customer addresses on a lock screen.

## Activate EmailJS email

Direct Cloudflare builds select `ORDER_EMAIL_PROVIDER=emailjs`. The intended sender is `luka.beraia808@gmail.com`, connected through EmailJS's Gmail service. The account owner creates the EmailJS account and approves Google's requested access themselves; no Google App Password is needed for this route.

1. Create a [free EmailJS account](https://dashboard.emailjs.com/sign-up), then add a Gmail email service connected to the sender above.
2. Create two templates with **fixed To Email** fields: one for `luckysaba37@gmail.com`, one for `ekatibua1974@gmail.com`. Do not use a dynamic recipient variable. Set From Name to **Crystal Care**, use the connected service's default sender, and use subject `Crystal Care — ახალი შეკვეთა {{order_id}}`. The body should display `{{order_details}}` with preserved newlines and escaped content (double braces, not raw triple braces).
3. In Account → Security, enable API requests from non-browser applications for the Worker. Follow the account's security requirements; never spoof an Origin header to bypass restrictions.
4. Add the settings below to Cloudflare → spray-sales → Settings → Runtime variables and secrets → Production. The IDs and public key are identifiers; any private key must be a Secret, never committed to Git or sent in chat.
5. Verify a clearly labelled test order reaches both recipient inboxes and matches the D1 record. Configuration and a successful deployment alone do not prove delivery.

| Setting | Type | Value |
| --- | --- | --- |
| `EMAILJS_SERVICE_ID` | Variable | Connected Gmail service ID |
| `EMAILJS_PUBLIC_KEY` | Variable | Account public key |
| `EMAILJS_TEMPLATE_LUCKY` | Variable | Fixed luckysaba37 recipient template ID |
| `EMAILJS_TEMPLATE_EKA` | Variable | Fixed ekatibua1974 recipient template ID |
| `EMAILJS_PRIVATE_KEY` | Secret, if required | Account private key |

The free plan includes 200 requests per month and two templates. This implementation sends two separate requests per order, giving approximately 100 orders per month before tests and retries. EmailJS does not automatically charge overages; requests stop at the quota. Monitor usage in its dashboard. SMS is separate and is not included in EmailJS.

The server selects a fixed template per authorized recipient and sends only the canonical order reference and details to EmailJS's HTTPS API. Requests within a processing batch are separated by at least 1.1 seconds; provider rate-limit rejections queue for retry. EmailJS has no request idempotency API, so lost/ambiguous acknowledgments require manual review in Email History before resending. Blocked jobs stay in D1 until the service and templates are connected.

References: [EmailJS REST API](https://www.emailjs.com/docs/rest-api/send/), [server-side API activation](https://github.com/emailjs-com/emailjs-nodejs), [pricing and quotas](https://www.emailjs.com/pricing/).

### Alternative: direct Gmail SMTP

The optional direct SMTP adapter remains available in `lib/gmail-smtp.ts`. It requires selecting `ORDER_EMAIL_PROVIDER=gmail` in the standalone build and storing a Google App Password as the `GMAIL_APP_PASSWORD` runtime secret. The account owner must create and submit that credential themselves. It is not the selected setup; no app password has been verified. Do not use the ordinary Google password or weaken Google account protections to enable it.

### Alternative: Resend with a custom domain

The previous Resend adapter remains available. For a custom-domain sender, set `ORDER_EMAIL_PROVIDER=resend`, `RESEND_API_KEY` as a runtime secret, and `ORDER_EMAIL_FROM` to an address on a domain verified in Resend. Update the standalone build's provider defaults before switching permanently. A `gmail.com` address cannot be verified as a Resend sending domain.

## Activate optional SMS

The prepared SMS adapter uses [Twilio Messaging](https://www.twilio.com/docs/messaging/api/message-resource). A funded account, an appropriate sender/registered Messaging Service and permission to send to Georgia are required. Check [Twilio's Georgia guidance](https://www.twilio.com/en-us/guidelines/ge/sms) before activation. This code does not buy a number or activate a paid plan.

| Setting | Type | Value |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Variable | Account SID beginning AC |
| `TWILIO_AUTH_TOKEN` | Secret | Twilio account auth token |
| `TWILIO_MESSAGING_SERVICE_SID` | Variable | Your Messaging Service SID beginning MG |

If using a Georgian SMS provider instead, replace the SMS adapter with that provider's documented API; do not enter its credentials into the Twilio settings.

## Processing and monitoring

Successful order requests start background processing. The standalone Worker also runs every five minutes to process pending/retry/blocked alerts. Configure providers promptly: blocked alerts remain queued and start submitting after configuration is added. Each destination has an independent status in D1 and in the private `/merchant` inbox under **Order alerts**.

- `blocked`: sender/provider configuration missing; no network send attempted.
- `submitted`: the provider accepted the request. This does **not** prove inbox or handset delivery; check provider delivery logs.
- `retry`: safe transient rejection; exponential backoff, at most six attempts. Resend retries also stay within 20 hours of creation to remain inside its idempotency window.
- `failed`: permanent provider rejection or retry limit reached. Review the error and provider console.
- `uncertain`: a send may have reached the provider. Review its logs before any manual retry, especially for SMS.

Resend requests use stable idempotency keys. D1 claims prevent two workers from sending the same job concurrently. An interrupted send is marked uncertain after its two-minute lease expires. Network/ambiguous SMS failures are not automatically resent, to avoid duplicate charges and texts. This system does not claim exactly-once delivery.

Order data is committed before notifications. Provider errors never delete orders or turn an accepted order into a failed checkout. Notification errors are sanitized: raw provider bodies, credentials and customer details are not written to error logs.

Production activation should finish with an explicitly labelled test order, verifying two email provider acceptances and the optional SMS acceptance against the same D1 order ID. Local automated tests never send real email/SMS. No live send has been verified merely by a successful build.
