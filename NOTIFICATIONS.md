# Order alerts

Every new order on the direct Cloudflare store is saved in `spray-sales-orders` (`orders` table). Checkout reports success only after the order is confirmed in D1. The same D1 transaction creates three records in `order_notifications`:

- Email: `luckysaba37@gmail.com`
- Email: `ekatibua1974@gmail.com`
- SMS: `+995599856057`

The recipients are fixed on the server; checkout cannot change them. Existing orders remain intact; old orders are not automatically emailed. Email includes the order details; SMS includes only the order reference, quantity, subtotal and private dashboard link, to keep texts short and avoid putting customer addresses on a lock screen.

## Activate Gmail email

The selected sender is `luka.beraia808@gmail.com`. Direct Cloudflare builds set `ORDER_EMAIL_PROVIDER=gmail` and `ORDER_EMAIL_FROM=luka.beraia808@gmail.com`. The SMTP sender and login are fixed to this address in `lib/gmail-smtp.ts`.

1. Sign into that Google account and enable 2-Step Verification if needed.
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords), and create an app password named **Crystal Care orders**. App Passwords may be unavailable for some account/security settings. Do not disable account security to make them available.
3. In Cloudflare → spray-sales → Settings → Runtime variables and secrets → Production, add `GMAIL_APP_PASSWORD` as a **Secret**, enter the generated 16-character app password, and deploy. The Google account owner must create and save this credential themselves. Never paste it into chat or commit it to Git. Do not use the ordinary Google account password.
4. Verify a clearly labelled test order reaches both recipient inboxes and matches the D1 order record. A saved secret alone does not prove successful sending.

The Worker connects directly to `smtp.gmail.com:465` with TLS from the first byte. Credentials are sent only to Google's fixed SMTP endpoint. Messages include a stable Message-ID and a UTF-8 base64 body. Provider responses are not logged. A definitive temporary SMTP rejection can retry; a missing acknowledgment after message submission is marked **uncertain** and must be checked in Gmail Sent mail before retrying. SMTP does not offer Resend-style idempotency keys. Gmail's own sending limits and security restrictions apply.

Blocked jobs remain in D1 until Gmail is connected. Changing the ordinary Google account password may revoke the app password. Revoke **Crystal Care orders** in Google if the store should no longer send using this account.

References: [Google App Passwords](https://support.google.com/accounts/answer/185833), [Google SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp), [Cloudflare TLS sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

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
- `retry`: transient rejection or email request failure; exponential backoff, at most six attempts within 20 hours of creation after sending begins.
- `failed`: permanent provider rejection or retry limit reached. Review the error and provider console.
- `uncertain`: a send may have reached the provider. Review its logs before any manual retry, especially for SMS.

Resend requests use stable idempotency keys. D1 claims prevent two workers from sending the same job concurrently. An interrupted send is marked uncertain after its two-minute lease expires. Network/ambiguous SMS failures are not automatically resent, to avoid duplicate charges and texts. This system does not claim exactly-once delivery.

Order data is committed before notifications. Provider errors never delete orders or turn an accepted order into a failed checkout. Notification errors are sanitized: raw provider bodies, credentials and customer details are not written to error logs.

Production activation should finish with an explicitly labelled test order, verifying two email provider acceptances and the optional SMS acceptance against the same D1 order ID. Local automated tests never send real email/SMS. No live send has been verified merely by a successful build.
