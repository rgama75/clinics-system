import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Receipt, ListChecks, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
import { canAccessNaked } from "@/components/naked/access";
import {
  CRM_CHARGE_STATUS_LABEL,
  CRM_CHARGE_STATUSES,
  CRM_INSTALLMENT_STATUS_LABEL,
  CRM_INSTALLMENT_STATUSES,
  type CrmCharge,
  type CrmChargeInstallment,
} from "@/types/naked";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/naked/cobrancas")({
  head: () => ({
    meta: [
      { title: "Cobranças — Naked CRM — ClinicFlow AI" },
      { name: "description", content: "Cobranças dos clientes e suas parcelas." },
      { property: "og:title", content: "Cobranças — Naked CRM — ClinicFlow AI" },
      { property: "og:description", content: "Cobranças dos clientes e suas parcelas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NakedCobrancas,
});

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const schema = z.object({
  description: z.string().trim().min(2, "Informe a descrição da cobrança.").max(200),
  total_amount: z
    .string()
    .min(1, "Informe o valor total.")
    .refine((v) => Number(v) > 0, "Informe um valor total válido."),
  installments_count: z
    .string()
    .min(1, "Informe o número de parcelas.")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
      "Informe um número de parcelas válido.",
    ),
  first_due_date: z.string().min(1, "Informe a data do primeiro vencimento."),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  description: "",
  total_amount: "",
  installments_count: "1",
  first_due_date: "",
  notes: "",
};

const chargeStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ativa: "default",
  cancelada: "destructive",
};

const installmentStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendente: "outline",
  pago: "default",
  cancelado: "destructive",
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(installment: CrmChargeInstallment): boolean {
  return installment.status === "pendente" && installment.due_date < todayISODate();
}

function NakedCobrancas() {
  const orgId = useOrganizationId();
  const canManage = canAccessNaked("charges.manage");

  const [charges, setCharges] = useState<CrmCharge[]>([]);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSuggestOpen, setClientSuggestOpen] = useState(false);

  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string }[]>([]);
  const [projectId, setProjectId] = useState("none");

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const [selectedCharge, setSelectedCharge] = useState<CrmCharge | null>(null);
  const [installments, setInstallments] = useState<CrmChargeInstallment[]>([]);
  const [chargeStatusBusy, setChargeStatusBusy] = useState(false);

  const ensureProfiles = async (ids: string[]) => {
    const missing = Array.from(new Set(ids)).filter((id) => !profileNames.has(id));
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", missing);
    setProfileNames((prev) => {
      const next = new Map(prev);
      for (const p of data ?? []) next.set(p.id, p.full_name);
      return next;
    });
  };

  const loadCharges = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_charges")
      .select(
        "id, organization_id, client_id, project_id, description, total_amount, status, notes, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setCharges(rows);
    await ensureProfiles(rows.map((c) => c.created_by));
    const clientIds = Array.from(new Set(rows.map((c) => c.client_id)));
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from("crm_clients")
        .select("id, name")
        .in("id", clientIds);
      setClientNames((prev) => {
        const next = new Map(prev);
        for (const c of clientsData ?? []) next.set(c.id, c.name);
        return next;
      });
    }
  };

  const loadClients = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_clients")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    setClients(data ?? []);
  };

  const loadProjects = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_projects")
      .select("id, name, client_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    setProjects(data ?? []);
  };

  useEffect(() => {
    if (orgId) {
      void loadCharges(orgId);
      void loadClients(orgId);
      void loadProjects(orgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const clientMatches = clientQuery.trim()
    ? clients
        .filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const clientProjects = clientId ? projects.filter((p) => p.client_id === clientId) : [];

  const filteredCharges = useMemo(() => {
    const q = search.trim().toLowerCase();
    return charges.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      const client = clientNames.get(c.client_id) ?? "";
      return c.description.toLowerCase().includes(q) || client.toLowerCase().includes(q);
    });
  }, [charges, search, statusFilter, clientNames]);

  const resetForm = () => {
    setForm(emptyForm);
    setClientQuery("");
    setClientId("");
    setProjectId("none");
  };

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      if (!clientId) throw new Error("Selecione um cliente da lista.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.rpc("crm_create_charge_with_installments", {
        _client_id: clientId,
        _project_id: projectId === "none" ? null : projectId,
        _description: v.description,
        _total_amount: Number(v.total_amount),
        _installments_count: Number(v.installments_count),
        _first_due_date: v.first_due_date,
        _notes: v.notes || null,
      });
      if (error) throw error;
      toast.success("Cobrança criada com sucesso.");
      resetForm();
      setOpen(false);
      await loadCharges(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar a cobrança."));
    } finally {
      setBusy(false);
    }
  };

  const loadInstallments = async (chargeId: string) => {
    const { data } = await supabase
      .from("crm_charge_installments")
      .select(
        "id, organization_id, charge_id, installment_number, amount, due_date, status, paid_at, notes, created_by, created_at, updated_at",
      )
      .eq("charge_id", chargeId)
      .is("deleted_at", null)
      .order("installment_number", { ascending: true });
    setInstallments(data ?? []);
  };

  const openInstallments = (charge: CrmCharge) => {
    setSelectedCharge(charge);
    void loadInstallments(charge.id);
  };

  const updateInstallmentStatus = async (installment: CrmChargeInstallment, status: string) => {
    try {
      const { error } = await supabase
        .from("crm_charge_installments")
        .update({ status, paid_at: status === "pago" ? new Date().toISOString() : null })
        .eq("id", installment.id);
      if (error) throw error;
      if (selectedCharge) await loadInstallments(selectedCharge.id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a parcela."));
    }
  };

  const updateChargeStatus = async (status: string) => {
    if (!selectedCharge || !orgId) return;
    setChargeStatusBusy(true);
    try {
      const { error } = await supabase
        .from("crm_charges")
        .update({ status })
        .eq("id", selectedCharge.id);
      if (error) throw error;
      setSelectedCharge((c) => (c ? { ...c, status } : c));
      await loadCharges(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a cobrança."));
    } finally {
      setChargeStatusBusy(false);
    }
  };

  return (
    <AppShell title="Cobranças" eyebrow="Naked CRM">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Cobranças dos clientes, divididas em parcelas.
        </p>
        {canManage && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!orgId}>
                <Plus />
                Nova cobrança
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova cobrança</DialogTitle>
                <DialogDescription>
                  Preencha os dados para gerar a cobrança e suas parcelas.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="relative">
                  <Label htmlFor="client">Cliente</Label>
                  <Input
                    id="client"
                    className="mt-2"
                    placeholder="Digite para buscar um cliente"
                    value={clientQuery}
                    onChange={(e) => {
                      setClientQuery(e.target.value);
                      setClientId("");
                      setProjectId("none");
                      setClientSuggestOpen(true);
                    }}
                    onFocus={() => setClientSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setClientSuggestOpen(false), 150)}
                    autoComplete="off"
                    maxLength={160}
                    required
                  />
                  {clientSuggestOpen && clientMatches.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                      {clientMatches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setClientQuery(c.name);
                              setClientId(c.id);
                              setProjectId("none");
                              setClientSuggestOpen(false);
                            }}
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <Label>Projeto (opcional)</Label>
                  <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clientProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    className="mt-2"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="total_amount">Valor total (R$)</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-2"
                      value={form.total_amount}
                      onChange={(e) => set("total_amount", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="installments_count">Número de parcelas</Label>
                    <Input
                      id="installments_count"
                      type="number"
                      min="1"
                      className="mt-2"
                      value={form.installments_count}
                      onChange={(e) => set("installments_count", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="first_due_date">Primeiro vencimento</Label>
                  <Input
                    id="first_due_date"
                    type="date"
                    className="mt-2"
                    value={form.first_due_date}
                    onChange={(e) => set("first_due_date", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    className="mt-2"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    maxLength={2000}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy ? "Salvando..." : "Criar cobrança"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por descrição ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {CRM_CHARGE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CRM_CHARGE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cobrança</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCharges.map((charge) => (
              <TableRow key={charge.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <Receipt className="size-4" />
                    </div>
                    <p className="font-medium">{charge.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {clientNames.get(charge.client_id) ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {currency.format(charge.total_amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={chargeStatusVariant[charge.status] ?? "secondary"}>
                    {CRM_CHARGE_STATUS_LABEL[charge.status] ?? charge.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {profileNames.get(charge.created_by) ?? "Membro da equipe"}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Ver parcelas"
                    onClick={() => openInstallments(charge)}
                  >
                    <ListChecks />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredCharges.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {charges.length === 0
                  ? "Suas cobranças aparecerão aqui, organizadas para facilitar o dia a dia da equipe."
                  : "Nenhuma cobrança encontrada para essa busca ou filtro."}
              </p>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={selectedCharge !== null}
        onOpenChange={(next) => !next && setSelectedCharge(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Parcelas da cobrança</DialogTitle>
            <DialogDescription>
              {selectedCharge?.description} —{" "}
              {selectedCharge ? currency.format(selectedCharge.total_amount) : ""}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label>Status da cobrança</Label>
            <Select
              value={selectedCharge?.status ?? "ativa"}
              onValueChange={(v) => void updateChargeStatus(v)}
              disabled={chargeStatusBusy || !canManage}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_CHARGE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CRM_CHARGE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {installments.map((installment) => (
              <div key={installment.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    Parcela {installment.installment_number} — {currency.format(installment.amount)}
                  </p>
                  <Select
                    value={installment.status}
                    onValueChange={(v) => void updateInstallmentStatus(installment, v)}
                    disabled={!canManage}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_INSTALLMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CRM_INSTALLMENT_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={installmentStatusVariant[installment.status] ?? "secondary"}>
                    {CRM_INSTALLMENT_STATUS_LABEL[installment.status] ?? installment.status}
                  </Badge>
                  <p className="text-muted-foreground">
                    Vencimento:{" "}
                    {new Date(`${installment.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {isOverdue(installment) && (
                  <p className="mt-1 text-xs font-semibold text-warning">Atrasada</p>
                )}
                {installment.notes && (
                  <p className="mt-2 text-muted-foreground">{installment.notes}</p>
                )}
              </div>
            ))}
            {installments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma parcela encontrada para esta cobrança.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCharge(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
