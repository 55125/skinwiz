CREATE TABLE `label_barcodes` (
	`spl_set_id` text NOT NULL,
	`barcode` text NOT NULL,
	`image_name` text NOT NULL,
	`found_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `label_barcodes_set_barcode_idx` ON `label_barcodes` (`spl_set_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `label_barcodes_barcode_idx` ON `label_barcodes` (`barcode`);--> statement-breakpoint
CREATE TABLE `label_scans` (
	`spl_set_id` text NOT NULL,
	`image_name` text NOT NULL,
	`status` text NOT NULL,
	`barcodes` text DEFAULT '[]' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`scanned_at` text NOT NULL,
	`retry_after` text,
	PRIMARY KEY(`spl_set_id`, `image_name`)
);
