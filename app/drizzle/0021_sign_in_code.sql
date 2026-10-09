ALTER TABLE `email_tokens` ADD `code_hash` text;--> statement-breakpoint
ALTER TABLE `email_tokens` ADD `code_attempts` integer DEFAULT 0 NOT NULL;