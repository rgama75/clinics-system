-- Let teammates see each other's basic profile (name, avatar, job title) so the
-- Equipe list can show real names instead of a generic placeholder. Read-only,
-- scoped to users who share an active organization membership.
CREATE POLICY "profiles_select_org_peers" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members me
    JOIN public.organization_members peer ON peer.organization_id = me.organization_id
    WHERE me.user_id = auth.uid()
      AND me.status = 'active'
      AND peer.user_id = profiles.id
      AND peer.status = 'active'
  )
);
