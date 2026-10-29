declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ORDER_ADMIN_EMAIL?: string;
  }
}
