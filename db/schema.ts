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
