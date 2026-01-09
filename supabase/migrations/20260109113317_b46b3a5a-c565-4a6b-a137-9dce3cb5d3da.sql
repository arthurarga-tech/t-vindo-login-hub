-- Add location sharing enabled column to establishments table
ALTER TABLE establishments 
ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean DEFAULT true;