CREATE TABLE `product_availability` (
	`product_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `price_checks` ADD `last_matched_at` text;--> statement-breakpoint
UPDATE `price_checks` SET `last_matched_at` = `checked_at` WHERE `status` IN ('matched', 'listed');