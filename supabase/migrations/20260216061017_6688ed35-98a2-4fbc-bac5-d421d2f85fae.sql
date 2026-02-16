
-- Fines master table: State-wise violation fines for Rajasthan & Telangana
CREATE TABLE public.fines_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  violation_label TEXT NOT NULL,
  fine_amount NUMERIC NOT NULL DEFAULT 0,
  repeat_fine_amount NUMERIC,
  section_reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state, violation_type)
);

ALTER TABLE public.fines_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fines_master" ON public.fines_master FOR SELECT USING (true);
CREATE POLICY "Admins can manage fines_master" ON public.fines_master FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_fines_master_updated_at BEFORE UPDATE ON public.fines_master
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Challans table
CREATE TABLE public.challans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challan_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  violation_id UUID REFERENCES public.violations(id),
  plate_number TEXT NOT NULL,
  vehicle_type TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  owner_address TEXT,
  rto_office TEXT,
  state TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  violation_label TEXT NOT NULL,
  fine_amount NUMERIC NOT NULL DEFAULT 0,
  severity TEXT DEFAULT 'medium',
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  evidence_urls TEXT[],
  ai_detection_data JSONB,
  vehicle_lookup_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_id TEXT,
  payment_amount NUMERIC,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  public_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  issued_by UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ DEFAULT (now() + interval '15 days'),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view challans" ON public.challans FOR SELECT USING (true);
CREATE POLICY "Admins and operators can insert challans" ON public.challans FOR INSERT WITH CHECK (is_admin() OR is_operator());
CREATE POLICY "Admins and operators can update challans" ON public.challans FOR UPDATE USING (is_admin() OR is_operator()) WITH CHECK (is_admin() OR is_operator());
CREATE POLICY "Admins can delete challans" ON public.challans FOR DELETE USING (is_admin());

CREATE TRIGGER update_challans_updated_at BEFORE UPDATE ON public.challans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Payments table
CREATE TABLE public.challan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challan_id UUID NOT NULL REFERENCES public.challans(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_gateway TEXT DEFAULT 'razorpay',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payer_name TEXT,
  payer_phone TEXT,
  payer_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challan_payments ENABLE ROW LEVEL SECURITY;

-- Public can view their own payments (via public token flow), authenticated can view all
CREATE POLICY "Authenticated users can view payments" ON public.challan_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON public.challan_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update payments" ON public.challan_payments FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete payments" ON public.challan_payments FOR DELETE USING (is_admin());

CREATE TRIGGER update_challan_payments_updated_at BEFORE UPDATE ON public.challan_payments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Processing queue for high-throughput
CREATE TABLE public.processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view queue" ON public.processing_queue FOR SELECT USING (true);
CREATE POLICY "Admins and operators can manage queue" ON public.processing_queue FOR ALL USING (is_admin() OR is_operator()) WITH CHECK (is_admin() OR is_operator());

CREATE TRIGGER update_processing_queue_updated_at BEFORE UPDATE ON public.processing_queue
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for challans
ALTER PUBLICATION supabase_realtime ADD TABLE public.challans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processing_queue;

-- Storage bucket for evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);

CREATE POLICY "Anyone can view evidence" ON storage.objects FOR SELECT USING (bucket_id = 'evidence');
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidence' AND auth.role() = 'authenticated');
CREATE POLICY "Admins can delete evidence" ON storage.objects FOR DELETE USING (bucket_id = 'evidence' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
