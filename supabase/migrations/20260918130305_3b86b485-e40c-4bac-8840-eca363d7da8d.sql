CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_org_member(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _organization_id AND user_id = _user_id AND status = 'active')
$$;
CREATE OR REPLACE FUNCTION private.is_org_admin(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _organization_id AND user_id = _user_id AND role = 'admin' AND status = 'active')
$$;
REVOKE ALL ON FUNCTION private.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_org_admin(uuid, uuid) TO authenticated, service_role;

ALTER POLICY "organizations_select_member_or_creator" ON public.organizations USING (created_by = auth.uid() OR private.is_org_member(id));
ALTER POLICY "organizations_update_admin" ON public.organizations USING (created_by = auth.uid() OR private.is_org_admin(id)) WITH CHECK (created_by = auth.uid() OR private.is_org_admin(id));
ALTER POLICY "members_select_org" ON public.organization_members USING (user_id = auth.uid() OR private.is_org_member(organization_id));
ALTER POLICY "members_insert_creator_or_admin" ON public.organization_members WITH CHECK ((user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())) OR private.is_org_admin(organization_id));
ALTER POLICY "members_update_admin" ON public.organization_members USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY "members_delete_admin" ON public.organization_members USING (private.is_org_admin(organization_id));
ALTER POLICY "units_select_member" ON public.units USING (private.is_org_member(organization_id));
ALTER POLICY "units_insert_admin_or_creator" ON public.units WITH CHECK (private.is_org_admin(organization_id) OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()));
ALTER POLICY "units_update_admin" ON public.units USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY "units_delete_admin" ON public.units USING (private.is_org_admin(organization_id));

REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.is_org_member(uuid, uuid);
DROP FUNCTION public.is_org_admin(uuid, uuid);