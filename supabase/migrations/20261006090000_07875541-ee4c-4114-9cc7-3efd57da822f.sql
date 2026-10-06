-- Naked CRM — foundation (Bloco 1): leads + histórico de contatos.
-- Demais tabelas do Naked CRM (crm_clients, crm_projects, crm_project_sessions,
-- crm_charges, crm_charge_installments, crm_tasks) entram em migrations novas,
-- uma por bloco, conforme cada tela for construída.

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 30),
  procedure text NOT NULL CHECK (char_length(procedure) BETWEEN 2 AND 160),
  source text CHECK (source IS NULL OR char_length(source) <= 160),
  stage text NOT NULL DEFAULT 'novo'
    CHECK (stage IN ('novo', 'em_contato', 'negociacao', 'virou_cliente', 'perdido')),
  last_contact_date timestamptz,
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_contacts_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'outro'
    CHECK (contact_type IN ('ligacao', 'whatsapp', 'email', 'presencial', 'outro')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Registrar um contato atualiza o last_contact_date do lead — nunca retrocede
-- a data caso o contato seja lançado com occurred_at no passado.
CREATE OR REPLACE FUNCTION public.crm_touch_lead_last_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.crm_leads
  SET last_contact_date = GREATEST(COALESCE(last_contact_date, NEW.occurred_at), NEW.occurred_at),
      updated_at = now()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_contacts_history_touch_lead
AFTER INSERT ON public.crm_contacts_history
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_lead_last_contact();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_leads', 'crm_contacts_history']
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

CREATE INDEX crm_leads_stage_idx ON public.crm_leads(organization_id, stage);
CREATE INDEX crm_contacts_history_lead_idx ON public.crm_contacts_history(lead_id);
