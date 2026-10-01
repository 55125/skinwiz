CREATE TABLE `label_sections` (
	`spl_set_id` text PRIMARY KEY NOT NULL,
	`effective_time` text,
	`directions` text,
	`warnings` text,
	`do_not_use` text,
	`when_using` text,
	`stop_use` text,
	`ask_doctor` text
);
--> statement-breakpoint
CREATE TABLE `regimen_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`product_id` text NOT NULL,
	`slot` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regimen_items_session_product_idx` ON `regimen_items` (`session_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `regimen_items_session_idx` ON `regimen_items` (`session_id`);