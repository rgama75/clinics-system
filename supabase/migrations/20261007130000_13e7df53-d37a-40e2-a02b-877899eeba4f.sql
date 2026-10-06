-- Naked CRM — foundation (Bloco 5): tarefas da equipe.
-- Tarefa é independente de lead/cliente/projeto/cobrança nesta entrega —
-- só uma lista de afazeres da equipe, com responsável e prazo opcional.

CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  due_at timestamptz,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
  assigned_to uuid NOT NULL,
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_tasks_select_member" ON public.crm_tasks FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "crm_tasks_insert_member" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "crm_tasks_update_member" ON public.crm_tasks FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "crm_tasks_delete_admin" ON public.crm_tasks FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX crm_tasks_organization_idx ON public.crm_tasks(organization_id);
CREATE INDEX crm_tasks_assigned_to_idx ON public.crm_tasks(assigned_to);
