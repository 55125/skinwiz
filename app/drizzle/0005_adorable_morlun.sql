CREATE TABLE `shelf_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`product_id` text NOT NULL,
	`status` text NOT NULL,
	`opened` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shelf_items_session_product_idx` ON `shelf_items` (`session_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `shelf_items_session_idx` ON `shelf_items` (`session_id`);