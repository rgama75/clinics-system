CREATE TABLE public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  price numeric(12, 2) CHECK (price IS NULL OR price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procedures_select_member" ON public.procedures FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "procedures_insert_member" ON public.procedures FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "procedures_update_admin" ON public.procedures FOR UPDATE TO authenticated USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "procedures_delete_admin" ON public.procedures FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_procedures_updated_at BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX procedures_organization_idx ON public.procedures(organization_id);
