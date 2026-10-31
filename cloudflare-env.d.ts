declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ORDER_ADMIN_EMAIL?: string;
    AUTH_PROVIDER?: string;
    ADMIN_PASSWORD?: string;
    ORDER_EMAIL_FROM?: string;
    RESEND_API_KEY?: string;
    ORDER_EMAIL_PROVIDER?: string;
    GMAIL_APP_PASSWORD?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_MESSAGING_SERVICE_SID?: string;
  }
}
