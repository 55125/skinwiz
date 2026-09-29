CREATE TABLE `active_chem_data` (
	`active_id` text PRIMARY KEY NOT NULL,
	`pubchem_cid` integer NOT NULL,
	`molecular_formula` text,
	`fetched_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`active_id`) REFERENCES `actives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `actives` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`categories` text NOT NULL,
	`synonyms` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `affiliate_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`network` text NOT NULL,
	`price` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`buy_url` text NOT NULL,
	`image_url` text,
	`is_demo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audience_outcomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`concern_id` text NOT NULL,
	`session_id` text NOT NULL,
	`improved` integer NOT NULL,
	`weeks_used` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concern_id`) REFERENCES `concerns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `concerns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `derm_raters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`npi` text NOT NULL,
	`abd_certified` integer DEFAULT false NOT NULL,
	`bio` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `derm_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`concern_id` text NOT NULL,
	`rater_id` integer NOT NULL,
	`score` integer NOT NULL,
	`rubric_json` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concern_id`) REFERENCES `concerns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rater_id`) REFERENCES `derm_raters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`active_id` text NOT NULL,
	`concern_id` text NOT NULL,
	`summary` text NOT NULL,
	`typical_concentration_text` text,
	`evidence_grade` text,
	`needs_clinician_review` integer DEFAULT true NOT NULL,
	`citations` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`active_id`) REFERENCES `actives`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concern_id`) REFERENCES `concerns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`concern_id` text NOT NULL,
	`brand_name` text NOT NULL,
	`manufacturer` text,
	`dosage_form` text,
	`active_ingredient_text` text,
	`active_ids` text DEFAULT '[]' NOT NULL,
	`spl_set_id` text,
	`image_url` text,
	`source_url` text,
	`free_from_flags` text,
	`data_source` text DEFAULT 'openfda' NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`concern_id`) REFERENCES `concerns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rater_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`credential` text,
	`message` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_reports_routine_session_idx` ON `routine_reports` (`routine_id`,`session_id`);--> statement-breakpoint
CREATE TABLE `routine_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`step_order` integer NOT NULL,
	`description` text NOT NULL,
	`product_id` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routine_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`value` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_votes_routine_session_idx` ON `routine_votes` (`routine_id`,`session_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`concern_id` text NOT NULL,
	`author_name` text,
	`session_id` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`concern_id`) REFERENCES `concerns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `video_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`platform` text DEFAULT 'youtube' NOT NULL,
	`video_id` text NOT NULL,
	`title` text NOT NULL,
	`channel_title` text,
	`thumbnail_url` text,
	`published_at` text,
	`fetched_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
