-- Add node selection fields to Plan table
ALTER TABLE `Plan` ADD COLUMN `vmNodeId` INT NULL;
ALTER TABLE `Plan` ADD COLUMN `vmNodeStrategy` VARCHAR(191) NULL;