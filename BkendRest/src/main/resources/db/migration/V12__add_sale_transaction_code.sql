ALTER TABLE `sales`
    ADD COLUMN `transaction_code` varchar(10) NULL AFTER `id`;

UPDATE `sales`
SET `transaction_code` = UPPER(LPAD(CONV(`id`, 10, 36), 10, '0'))
WHERE `transaction_code` IS NULL;

ALTER TABLE `sales`
    MODIFY COLUMN `transaction_code` varchar(10) NOT NULL,
    ADD UNIQUE KEY `uk_sales_transaction_code` (`transaction_code`),
    ADD INDEX `idx_sales_transaction_code` (`transaction_code`);
