-- Live driver location tracking for shipments
-- Stores the driver's current GPS coordinates on the shipment row

ALTER TABLE shipment
  ADD COLUMN driver_lat DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN driver_lng DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN driver_location_updated_at TIMESTAMP NULL DEFAULT NULL;
