CREATE TABLE `person_profiles` (
	`person_id` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
