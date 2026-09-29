CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`product_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_ingredients` (
	`product_id` text NOT NULL,
	`position` integer NOT NULL,
	`ingredient_id` text NOT NULL,
	`raw_name` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_ingredients_pk` ON `product_ingredients` (`product_id`,`position`);--> statement-breakpoint
CREATE INDEX `product_ingredients_ingredient_idx` ON `product_ingredients` (`ingredient_id`);