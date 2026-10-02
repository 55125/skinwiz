CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` text NOT NULL,
	`product_id` text NOT NULL,
	`concern_id` text NOT NULL,
	`weeks` integer NOT NULL,
	`started_at` text NOT NULL,
	`due_at` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`claimed_at` text,
	`sent_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkins_person_product_weeks_idx` ON `checkins` (`person_id`,`product_id`,`weeks`);--> statement-breakpoint
CREATE INDEX `checkins_status_due_idx` ON `checkins` (`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `email_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`request_session_id` text,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_tokens_token_hash_unique` ON `email_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `email_tokens_email_idx` ON `email_tokens` (`email`,`created_at`);--> statement-breakpoint
CREATE TABLE `job_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outcome_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checkin_id` integer,
	`person_id` text NOT NULL,
	`product_id` text NOT NULL,
	`concern_id` text NOT NULL,
	`weeks` integer NOT NULL,
	`answer` text NOT NULL,
	`reaction` integer,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`checkin_id`) REFERENCES `checkins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outcome_observations_checkin_id_unique` ON `outcome_observations` (`checkin_id`);--> statement-breakpoint
CREATE INDEX `outcome_observations_product_idx` ON `outcome_observations` (`product_id`,`concern_id`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`home_session_id` text NOT NULL,
	`email_verified_at` text NOT NULL,
	`checkins_enabled` integer DEFAULT true NOT NULL,
	`safety_alerts_enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_email_unique` ON `people` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `people_home_session_id_unique` ON `people` (`home_session_id`);--> statement-breakpoint
CREATE TABLE `person_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`linked_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `person_sessions_person_idx` ON `person_sessions` (`person_id`);--> statement-breakpoint
CREATE TABLE `recall_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recall_number` text NOT NULL,
	`product_id` text NOT NULL,
	`match_type` text NOT NULL,
	`confidence` real NOT NULL,
	`matched_on` text NOT NULL,
	FOREIGN KEY (`recall_number`) REFERENCES `recalls`(`recall_number`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recall_matches_recall_product_idx` ON `recall_matches` (`recall_number`,`product_id`);--> statement-breakpoint
CREATE INDEX `recall_matches_product_idx` ON `recall_matches` (`product_id`);--> statement-breakpoint
CREATE TABLE `recall_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` text NOT NULL,
	`recall_number` text NOT NULL,
	`product_id` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL,
	`claimed_at` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recall_notifications_person_recall_idx` ON `recall_notifications` (`person_id`,`recall_number`);--> statement-breakpoint
CREATE TABLE `recalls` (
	`recall_number` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`classification` text,
	`status` text,
	`reason_for_recall` text,
	`product_description` text NOT NULL,
	`code_info` text,
	`recalling_firm` text,
	`recall_initiation_date` text,
	`report_date` text,
	`termination_date` text,
	`product_ndcs` text DEFAULT '[]' NOT NULL,
	`brand_names` text DEFAULT '[]' NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recalls_report_date_idx` ON `recalls` (`report_date`);