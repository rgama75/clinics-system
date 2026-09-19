CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  patient_name text NOT NULL CHECK (char_length(patient_name) BETWEEN 2 AND 160),
  professional_name text CHECK (professional_name IS NULL OR char_length(professional_name) <= 160),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_select_member" ON public.appointments FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "appointments_insert_member" ON public.appointments FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "appointments_update_admin" ON public.appointments FOR UPDATE TO authenticated USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "appointments_delete_admin" ON public.appointments FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX appointments_organization_idx ON public.appointments(organization_id);
CREATE INDEX appointments_starts_at_idx ON public.appointments(starts_at);
