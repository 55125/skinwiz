ALTER TABLE `products` ADD `canonical_id` text;--> statement-breakpoint
CREATE INDEX `products_canonical_id_idx` ON `products` (`canonical_id`);