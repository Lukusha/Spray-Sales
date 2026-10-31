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
    EMAILJS_SERVICE_ID?: string;
    EMAILJS_PUBLIC_KEY?: string;
    EMAILJS_TEMPLATE_LUCKY?: string;
    EMAILJS_TEMPLATE_EKA?: string;
    EMAILJS_PRIVATE_KEY?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_MESSAGING_SERVICE_SID?: string;
  }
}
