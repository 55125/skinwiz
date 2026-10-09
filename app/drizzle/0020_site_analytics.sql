CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`path` text NOT NULL,
	`visitor` text NOT NULL,
	`referrer` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`device` text,
	`detail` text,
	`value` integer,
	`product_id` text
);
--> statement-breakpoint
CREATE INDEX `analytics_events_kind_day_idx` ON `analytics_events` (`kind`,`day`);--> statement-breakpoint
CREATE INDEX `analytics_events_day_idx` ON `analytics_events` (`day`);--> statement-breakpoint
CREATE TABLE `analytics_salts` (
	`day` text PRIMARY KEY NOT NULL,
	`salt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `server_errors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text NOT NULL,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`route` text,
	`message` text NOT NULL,
	`digest` text
);
--> statement-breakpoint
CREATE INDEX `server_errors_at_idx` ON `server_errors` (`at`);