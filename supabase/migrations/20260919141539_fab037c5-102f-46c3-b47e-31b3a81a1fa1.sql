DROP POLICY "patients_update_admin" ON public.patients;
CREATE POLICY "patients_update_member" ON public.patients FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
