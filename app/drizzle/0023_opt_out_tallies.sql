CREATE TABLE `opt_out_tallies` (
	`day` text NOT NULL,
	`signal` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `signal`, `kind`)
);
