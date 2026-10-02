CREATE TABLE `clinicians` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text,
	`npi` text NOT NULL,
	`first_name` text,
	`last_name` text NOT NULL,
	`credential` text,
	`taxonomy_code` text,
	`taxonomy_desc` text,
	`is_dermatology` integer DEFAULT false NOT NULL,
	`state` text,
	`verified_at` text,
	`clinic_name` text NOT NULL,
	`clinic_phone` text,
	`clinic_website` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clinicians_person_id_unique` ON `clinicians` (`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `clinicians_npi_unique` ON `clinicians` (`npi`);--> statement-breakpoint
CREATE TABLE `handout_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`open_count` integer DEFAULT 0 NOT NULL,
	`claimed_at` text,
	`claimed_session_id` text,
	FOREIGN KEY (`version_id`) REFERENCES `handout_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `handout_instances_token_hash_unique` ON `handout_instances` (`token_hash`);--> statement-breakpoint
CREATE INDEX `handout_instances_version_idx` ON `handout_instances` (`version_id`);--> statement-breakpoint
CREATE INDEX `handout_instances_claimed_idx` ON `handout_instances` (`claimed_session_id`);--> statement-breakpoint
CREATE TABLE `handout_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`handout_id` text NOT NULL,
	`version` integer NOT NULL,
	`ref` text NOT NULL,
	`title` text NOT NULL,
	`template_id` text,
	`content` text NOT NULL,
	`clinic_name` text NOT NULL,
	`clinician_name` text NOT NULL,
	`clinician_credential` text,
	`clinic_phone` text,
	`clinic_website` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`handout_id`) REFERENCES `handouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `handout_versions_ref_unique` ON `handout_versions` (`ref`);--> statement-breakpoint
CREATE UNIQUE INDEX `handout_versions_handout_version_idx` ON `handout_versions` (`handout_id`,`version`);--> statement-breakpoint
CREATE TABLE `handouts` (
	`id` text PRIMARY KEY NOT NULL,
	`clinician_id` text NOT NULL,
	`title` text NOT NULL,
	`latest_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`clinician_id`) REFERENCES `clinicians`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `handouts_clinician_idx` ON `handouts` (`clinician_id`);--> statement-breakpoint
CREATE TABLE `npi_lookups` (
	`npi` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`payload` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `regimen_step_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`regimen_id` integer NOT NULL,
	`step_key` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`done_at` text,
	`have_at` text,
	FOREIGN KEY (`regimen_id`) REFERENCES `regimens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regimen_step_states_idx` ON `regimen_step_states` (`regimen_id`,`step_key`);--> statement-breakpoint
CREATE TABLE `regimens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'own' NOT NULL,
	`instance_id` integer,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`instance_id`) REFERENCES `handout_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `regimens_session_idx` ON `regimens` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `regimens_instance_idx` ON `regimens` (`instance_id`);--> statement-breakpoint
DROP INDEX `regimen_items_session_product_idx`;--> statement-breakpoint
ALTER TABLE `regimen_items` ADD `regimen_id` integer REFERENCES regimens(id);--> statement-breakpoint
ALTER TABLE `regimen_items` ADD `directions` text;--> statement-breakpoint
-- Hand-written: every existing single regimen becomes one active "My regimen"
-- row per session, and its items point at it. No item is dropped.
INSERT INTO `regimens` (`session_id`, `name`, `kind`, `active`, `created_at`)
  SELECT `session_id`, 'My regimen', 'own', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM `regimen_items` GROUP BY `session_id`;--> statement-breakpoint
UPDATE `regimen_items` SET `regimen_id` = (
  SELECT r.`id` FROM `regimens` r WHERE r.`session_id` = `regimen_items`.`session_id` AND r.`kind` = 'own'
);--> statement-breakpoint
CREATE UNIQUE INDEX `regimen_items_regimen_product_idx` ON `regimen_items` (`regimen_id`,`product_id`);--> statement-breakpoint
-- Hand-written: a handout version is immutable once written. Edits create a
-- new version; a printed QR keeps pointing at the version it was printed from.
CREATE TRIGGER `handout_versions_no_update` BEFORE UPDATE ON `handout_versions`
BEGIN SELECT RAISE(ABORT, 'handout versions are immutable; create a new version'); END;--> statement-breakpoint
CREATE TRIGGER `handout_versions_no_delete` BEFORE DELETE ON `handout_versions`
BEGIN SELECT RAISE(ABORT, 'handout versions are immutable'); END;