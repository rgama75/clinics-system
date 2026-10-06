-- Naked CRM — foundation (Bloco 4): cobranças e parcelas.
-- Uma cobrança pertence a um cliente (e, opcionalmente, a um projeto) e é
-- sempre criada já com suas parcelas, de forma atômica, via
-- crm_create_charge_with_installments — por isso não há INSERT direto
-- liberado para authenticated em nenhuma das duas tabelas.
-- "Atrasada" não é um status guardado: é calculado na tela a partir de
-- due_date, igual ao "Parado há N dias" dos leads — nada muda sozinho.

CREATE TABLE public.crm_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.crm_clients(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.crm_projects(id) ON DELETE SET NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 2 AND 200),
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount > 0),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_charge_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  charge_id uuid NOT NULL REFERENCES public.crm_charges(id) ON DELETE CASCADE,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  paid_at timestamptz,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charge_id, installment_number)
);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_charges', 'crm_charge_installments']
  LOOP
    EXECUTE format('GRANT SELECT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%1$s_select_member" ON public.%1$I FOR SELECT TO authenticated USING (private.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "%1$s_update_member" ON public.%1$I FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "%1$s_delete_admin" ON public.%1$I FOR DELETE TO authenticated USING (private.is_org_admin(organization_id))', t);
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
    EXECUTE format('CREATE INDEX %1$s_organization_idx ON public.%1$I(organization_id)', t);
  END LOOP;
END $$;

CREATE INDEX crm_charges_client_idx ON public.crm_charges(client_id);
CREATE INDEX crm_charge_installments_charge_idx ON public.crm_charge_installments(charge_id);

-- Cria a cobrança e já gera as parcelas numa única transação, dividindo o
-- valor total igualmente (a última parcela absorve o resto do arredondamento)
-- com vencimentos mensais a partir da primeira data informada.
CREATE OR REPLACE FUNCTION public.crm_create_charge_with_installments(
  _client_id uuid,
  _project_id uuid,
  _description text,
  _total_amount numeric,
  _installments_count integer,
  _first_due_date date,
  _notes text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_org uuid;
  new_charge_id uuid;
  base_amount numeric(12, 2);
  remainder numeric(12, 2);
  i integer;
  due date;
  amt numeric(12, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.';
  END IF;

  SELECT organization_id INTO client_org
  FROM public.crm_clients WHERE id = _client_id AND deleted_at IS NULL;
  IF client_org IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  IF NOT private.is_org_member(client_org) THEN
    RAISE EXCEPTION 'Você não tem acesso a este cliente.';
  END IF;

  IF _project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.crm_projects
      WHERE id = _project_id AND client_id = _client_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Projeto inválido para este cliente.';
    END IF;
  END IF;

  IF _installments_count < 1 THEN
    RAISE EXCEPTION 'Informe ao menos 1 parcela.';
  END IF;

  IF _total_amount <= 0 THEN
    RAISE EXCEPTION 'Informe um valor total válido.';
  END IF;

  INSERT INTO public.crm_charges (
    organization_id, client_id, project_id, description, total_amount, notes, created_by
  ) VALUES (
    client_org, _client_id, _project_id, _description, _total_amount, _notes, auth.uid()
  )
  RETURNING id INTO new_charge_id;

  base_amount := trunc(_total_amount / _installments_count, 2);
  remainder := _total_amount - (base_amount * _installments_count);

  FOR i IN 1.._installments_count LOOP
    due := (_first_due_date + ((i - 1) * INTERVAL '1 month'))::date;
    amt := base_amount;
    IF i = _installments_count THEN
      amt := base_amount + remainder;
    END IF;
    INSERT INTO public.crm_charge_installments (
      organization_id, charge_id, installment_number, amount, due_date, created_by
    ) VALUES (
      client_org, new_charge_id, i, amt, due, auth.uid()
    );
  END LOOP;

  RETURN new_charge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_create_charge_with_installments(uuid, uuid, text, numeric, integer, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_create_charge_with_installments(uuid, uuid, text, numeric, integer, date, text) TO authenticated;
