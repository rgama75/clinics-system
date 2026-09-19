CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 255),
  role public.app_role NOT NULL DEFAULT 'professional',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_select_admin" ON public.organization_invitations FOR SELECT TO authenticated USING (private.is_org_admin(organization_id));
CREATE POLICY "invitations_insert_admin" ON public.organization_invitations FOR INSERT TO authenticated WITH CHECK (private.is_org_admin(organization_id) AND invited_by = auth.uid());
CREATE POLICY "invitations_update_admin" ON public.organization_invitations FOR UPDATE TO authenticated USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "invitations_delete_admin" ON public.organization_invitations FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX organization_invitations_org_idx ON public.organization_invitations(organization_id);