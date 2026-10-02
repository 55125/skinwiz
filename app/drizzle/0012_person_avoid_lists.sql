CREATE TABLE `person_avoid_lists` (
	`person_id` text PRIMARY KEY NOT NULL,
	`ids` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
