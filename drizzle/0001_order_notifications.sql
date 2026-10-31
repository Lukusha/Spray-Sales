CREATE TABLE `order_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`claim_token` text,
	`provider_id` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_notifications_order_recipient_unique` ON `order_notifications` (`order_id`,`channel`,`recipient`);--> statement-breakpoint
CREATE INDEX `order_notifications_due_idx` ON `order_notifications` (`status`,`next_attempt_at`);