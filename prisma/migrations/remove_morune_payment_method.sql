-- Remove MORUNE from transaction_method enum
ALTER TABLE `Transaction` MODIFY COLUMN `method` ENUM('MANUAL', 'YOOMONEY', 'HELEKET', 'PAYPALYCH') NOT NULL DEFAULT 'MANUAL';