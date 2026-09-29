ALTER TABLE `products` ADD `strengths` text;--> statement-breakpoint
ALTER TABLE `products` ADD `strength_key` text;--> statement-breakpoint
CREATE INDEX `products_strength_key_idx` ON `products` (`strength_key`);