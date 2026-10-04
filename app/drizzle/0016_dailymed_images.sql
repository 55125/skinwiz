CREATE TABLE `dailymed_images` (
	`spl_set_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`image_name` text,
	`image_key` text,
	`width` integer,
	`height` integer,
	`bytes` integer,
	`rejected` text DEFAULT '[]' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`updated_at` text NOT NULL,
	`retry_after` text
);
--> statement-breakpoint
CREATE INDEX `dailymed_images_status_idx` ON `dailymed_images` (`status`);--> statement-breakpoint
CREATE INDEX `products_spl_set_id_idx` ON `products` (`spl_set_id`);