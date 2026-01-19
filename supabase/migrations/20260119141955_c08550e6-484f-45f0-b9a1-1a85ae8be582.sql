-- Enable realtime for establishments table to allow instant store status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.establishments;