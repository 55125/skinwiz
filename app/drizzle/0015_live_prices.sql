CREATE TABLE `price_checks` (
	`product_id` text NOT NULL,
	`source` text NOT NULL,
	`checked_at` text NOT NULL,
	`status` text NOT NULL,
	`misses` integer DEFAULT 0 NOT NULL,
	`next_check_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_checks_product_source_idx` ON `price_checks` (`product_id`,`source`);--> statement-breakpoint
CREATE INDEX `price_checks_next_idx` ON `price_checks` (`next_check_at`);--> statement-breakpoint
CREATE TABLE `price_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`source` text NOT NULL,
	`merchant_id` text NOT NULL,
	`merchant_name` text NOT NULL,
	`price` real NOT NULL,
	`retail_price` real,
	`currency` text NOT NULL,
	`url` text NOT NULL,
	`affiliatable` integer NOT NULL,
	`match_type` text NOT NULL,
	`match_confidence` real NOT NULL,
	`offer_name` text,
	`pack_amount` real,
	`pack_unit` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_quotes_product_source_merchant_idx` ON `price_quotes` (`product_id`,`source`,`merchant_id`);--> statement-breakpoint
CREATE TABLE `product_barcodes` (
	`product_id` text NOT NULL,
	`barcode` text NOT NULL,
	`source` text NOT NULL,
	`rank` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_barcodes_product_barcode_idx` ON `product_barcodes` (`product_id`,`barcode`);--> statement-breakpoint
CREATE TABLE `product_views` (
	`product_id` text PRIMARY KEY NOT NULL,
	`last_viewed_at` text NOT NULL
);
