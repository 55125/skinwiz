CREATE TABLE `rx_label_sections` (
	`spl_set_id` text PRIMARY KEY NOT NULL,
	`effective_time` text,
	`indications` text,
	`dosage_and_administration` text,
	`boxed_warning` text,
	`contraindications` text,
	`warnings` text,
	`pregnancy` text,
	`lactation` text
);
--> statement-breakpoint
ALTER TABLE `products` ADD `marketing_category` text;--> statement-breakpoint
ALTER TABLE `products` ADD `product_type` text;--> statement-breakpoint
ALTER TABLE `products` ADD `package_description` text;--> statement-breakpoint
ALTER TABLE `products` ADD `is_rx` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `generic_name` text;--> statement-breakpoint
ALTER TABLE `products` ADD `rx_group` text;--> statement-breakpoint
ALTER TABLE `products` ADD `strength_text` text;--> statement-breakpoint
ALTER TABLE `products` ADD `route` text;--> statement-breakpoint
ALTER TABLE `products` ADD `steroid_potency_class` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `informational_only` integer DEFAULT false NOT NULL;