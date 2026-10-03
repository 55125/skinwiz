CREATE TABLE `manual_affiliate_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`retailer` text NOT NULL,
	`url` text NOT NULL,
	`size_label` text,
	`added_at` text
);
--> statement-breakpoint
CREATE INDEX `manual_affiliate_links_product_idx` ON `manual_affiliate_links` (`product_id`);