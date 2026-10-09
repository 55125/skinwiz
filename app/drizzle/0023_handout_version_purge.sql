CREATE TABLE `handout_version_purges` (
	`version_id` integer PRIMARY KEY NOT NULL,
	`ref` text NOT NULL,
	`handout_id` text NOT NULL,
	`reason` text NOT NULL,
	`purged_at` text NOT NULL
);
--> statement-breakpoint
-- Hand-written: versions stay undeletable except for a purge recorded above
-- (lib/handout-purge.ts). Updates stay blocked outright.
DROP TRIGGER `handout_versions_no_delete`;--> statement-breakpoint
CREATE TRIGGER `handout_versions_no_delete` BEFORE DELETE ON `handout_versions`
WHEN NOT EXISTS (SELECT 1 FROM `handout_version_purges` WHERE `version_id` = OLD.`id`)
BEGIN SELECT RAISE(ABORT, 'handout versions are immutable'); END;
