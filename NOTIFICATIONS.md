# Order alerts

Every new order on the direct Cloudflare store is saved in `spray-sales-orders` (`orders` table). Checkout reports success only after the order is confirmed in D1. The same D1 transaction creates three records in `order_notifications`:

- Email: `luckysaba37@gmail.com`
- Email: `ekatibua1974@gmail.com`
- SMS: `+995599856057`

The recipients are fixed on the server; checkout cannot change them. Existing orders remain intact; old orders are not automatically emailed. Email includes the order details; SMS includes only the order reference, quantity, subtotal and private dashboard link, to keep texts short and avoid putting customer addresses on a lock screen.

## Activate email

This implementation uses [Resend](https://resend.com/docs/api-reference/emails/send-email). Connect a Resend account and verify a domain you own. Then add these **runtime** settings in Cloudflare → spray-sales → Settings → Runtime variables and secrets → Production:

| Setting | Type | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Sending API key from your Resend account |
| `ORDER_EMAIL_FROM` | Variable | A plain address on the verified domain, e.g. orders@yourdomain.com |

The Gmail recipient addresses cannot be used as an authenticated domain sender. The Resend test sender does not support arbitrary recipient inboxes. Do not put API keys in Git or chat. No email is sent until valid configuration is present. No subscription or sending provider account is created by this code.

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
- `retry`: transient rejection or email request failure; exponential backoff, at most six attempts within 20 hours of creation after sending begins.
- `failed`: permanent provider rejection or retry limit reached. Review the error and provider console.
- `uncertain`: a send may have reached the provider. Review its logs before any manual retry, especially for SMS.

Resend requests use stable idempotency keys. D1 claims prevent two workers from sending the same job concurrently. An interrupted send is marked uncertain after its two-minute lease expires. Network/ambiguous SMS failures are not automatically resent, to avoid duplicate charges and texts. This system does not claim exactly-once delivery.

Order data is committed before notifications. Provider errors never delete orders or turn an accepted order into a failed checkout. Notification errors are sanitized: raw provider bodies, credentials and customer details are not written to error logs.

Production activation should finish with an explicitly labelled test order, verifying two email provider acceptances and the optional SMS acceptance against the same D1 order ID. Local automated tests never send real email/SMS. No live send has been verified merely by a successful build.
