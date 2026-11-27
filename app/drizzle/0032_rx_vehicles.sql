CREATE TABLE `rx_vehicles` (
	`product_id` text PRIMARY KEY NOT NULL,
	`names` text NOT NULL,
	`allergen_hits` text NOT NULL,
	`free_from_flags` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
