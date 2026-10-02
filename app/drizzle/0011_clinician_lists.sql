CREATE TABLE `clinician_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`clinician_id` text NOT NULL,
	`name` text NOT NULL,
	`ids` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`clinician_id`) REFERENCES `clinicians`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `clinician_lists_clinician_idx` ON `clinician_lists` (`clinician_id`);