import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
import { canAccessNaked } from "@/components/naked/access";
import {
  CRM_PROJECT_SESSION_STATUS_LABEL,
  CRM_PROJECT_SESSION_STATUSES,
  CRM_PROJECT_STATUS_LABEL,
  CRM_PROJECT_STATUSES,
  type CrmProject,
  type CrmProjectSession,
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

export const Route = createFileRoute("/_authenticated/naked/projetos")({
  head: () => ({
    meta: [
      { title: "Projetos — Naked CRM — ClinicFlow AI" },
      { name: "description", content: "Planos de tratamento dos clientes e suas sessões." },
      { property: "og:title", content: "Projetos — Naked CRM — ClinicFlow AI" },
      { property: "og:description", content: "Planos de tratamento dos clientes e suas sessões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NakedProjetos,
});

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do projeto.").max(160),
  procedure: z.string().trim().min(2, "Informe o procedimento.").max(160),
  planned_sessions: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = { name: "", procedure: "", planned_sessions: "", notes: "" };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  em_andamento: "default",
  concluido: "secondary",
  cancelado: "destructive",
};

function NakedProjetos() {
  const orgId = useOrganizationId();
  const canManage = canAccessNaked("projects.manage");

  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSuggestOpen, setClientSuggestOpen] = useState(false);

  const [procedures, setProcedures] = useState<{ id: string; name: string }[]>([]);
  const [procedureSuggestOpen, setProcedureSuggestOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const [selectedProject, setSelectedProject] = useState<CrmProject | null>(null);
  const [sessions, setSessions] = useState<CrmProjectSession[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [projectStatusBusy, setProjectStatusBusy] = useState(false);
  const [sessionForm, setSessionForm] = useState({ scheduled_at: "", notes: "" });

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

  const loadProjects = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_projects")
      .select(
        "id, organization_id, client_id, name, procedure, status, planned_sessions, notes, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setProjects(rows);
    await ensureProfiles(rows.map((p) => p.created_by));
    const clientIds = Array.from(new Set(rows.map((p) => p.client_id)));
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
      void loadProjects(orgId);
      void loadClients(orgId);
      void loadProcedures(orgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const clientMatches = clientQuery.trim()
    ? clients
        .filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const procedureMatches = form.procedure.trim()
    ? procedures
        .filter((p) => p.name.toLowerCase().includes(form.procedure.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const client = clientNames.get(p.client_id) ?? "";
      return (
        p.name.toLowerCase().includes(q) ||
        p.procedure.toLowerCase().includes(q) ||
        client.toLowerCase().includes(q)
      );
    });
  }, [projects, search, statusFilter, clientNames]);

  const resetForm = () => {
    setForm(emptyForm);
    setClientQuery("");
    setClientId("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      if (!clientId) throw new Error("Selecione um cliente da lista.");
      const plannedRaw = (v.planned_sessions ?? "").trim();
      let planned: number | null = null;
      if (plannedRaw) {
        planned = Number(plannedRaw);
        if (!Number.isInteger(planned) || planned <= 0) {
          throw new Error("Informe um número de sessões planejadas válido.");
        }
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.from("crm_projects").insert({
        organization_id: orgId,
        client_id: clientId,
        name: v.name,
        procedure: v.procedure,
        planned_sessions: planned,
        notes: v.notes || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Projeto criado com sucesso.");
      resetForm();
      setOpen(false);
      await loadProjects(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar o projeto."));
    } finally {
      setBusy(false);
    }
  };

  const loadSessions = async (projectId: string) => {
    const { data } = await supabase
      .from("crm_project_sessions")
      .select(
        "id, organization_id, project_id, session_number, scheduled_at, status, notes, created_by, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("session_number", { ascending: true });
    setSessions(data ?? []);
  };

  const openSessions = (project: CrmProject) => {
    setSelectedProject(project);
    setSessionForm({ scheduled_at: "", notes: "" });
    void loadSessions(project.id);
  };

  const addSession = async () => {
    if (!selectedProject || !orgId) return;
    setSessionBusy(true);
    try {
      if (!sessionForm.scheduled_at) throw new Error("Informe a data da sessão.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const nextNumber = sessions.reduce((max, s) => Math.max(max, s.session_number), 0) + 1;
      const { error } = await supabase.from("crm_project_sessions").insert({
        organization_id: orgId,
        project_id: selectedProject.id,
        session_number: nextNumber,
        scheduled_at: new Date(sessionForm.scheduled_at).toISOString(),
        notes: sessionForm.notes.trim() || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Sessão adicionada.");
      setSessionForm({ scheduled_at: "", notes: "" });
      await loadSessions(selectedProject.id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível adicionar a sessão."));
    } finally {
      setSessionBusy(false);
    }
  };

  const updateSessionStatus = async (session: CrmProjectSession, status: string) => {
    try {
      const { error } = await supabase
        .from("crm_project_sessions")
        .update({ status })
        .eq("id", session.id);
      if (error) throw error;
      if (selectedProject) await loadSessions(selectedProject.id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a sessão."));
    }
  };

  const updateProjectStatus = async (status: string) => {
    if (!selectedProject || !orgId) return;
    setProjectStatusBusy(true);
    try {
      const { error } = await supabase
        .from("crm_projects")
        .update({ status })
        .eq("id", selectedProject.id);
      if (error) throw error;
      setSelectedProject((p) => (p ? { ...p, status } : p));
      await loadProjects(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar o status do projeto."));
    } finally {
      setProjectStatusBusy(false);
    }
  };

  return (
    <AppShell title="Projetos" eyebrow="Naked CRM">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Planos de tratamento dos clientes, com suas sessões.
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
                Novo projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo projeto</DialogTitle>
                <DialogDescription>
                  Preencha os dados para registrar um novo plano de tratamento.
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
                  <Label htmlFor="name">Nome do projeto</Label>
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
                  <div>
                    <Label htmlFor="planned_sessions">Sessões planejadas</Label>
                    <Input
                      id="planned_sessions"
                      type="number"
                      min={1}
                      className="mt-2"
                      placeholder="Opcional"
                      value={form.planned_sessions}
                      onChange={(e) => set("planned_sessions", e.target.value)}
                    />
                  </div>
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
                  {busy ? "Salvando..." : "Criar projeto"}
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
              placeholder="Buscar por projeto, cliente ou procedimento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {CRM_PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CRM_PROJECT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sessões planejadas</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <ClipboardList className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.procedure}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {clientNames.get(project.client_id) ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[project.status] ?? "secondary"}>
                    {CRM_PROJECT_STATUS_LABEL[project.status] ?? project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {project.planned_sessions ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {profileNames.get(project.created_by) ?? "Membro da equipe"}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Ver sessões"
                    onClick={() => openSessions(project)}
                  >
                    <CalendarClock />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredProjects.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {projects.length === 0
                  ? "Seus projetos aparecerão aqui, organizados para facilitar o dia a dia da equipe."
                  : "Nenhum projeto encontrado para essa busca ou filtro."}
              </p>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={selectedProject !== null}
        onOpenChange={(next) => !next && setSelectedProject(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sessões do projeto</DialogTitle>
            <DialogDescription>{selectedProject?.name}</DialogDescription>
          </DialogHeader>

          <div>
            <Label>Status do projeto</Label>
            <Select
              value={selectedProject?.status ?? "em_andamento"}
              onValueChange={(v) => void updateProjectStatus(v)}
              disabled={projectStatusBusy || !canManage}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CRM_PROJECT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canManage && (
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="session_scheduled_at">Data e hora</Label>
                  <Input
                    id="session_scheduled_at"
                    type="datetime-local"
                    className="mt-2"
                    value={sessionForm.scheduled_at}
                    onChange={(e) =>
                      setSessionForm((f) => ({ ...f, scheduled_at: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="session_notes">Observações</Label>
                <Textarea
                  id="session_notes"
                  className="mt-2"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                  maxLength={2000}
                  rows={2}
                />
              </div>
              <Button
                className="justify-self-end"
                onClick={() => void addSession()}
                disabled={sessionBusy}
              >
                {sessionBusy ? "Adicionando..." : "Adicionar sessão"}
              </Button>
            </div>
          )}

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">Sessão {session.session_number}</p>
                  <Select
                    value={session.status}
                    onValueChange={(v) => void updateSessionStatus(session, v)}
                    disabled={!canManage}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_PROJECT_SESSION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CRM_PROJECT_SESSION_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {new Date(session.scheduled_at).toLocaleString("pt-BR")}
                </p>
                {session.notes && <p className="mt-2 text-muted-foreground">{session.notes}</p>}
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma sessão registrada para este projeto ainda.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProject(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
