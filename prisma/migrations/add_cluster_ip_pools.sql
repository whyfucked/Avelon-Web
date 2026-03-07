-- Add ipPoolIds field to VdsCluster table
-- This field stores JSON array of IP pool IDs connected to the cluster

ALTER TABLE `VdsCluster` ADD COLUMN `ipPoolIds` TEXT;
