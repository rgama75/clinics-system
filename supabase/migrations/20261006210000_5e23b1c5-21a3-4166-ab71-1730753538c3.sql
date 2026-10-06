-- Naked CRM — foundation (Bloco 3): projetos (planos de tratamento) e suas sessões.
-- Um projeto pertence a um cliente já convertido; sessões pertencem a um projeto.
-- Sem mudança automática de status — tudo é alterado manualmente pela equipe.

CREATE TABLE public.crm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.crm_clients(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  procedure text NOT NULL CHECK (char_length(procedure) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  planned_sessions integer CHECK (planned_sessions IS NULL OR planned_sessions > 0),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_project_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.crm_projects(id) ON DELETE CASCADE,
  session_number integer NOT NULL CHECK (session_number > 0),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendada'
    CHECK (status IN ('agendada', 'realizada', 'cancelada', 'falta')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, session_number)
);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_projects', 'crm_project_sessions']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%1$s_select_member" ON public.%1$I FOR SELECT TO authenticated USING (private.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "%1$s_insert_member" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid())', t);
    EXECUTE format('CREATE POLICY "%1$s_update_member" ON public.%1$I FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "%1$s_delete_admin" ON public.%1$I FOR DELETE TO authenticated USING (private.is_org_admin(organization_id))', t);
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
    EXECUTE format('CREATE INDEX %1$s_organization_idx ON public.%1$I(organization_id)', t);
  END LOOP;
END $$;

CREATE INDEX crm_projects_client_idx ON public.crm_projects(client_id);
CREATE INDEX crm_project_sessions_project_idx ON public.crm_project_sessions(project_id);
