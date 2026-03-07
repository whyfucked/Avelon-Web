-- Add startup preset field to Server table
ALTER TABLE `Server` ADD COLUMN `startupPreset` VARCHAR(191) NULL DEFAULT 'default';
ALTER TABLE `Server` ADD COLUMN `customStartupFlags` TEXT NULL;
