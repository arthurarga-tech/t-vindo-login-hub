-- Add notification sound setting to establishments
ALTER TABLE public.establishments 
ADD COLUMN notification_sound_enabled boolean DEFAULT true;