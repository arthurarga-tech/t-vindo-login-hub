-- Drop the old constraint
ALTER TABLE establishments DROP CONSTRAINT establishments_print_mode_check;

-- Add the new constraint with the expanded values
ALTER TABLE establishments ADD CONSTRAINT establishments_print_mode_check 
CHECK (print_mode = ANY (ARRAY['none'::text, 'on_order'::text, 'on_confirm'::text, 'browser_on_order'::text, 'browser_on_confirm'::text, 'qz_on_order'::text, 'qz_on_confirm'::text]));