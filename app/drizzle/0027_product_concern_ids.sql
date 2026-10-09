ALTER TABLE `products` ADD `concern_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- Until the next seed fills it in, each product is listed under its own concern.
UPDATE `products` SET `concern_ids` = json_array(`concern_id`);
