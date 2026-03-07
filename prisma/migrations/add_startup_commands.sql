-- Add startup command fields to Server table
ALTER TABLE `Server` ADD COLUMN `startupCommand` TEXT NULL AFTER `paidAmount`;
ALTER TABLE `Server` ADD COLUMN `startupPreset` VARCHAR(191) NULL AFTER `startupCommand`;
