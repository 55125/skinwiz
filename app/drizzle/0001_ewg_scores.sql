CREATE TABLE IF NOT EXISTS `ewg_scores` (
	`product_id` text PRIMARY KEY NOT NULL,
	`ewg_score` integer NOT NULL,
	`data_availability` text,
	`ewg_product_url` text NOT NULL,
	`fetched_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
