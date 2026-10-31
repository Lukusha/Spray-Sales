import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  requestKey: text('request_key').notNull(),
  payloadHash: text('payload_hash').notNull(),
  createdAt: integer('created_at').notNull(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  apartment: text('apartment').notNull().default(''),
  postalCode: text('postal_code').notNull(),
  notes: text('notes').notNull().default(''),
  quantity: integer('quantity').notNull(),
  unitPriceTetri: integer('unit_price_tetri').notNull().default(2495),
  subtotalTetri: integer('subtotal_tetri').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash_on_delivery'),
  status: text('status').notNull().default('pending_confirmation'),
}, table => [
  uniqueIndex('orders_request_key_unique').on(table.requestKey),
  index('orders_created_at_idx').on(table.createdAt),
  index('orders_phone_created_idx').on(table.phone, table.createdAt),
]);

export const orderNotifications = sqliteTable('order_notifications', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  channel: text('channel').notNull(),
  recipient: text('recipient').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: integer('next_attempt_at').notNull().default(0),
  lockedUntil: integer('locked_until').notNull().default(0),
  claimToken: text('claim_token'),
  providerId: text('provider_id'),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
  submittedAt: integer('submitted_at'),
}, table => [
  uniqueIndex('order_notifications_order_recipient_unique').on(table.orderId,table.channel,table.recipient),
  index('order_notifications_due_idx').on(table.status,table.nextAttemptAt),
]);
