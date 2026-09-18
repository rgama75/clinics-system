CREATE TYPE public.app_role AS ENUM ('admin', 'professional', 'receptionist');
CREATE TYPE public.clinic_specialty AS ENUM ('aesthetics', 'dentistry', 'medicine');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  avatar_url text,
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  job_title text CHECK (job_title IS NULL OR char_length(job_title) <= 80),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name text NOT NULL CHECK (char_length(trade_name) BETWEEN 2 AND 120),
  legal_name text NOT NULL CHECK (char_length(legal_name) BETWEEN 2 AND 160),
  document text NOT NULL CHECK (char_length(document) BETWEEN 11 AND 18),
  specialty public.clinic_specialty NOT NULL,
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 30),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'professional',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _organization_id AND user_id = _user_id AND status = 'active')
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _organization_id AND user_id = _user_id AND role = 'admin' AND status = 'active')
$$;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;

CREATE POLICY "organizations_insert_creator" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "organizations_select_member_or_creator" ON public.organizations FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.is_org_member(id));
CREATE POLICY "organizations_update_admin" ON public.organizations FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_org_admin(id)) WITH CHECK (created_by = auth.uid() OR public.is_org_admin(id));
CREATE POLICY "organizations_delete_creator" ON public.organizations FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "members_select_org" ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_member(organization_id));
CREATE POLICY "members_insert_creator_or_admin" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()) OR public.is_org_admin(organization_id));
CREATE POLICY "members_update_admin" ON public.organization_members FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "members_delete_admin" ON public.organization_members FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  code text NOT NULL CHECK (char_length(code) BETWEEN 1 AND 20),
  is_headquarters boolean NOT NULL DEFAULT false,
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  postal_code text CHECK (postal_code IS NULL OR char_length(postal_code) <= 12),
  street text CHECK (street IS NULL OR char_length(street) <= 160),
  number text CHECK (number IS NULL OR char_length(number) <= 20),
  complement text CHECK (complement IS NULL OR char_length(complement) <= 80),
  neighborhood text CHECK (neighborhood IS NULL OR char_length(neighborhood) <= 80),
  city text CHECK (city IS NULL OR char_length(city) <= 80),
  state text CHECK (state IS NULL OR char_length(state) <= 2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_select_member" ON public.units FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "units_insert_admin_or_creator" ON public.units FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id) OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()));
CREATE POLICY "units_update_admin" ON public.units FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "units_delete_admin" ON public.units FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);
CREATE INDEX units_organization_idx ON public.units(organization_id);