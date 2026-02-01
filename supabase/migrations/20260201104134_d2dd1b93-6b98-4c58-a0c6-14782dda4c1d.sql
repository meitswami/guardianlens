-- Enable realtime for violations and gate_entry_logs tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_entry_logs;