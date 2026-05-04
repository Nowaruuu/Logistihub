-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: logistics_os
-- ------------------------------------------------------
-- Server version       8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `TENANT`
--

DROP TABLE IF EXISTS `TENANT`;
CREATE TABLE `TENANT` (
  `tenant_id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) NOT NULL,
  `business_type` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `plan` varchar(100) DEFAULT 'trial',
  `logo_url` mediumtext,
  `brand_color` varchar(20) DEFAULT '#3b82f6',
  `bg_app_color` text,
  `bg_sidebar_color` text,
  `app_download_url` varchar(500) DEFAULT NULL,
  `theme_color` longtext,
  `background_url` mediumtext,
  `sidebar_color` varchar(20) DEFAULT NULL,
  `app_bg_color` varchar(20) DEFAULT NULL,
  `gradient_x` int DEFAULT '50',
  `gradient_y` int DEFAULT '10',
  `gradient_config` longtext,
  `bg_hero_color` text,
  `bg_page_color` text,
  `bg_workspace_url` mediumtext,
  `available_vehicles` varchar(255) DEFAULT 'motorcycle,sedan,van,truck,flatbed',
  `supported_package_categories` varchar(255) DEFAULT 'Package,Food,Document,Bulk,Vehicle',
  `pending_downgrade` varchar(50) DEFAULT NULL,
  `downgrade_effective_date` date DEFAULT NULL,
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `SUPERADMIN`
--

DROP TABLE IF EXISTS `SUPERADMIN`;
CREATE TABLE `SUPERADMIN` (
  `superadmin_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `password_last_changed` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `theme_color` varchar(10) DEFAULT '#0d6efd',
  `must_change_password` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`superadmin_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `TENANT_APPLICATION`
--

DROP TABLE IF EXISTS `TENANT_APPLICATION`;
CREATE TABLE `TENANT_APPLICATION` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `brand_color` varchar(20) DEFAULT '#3b82f6',
  `phone` varchar(50) DEFAULT NULL,
  `permit_file` longtext,
  `permit_filename` varchar(255) DEFAULT NULL,
  `permit_mimetype` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejection_reason` text,
  `reviewed_by` varchar(255) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uq_app_slug` (`slug`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `STAFF`
--

DROP TABLE IF EXISTS `STAFF`;
CREATE TABLE `STAFF` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `license_expiration_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Available',
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `employee_id` varchar(100) DEFAULT NULL,
  `is_temp_password` tinyint(1) DEFAULT '0',
  `verify_code` varchar(10) DEFAULT NULL,
  `verify_code_expires` datetime DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  `must_change_password` tinyint(1) DEFAULT '0',
  `license_url` longtext,
  `license_expiry` date DEFAULT NULL,
  `license_status` enum('not_uploaded','pending_review','verified','expired') DEFAULT 'not_uploaded',
  `vehicle_plate` varchar(20) DEFAULT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`staff_id`),
  KEY `fk_staff_tenant` (`tenant_id`),
  CONSTRAINT `fk_staff_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `APP_USER`
--

DROP TABLE IF EXISTS `APP_USER`;
CREATE TABLE `APP_USER` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `employee_id` varchar(100) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `contact_email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_te` (`tenant_id`,`email`),
  UNIQUE KEY `uq_tu` (`tenant_id`,`username`),
  CONSTRAINT `fk_appuser_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `AUDIT_LOG`
--

DROP TABLE IF EXISTS `AUDIT_LOG`;
CREATE TABLE `AUDIT_LOG` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor` varchar(255) NOT NULL,
  `actor_type` varchar(50) DEFAULT 'admin',
  `action` varchar(100) NOT NULL,
  `target` varchar(255) DEFAULT NULL,
  `tenant_slug` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
CREATE TABLE `client` (
  `client_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone_number` varchar(50) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`client_id`),
  KEY `fk_client_tenant` (`tenant_id`),
  CONSTRAINT `fk_client_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `route`
--

DROP TABLE IF EXISTS `route`;
CREATE TABLE `route` (
  `route_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `route_name` varchar(255) DEFAULT NULL,
  `assigned_vehicle_plate` varchar(50) DEFAULT NULL,
  `primary_driver_id` int DEFAULT NULL,
  PRIMARY KEY (`route_id`),
  KEY `assigned_vehicle_plate` (`assigned_vehicle_plate`),
  KEY `primary_driver_id` (`primary_driver_id`),
  KEY `fk_route_tenant` (`tenant_id`),
  CONSTRAINT `fk_route_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `route_ibfk_3` FOREIGN KEY (`primary_driver_id`) REFERENCES `STAFF` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `vehicle`
--

DROP TABLE IF EXISTS `vehicle`;
CREATE TABLE `vehicle` (
  `plate_number` varchar(50) NOT NULL,
  `tenant_id` int NOT NULL,
  `vehicle_type` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `capacity_tons` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `ownership_doc` longtext,
  `supported_item_types` varchar(255) DEFAULT 'Package,Food,Document,Bulk,Vehicle',
  PRIMARY KEY (`tenant_id`,`plate_number`),
  CONSTRAINT `fk_vehicle_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `shipment`
--

DROP TABLE IF EXISTS `shipment`;
CREATE TABLE `shipment` (
  `delivery_number` varchar(100) NOT NULL,
  `tenant_id` int NOT NULL,
  `airway_bill_number` varchar(100) DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `route_id` int DEFAULT NULL,
  `pickup_location` text,
  `dropoff_location` text,
  `pickup_lat` decimal(10,7) DEFAULT NULL,
  `pickup_lng` decimal(10,7) DEFAULT NULL,
  `dropoff_lat` decimal(10,7) DEFAULT NULL,
  `dropoff_lng` decimal(10,7) DEFAULT NULL,
  `distance_km` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `prohibited_check` tinyint(1) DEFAULT NULL,
  `offline_log` tinyint(1) DEFAULT NULL,
  `assigned_vehicle_plate` varchar(50) DEFAULT NULL,
  `assigned_driver_id` int DEFAULT NULL,
  `assigned_helper_id` int DEFAULT NULL,
  `item_type_flag` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `sender_user_id` int DEFAULT NULL,
  `receiver_name` varchar(100) DEFAULT NULL,
  `receiver_phone` varchar(20) DEFAULT NULL,
  `receiver_address` varchar(255) DEFAULT NULL,
  `shipping_method` varchar(50) DEFAULT NULL,
  `total_fee` decimal(10,2) DEFAULT NULL,
  `estimated_arrival` varchar(100) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `driver_lat` decimal(10,7) DEFAULT NULL,
  `driver_lng` decimal(10,7) DEFAULT NULL,
  `driver_location_updated_at` timestamp NULL DEFAULT NULL,
  `proof_photo_url` text,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `sender_name` varchar(255) DEFAULT NULL,
  `sender_phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`delivery_number`),
  KEY `route_id` (`route_id`),
  KEY `assigned_vehicle_plate` (`assigned_vehicle_plate`),
  KEY `assigned_driver_id` (`assigned_driver_id`),
  KEY `assigned_helper_id` (`assigned_helper_id`),
  KEY `fk_shipment_tenant` (`tenant_id`),
  KEY `fk_shipment_client` (`client_id`),
  CONSTRAINT `fk_shipment_client` FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_shipment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_ibfk_3` FOREIGN KEY (`route_id`) REFERENCES `route` (`route_id`),
  CONSTRAINT `shipment_ibfk_5` FOREIGN KEY (`assigned_driver_id`) REFERENCES `STAFF` (`staff_id`),
  CONSTRAINT `shipment_ibfk_6` FOREIGN KEY (`assigned_helper_id`) REFERENCES `STAFF` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
CREATE TABLE `payment` (
  `invoice_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `delivery_number` varchar(100) DEFAULT NULL,
  `billing_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `reference_code` varchar(100) DEFAULT NULL,
  `admin_confirmed` tinyint(1) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `paymongo_checkout_id` varchar(100) DEFAULT NULL,
  `paymongo_payment_id` varchar(100) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`invoice_id`),
  KEY `delivery_number` (`delivery_number`),
  KEY `fk_payment_tenant` (`tenant_id`),
  CONSTRAINT `fk_payment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `payment_ibfk_2` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `proof_of_delivery`
--

DROP TABLE IF EXISTS `proof_of_delivery`;
CREATE TABLE `proof_of_delivery` (
  `pod_id` int NOT NULL AUTO_INCREMENT,
  `delivery_number` varchar(100) NOT NULL,
  `tenant_id` int NOT NULL,
  `photo` longtext,
  `signature` longtext,
  `receiver_name` varchar(255) DEFAULT NULL,
  `notes` text,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pod_id`),
  KEY `fk_pod_tenant` (`tenant_id`),
  CONSTRAINT `fk_pod_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `DELIVERY_CHAT`
--

DROP TABLE IF EXISTS `DELIVERY_CHAT`;
CREATE TABLE `DELIVERY_CHAT` (
  `chat_id` int NOT NULL AUTO_INCREMENT,
  `delivery_number` varchar(50) NOT NULL,
  `tenant_id` int NOT NULL,
  `sender_type` enum('user','driver') NOT NULL,
  `sender_id` int NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`chat_id`),
  KEY `idx_dn_tid` (`delivery_number`,`tenant_id`),
  KEY `fk_chat_tenant` (`tenant_id`),
  CONSTRAINT `fk_chat_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `DELIVERY_RATING`
--

DROP TABLE IF EXISTS `DELIVERY_RATING`;
CREATE TABLE `DELIVERY_RATING` (
  `rating_id` int NOT NULL AUTO_INCREMENT,
  `delivery_number` varchar(50) NOT NULL,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `driver_staff_id` int DEFAULT NULL,
  `rating` tinyint NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rating_id`),
  UNIQUE KEY `uq_delivery_rating` (`delivery_number`,`tenant_id`),
  KEY `fk_rating_tenant` (`tenant_id`),
  CONSTRAINT `fk_rating_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `decline_reasons`
--

DROP TABLE IF EXISTS `decline_reasons`;
CREATE TABLE `decline_reasons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `delivery_number` varchar(100) DEFAULT NULL,
  `reason` text,
  `declined_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `delivery_number` (`delivery_number`),
  KEY `declined_by` (`declined_by`),
  KEY `fk_decline_tenant` (`tenant_id`),
  CONSTRAINT `decline_reasons_ibfk_2` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`),
  CONSTRAINT `decline_reasons_ibfk_3` FOREIGN KEY (`declined_by`) REFERENCES `STAFF` (`staff_id`),
  CONSTRAINT `fk_decline_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `NOTIFICATION`
--

DROP TABLE IF EXISTS `NOTIFICATION`;
CREATE TABLE `NOTIFICATION` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_type` enum('app_user','staff') DEFAULT 'app_user',
  `tenant_id` int NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `type` enum('Shipments','Payments','Account','System') DEFAULT 'Shipments',
  `is_read` tinyint(1) DEFAULT '0',
  `related_tracking` varchar(30) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`,`tenant_id`,`is_read`),
  KEY `fk_notification_tenant` (`tenant_id`),
  CONSTRAINT `fk_notification_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `SAVED_ADDRESS`
--

DROP TABLE IF EXISTS `SAVED_ADDRESS`;
CREATE TABLE `SAVED_ADDRESS` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `label` varchar(50) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`,`tenant_id`),
  KEY `fk_savedaddr_tenant` (`tenant_id`),
  CONSTRAINT `fk_savedaddr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `SHIPMENT_HISTORY`
--

DROP TABLE IF EXISTS `SHIPMENT_HISTORY`;
CREATE TABLE `SHIPMENT_HISTORY` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivery_number` varchar(30) NOT NULL,
  `tenant_id` int NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `actor_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dn` (`delivery_number`,`tenant_id`),
  KEY `fk_shiphistory_tenant` (`tenant_id`),
  CONSTRAINT `fk_shiphistory_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `SUBSCRIPTION_PAYMENT`
--

DROP TABLE IF EXISTS `SUBSCRIPTION_PAYMENT`;
CREATE TABLE `SUBSCRIPTION_PAYMENT` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `plan` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'PHP',
  `paymongo_session_id` varchar(255) DEFAULT NULL,
  `paymongo_payment_id` varchar(255) DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'paid',
  `is_test_mode` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_subpay_tenant` (`tenant_id`),
  CONSTRAINT `fk_subpay_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `VEHICLE_REQUEST`
--

DROP TABLE IF EXISTS `VEHICLE_REQUEST`;
CREATE TABLE `VEHICLE_REQUEST` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `vehicle_plate` varchar(20) NOT NULL,
  `driver_id` int NOT NULL,
  `request_type` enum('driver_request','staff_assignment') NOT NULL DEFAULT 'driver_request',
  `status` enum('pending','approved','denied','refused') NOT NULL DEFAULT 'pending',
  `refusal_reason` text,
  `initiated_by` int DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_vreq_tenant` (`tenant_id`),
  CONSTRAINT `fk_vreq_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `TENANT` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `sub_bulk`
--

DROP TABLE IF EXISTS `sub_bulk`;
CREATE TABLE `sub_bulk` (
  `delivery_number` varchar(100) NOT NULL,
  `pallet_count` int DEFAULT NULL,
  `stackable` tinyint(1) DEFAULT NULL,
  `forklift_required` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`delivery_number`),
  CONSTRAINT `fk_subbulk_shipment` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `sub_document`
--

DROP TABLE IF EXISTS `sub_document`;
CREATE TABLE `sub_document` (
  `delivery_number` varchar(100) NOT NULL,
  `confidentiality_level` varchar(100) DEFAULT NULL,
  `recipient_id_required` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`delivery_number`),
  CONSTRAINT `fk_subdoc_shipment` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `sub_food`
--

DROP TABLE IF EXISTS `sub_food`;
CREATE TABLE `sub_food` (
  `delivery_number` varchar(100) NOT NULL,
  `temperature_required_celsius` decimal(5,2) DEFAULT NULL,
  `product_expiration_date` date DEFAULT NULL,
  `handling_instructions` text,
  PRIMARY KEY (`delivery_number`),
  CONSTRAINT `fk_subfood_shipment` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `sub_package`
--

DROP TABLE IF EXISTS `sub_package`;
CREATE TABLE `sub_package` (
  `delivery_number` varchar(100) NOT NULL,
  `length` decimal(10,2) DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `content_description` text,
  PRIMARY KEY (`delivery_number`),
  CONSTRAINT `fk_subpkg_shipment` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `sub_vehicle`
--

DROP TABLE IF EXISTS `sub_vehicle`;
CREATE TABLE `sub_vehicle` (
  `delivery_number` varchar(100) NOT NULL,
  `vin` varchar(100) DEFAULT NULL,
  `make_model` varchar(255) DEFAULT NULL,
  `running_condition` tinyint(1) DEFAULT NULL,
  `condition_report` text,
  PRIMARY KEY (`delivery_number`),
  CONSTRAINT `fk_subveh_shipment` FOREIGN KEY (`delivery_number`) REFERENCES `shipment` (`delivery_number`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
