import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History, Plus, Search, Target } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { formatPhoneBR } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { canAccessNaked } from "@/components/naked/access";
import {
  CRM_CONTACT_TYPE_LABEL,
  CRM_CONTACT_TYPES,
  CRM_LEAD_OPEN_STAGES,
  CRM_LEAD_STAGE_LABEL,
  CRM_LEAD_STAGES,
  type CrmContactHistoryEntry,
  type CrmContactType,
  type CrmLead,
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

export const Route = createFileRoute("/_authenticated/naked/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Naked CRM — ClinicFlow AI" },
      {
        name: "description",
        content: "Acompanhe oportunidades e registre contatos até a conversão em cliente.",
      },
      { property: "og:title", content: "Leads — Naked CRM — ClinicFlow AI" },
      {
        property: "og:description",
        content: "Acompanhe oportunidades e registre contatos até a conversão em cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NakedLeads,
});

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do lead.").max(160),
  phone: z
    .string()
    .trim()
    .min(1, "Informe o telefone.")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um telefone válido."),
  procedure: z.string().trim().min(2, "Informe o procedimento de interesse.").max(160),
  source: z.string().trim().max(160).optional(),
});

const emptyForm = { name: "", phone: "", procedure: "", source: "" };

const stageVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  novo: "secondary",
  em_contato: "outline",
  negociacao: "default",
  virou_cliente: "default",
  perdido: "destructive",
};

function daysStalled(lead: CrmLead): number | null {
  if (!CRM_LEAD_OPEN_STAGES.includes(lead.stage)) return null;
  const reference = lead.last_contact_date ?? lead.created_at;
  const days = Math.floor((Date.now() - new Date(reference).getTime()) / 86_400_000);
  return days >= 60 ? days : null;
}

function NakedLeads() {
  const orgId = useOrganizationId();
  const canManage = canAccessNaked("leads.manage");

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const [procedures, setProcedures] = useState<{ id: string; name: string }[]>([]);
  const [procedureSuggestOpen, setProcedureSuggestOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [history, setHistory] = useState<CrmContactHistoryEntry[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyForm, setHistoryForm] = useState<{ contact_type: CrmContactType; notes: string }>({
    contact_type: "outro",
    notes: "",
  });

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

  const loadLeads = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_leads")
      .select(
        "id, organization_id, name, phone, procedure, source, stage, last_contact_date, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setLeads(rows);
    await ensureProfiles(rows.map((l) => l.created_by));
  };

  const loadProcedures = async (organizationId: string) => {
    const { data } = await supabase
      .from("procedures")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    setProcedures(data ?? []);
  };

  useEffect(() => {
    if (orgId) {
      void loadLeads(orgId);
      void loadProcedures(orgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const procedureMatches = form.procedure.trim()
    ? procedures
        .filter((p) => p.name.toLowerCase().includes(form.procedure.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.procedure.toLowerCase().includes(q)
      );
    });
  }, [leads, search, stageFilter]);

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.from("crm_leads").insert({
        organization_id: orgId,
        name: v.name,
        phone: v.phone,
        procedure: v.procedure,
        source: v.source || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Lead cadastrado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadLeads(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível cadastrar o lead."));
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async (leadId: string) => {
    const { data } = await supabase
      .from("crm_contacts_history")
      .select(
        "id, organization_id, lead_id, contact_type, notes, occurred_at, created_by, created_at",
      )
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false });
    const entries = data ?? [];
    setHistory(entries);
    await ensureProfiles(entries.map((h) => h.created_by));
  };

  const openHistory = (lead: CrmLead) => {
    setSelectedLead(lead);
    setHistoryForm({ contact_type: "outro", notes: "" });
    void loadHistory(lead.id);
  };

  const registerContact = async () => {
    if (!selectedLead || !orgId) return;
    setHistoryBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("crm_contacts_history").insert({
        organization_id: orgId,
        lead_id: selectedLead.id,
        contact_type: historyForm.contact_type,
        notes: historyForm.notes.trim() || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Contato registrado.");
      setHistoryForm({ contact_type: "outro", notes: "" });
      await loadHistory(selectedLead.id);
      await loadLeads(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível registrar o contato."));
    } finally {
      setHistoryBusy(false);
    }
  };

  return (
    <AppShell title="Leads" eyebrow="Naked CRM">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Acompanhe oportunidades e registre contatos até a conversão em cliente.
        </p>
        {canManage && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setForm(emptyForm);
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!orgId}>
                <Plus />
                Novo lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lead</DialogTitle>
                <DialogDescription>
                  Preencha os dados para registrar um novo lead.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    className="mt-2"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={160}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      className="mt-2"
                      value={form.phone}
                      onChange={(e) => set("phone", formatPhoneBR(e.target.value))}
                      maxLength={15}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Label htmlFor="procedure">Procedimento</Label>
                    <Input
                      id="procedure"
                      className="mt-2"
                      placeholder="Digite para buscar um procedimento"
                      value={form.procedure}
                      onChange={(e) => {
                        set("procedure", e.target.value);
                        setProcedureSuggestOpen(true);
                      }}
                      onFocus={() => setProcedureSuggestOpen(true)}
                      onBlur={() => setTimeout(() => setProcedureSuggestOpen(false), 150)}
                      autoComplete="off"
                      maxLength={160}
                      required
                    />
                    {procedureSuggestOpen && procedureMatches.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                        {procedureMatches.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                set("procedure", p.name);
                                setProcedureSuggestOpen(false);
                              }}
                            >
                              {p.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="source">Origem</Label>
                  <Input
                    id="source"
                    className="mt-2"
                    placeholder="Ex.: Instagram, indicação, site (opcional)"
                    value={form.source}
                    onChange={(e) => set("source", e.target.value)}
                    maxLength={160}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy ? "Salvando..." : "Cadastrar lead"}
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
              placeholder="Buscar por nome, telefone ou procedimento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter(v as typeof stageFilter)}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {CRM_LEAD_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {CRM_LEAD_STAGE_LABEL[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Último contato</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => {
              const stalled = daysStalled(lead);
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Target className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.procedure}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell>
                    <Badge variant={stageVariant[lead.stage] ?? "secondary"}>
                      {CRM_LEAD_STAGE_LABEL[lead.stage] ?? lead.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {profileNames.get(lead.created_by) ?? "Membro da equipe"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="text-muted-foreground">
                      {lead.last_contact_date
                        ? new Date(lead.last_contact_date).toLocaleString("pt-BR")
                        : "Sem contato ainda"}
                    </p>
                    {stalled !== null && (
                      <p className="mt-0.5 text-xs font-semibold text-warning">
                        Parado há {stalled} dias
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Ver histórico de contatos"
                      onClick={() => openHistory(lead)}
                    >
                      <History />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredLeads.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <Target className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {leads.length === 0
                  ? "Seus leads aparecerão aqui, organizados para facilitar o dia a dia da equipe."
                  : "Nenhum lead encontrado para essa busca ou filtro."}
              </p>
            </div>
          </div>
        )}
      </section>

      <Dialog open={selectedLead !== null} onOpenChange={(next) => !next && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de contatos</DialogTitle>
            <DialogDescription>{selectedLead?.name}</DialogDescription>
          </DialogHeader>

          {canManage && (
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de contato</Label>
                  <Select
                    value={historyForm.contact_type}
                    onValueChange={(v) =>
                      setHistoryForm((f) => ({ ...f, contact_type: v as CrmContactType }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_CONTACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CRM_CONTACT_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="history_notes">Observações</Label>
                <Textarea
                  id="history_notes"
                  className="mt-2"
                  value={historyForm.notes}
                  onChange={(e) => setHistoryForm((f) => ({ ...f, notes: e.target.value }))}
                  maxLength={2000}
                  rows={2}
                />
              </div>
              <Button
                className="justify-self-end"
                onClick={() => void registerContact()}
                disabled={historyBusy}
              >
                {historyBusy ? "Registrando..." : "Registrar contato"}
              </Button>
            </div>
          )}

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {CRM_CONTACT_TYPE_LABEL[entry.contact_type] ?? entry.contact_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.occurred_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {entry.notes && <p className="mt-2 text-muted-foreground">{entry.notes}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  Registrado por {profileNames.get(entry.created_by) ?? "Membro da equipe"}
                </p>
              </div>
            ))}
            {history.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum contato registrado para este lead ainda.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
