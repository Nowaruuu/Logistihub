-- 006: Delivery rating system
CREATE TABLE IF NOT EXISTS DELIVERY_RATING (
  rating_id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_number VARCHAR(50) NOT NULL,
  tenant_id INT NOT NULL,
  user_id INT NOT NULL,
  driver_staff_id INT DEFAULT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_rating (delivery_number, tenant_id)
);
