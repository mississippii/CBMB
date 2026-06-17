-- Supplier portal groundwork: SUPPLIER user role + phone-based supplier logins.
-- Suppliers sign in with their phone number; email stays optional for them.

ALTER TABLE `users`
  MODIFY COLUMN `role` enum('ADMIN', 'WHOLESALER', 'SUPPLIER') NOT NULL;

ALTER TABLE `users`
  MODIFY COLUMN `email` varchar(190) NULL;

ALTER TABLE `users`
  ADD COLUMN `phone` varchar(30) NULL AFTER `email`,
  ADD UNIQUE KEY `uk_users_phone` (`phone`);

ALTER TABLE `suppliers`
  ADD COLUMN `user_id` bigint unsigned NULL,
  ADD UNIQUE KEY `uk_suppliers_user_id` (`user_id`),
  ADD CONSTRAINT `fk_suppliers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
