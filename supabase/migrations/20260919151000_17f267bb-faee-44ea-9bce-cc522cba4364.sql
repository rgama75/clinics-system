ALTER TABLE public.organization_invitations
  ADD COLUMN token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_token_key UNIQUE (token);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE (
  organization_name text,
  email text,
  role public.app_role,
  status text,
  expires_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.trade_name, i.email, i.role, i.status, i.expires_at
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = _token
$$;
REVOKE ALL ON FUNCTION public.get_invitation_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.organization_invitations%ROWTYPE;
  requester_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO inv FROM public.organization_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;
  IF inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending';
  END IF;
  IF inv.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = inv.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  requester_email := auth.email();
  IF requester_email IS NULL OR lower(requester_email) <> lower(inv.email) THEN
    RAISE EXCEPTION 'email_mismatch';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (inv.organization_id, auth.uid(), inv.role, 'active')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';

  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = inv.id;

  RETURN inv.organization_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
