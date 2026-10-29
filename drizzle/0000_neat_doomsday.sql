CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`apartment` text DEFAULT '' NOT NULL,
	`postal_code` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_tetri` integer DEFAULT 2495 NOT NULL,
	`subtotal_tetri` integer NOT NULL,
	`payment_method` text DEFAULT 'cash_on_delivery' NOT NULL,
	`status` text DEFAULT 'pending_confirmation' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_key_unique` ON `orders` (`request_key`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `orders_phone_created_idx` ON `orders` (`phone`,`created_at`);