ALTER TABLE public.establishments DROP CONSTRAINT IF EXISTS establishments_print_mode_check;

ALTER TABLE public.establishments ADD CONSTRAINT establishments_print_mode_check CHECK (print_mode IN ('none', 'browser_on_order', 'browser_on_confirm', 'rawbt_on_order', 'rawbt_on_confirm'));