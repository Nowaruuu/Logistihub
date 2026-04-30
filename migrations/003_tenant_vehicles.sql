-- Migration 003: Add available_vehicles config to TENANT
-- Run: ALTER TABLE TENANT ADD COLUMN available_vehicles VARCHAR(255) NULL;
-- Default: all vehicles enabled (comma-separated IDs)
-- Values: motorcycle,sedan,van,truck,flatbed

ALTER TABLE TENANT ADD COLUMN IF NOT EXISTS available_vehicles VARCHAR(255) NULL DEFAULT 'motorcycle,sedan,van,truck,flatbed';
