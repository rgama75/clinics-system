-- Naked CRM — foundation (Bloco 2): clientes + conversão lead → cliente.
-- Um cliente só existe a partir da conversão de um lead (crm_convert_lead_to_client);
-- não há INSERT direto liberado para authenticated nesta tabela de propósito —
-- isso mantém "virou_cliente só via conversão" garantido também no banco.

CREATE TABLE public.crm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL UNIQUE REFERENCES public.crm_leads(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 30),
  cpf text NOT NULL CHECK (char_length(cpf) BETWEEN 11 AND 14),
  birth_date date NOT NULL,
  postal_code text NOT NULL CHECK (char_length(postal_code) BETWEEN 8 AND 12),
  street text NOT NULL CHECK (char_length(street) BETWEEN 2 AND 160),
  number text NOT NULL CHECK (char_length(number) BETWEEN 1 AND 20),
  complement text CHECK (complement IS NULL OR char_length(complement) <= 80),
  neighborhood text NOT NULL CHECK (char_length(neighborhood) BETWEEN 2 AND 80),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  state text NOT NULL CHECK (char_length(state) = 2),
  allergies text NOT NULL CHECK (char_length(allergies) BETWEEN 2 AND 2000),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, cpf)
);

GRANT SELECT, UPDATE ON public.crm_clients TO authenticated;
GRANT ALL ON public.crm_clients TO service_role;
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_clients_select_member" ON public.crm_clients FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "crm_clients_update_member" ON public.crm_clients FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "crm_clients_delete_admin" ON public.crm_clients FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_crm_clients_updated_at BEFORE UPDATE ON public.crm_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX crm_clients_organization_idx ON public.crm_clients(organization_id);

-- Converte um lead em cliente de forma atômica: cria o registro de cliente com
-- os dados complementares obrigatórios e muda a etapa do lead para
-- 'virou_cliente' — a única forma pela qual essa etapa é atingida.
CREATE OR REPLACE FUNCTION public.crm_convert_lead_to_client(
  _lead_id uuid,
  _cpf text,
  _birth_date date,
  _postal_code text,
  _street text,
  _number text,
  _complement text,
  _neighborhood text,
  _city text,
  _state text,
  _allergies text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  lead public.crm_leads%ROWTYPE;
  new_client_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.';
  END IF;

  SELECT * INTO lead FROM public.crm_leads WHERE id = _lead_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado.';
  END IF;

  IF NOT private.is_org_member(lead.organization_id) THEN
    RAISE EXCEPTION 'Você não tem acesso a este lead.';
  END IF;

  IF lead.stage = 'virou_cliente' THEN
    RAISE EXCEPTION 'Este lead já foi convertido em cliente.';
  END IF;

  INSERT INTO public.crm_clients (
    organization_id, lead_id, name, phone, cpf, birth_date,
    postal_code, street, number, complement, neighborhood, city, state,
    allergies, created_by
  ) VALUES (
    lead.organization_id, lead.id, lead.name, lead.phone, _cpf, _birth_date,
    _postal_code, _street, _number, _complement, _neighborhood, _city, _state,
    _allergies, auth.uid()
  )
  RETURNING id INTO new_client_id;

  UPDATE public.crm_leads SET stage = 'virou_cliente', updated_at = now() WHERE id = lead.id;

  RETURN new_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_convert_lead_to_client(uuid, text, date, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_convert_lead_to_client(uuid, text, date, text, text, text, text, text, text, text, text) TO authenticated;
