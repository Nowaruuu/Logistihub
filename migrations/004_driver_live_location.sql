-- Live driver location tracking for shipments
-- Stores the driver's current GPS coordinates on the shipment row
-- Updated by driver app every 10 seconds while navigating

ALTER TABLE shipment
  ADD COLUMN IF NOT EXISTS driver_lat DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS driver_lng DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMP NULL DEFAULT NULL;
