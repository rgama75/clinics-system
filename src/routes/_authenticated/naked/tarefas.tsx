import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ListTodo, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
import { canAccessNaked } from "@/components/naked/access";
import { CRM_TASK_STATUS_LABEL, CRM_TASK_STATUSES, type CrmTask } from "@/types/naked";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/naked/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — Naked CRM — ClinicFlow AI" },
      { name: "description", content: "Afazeres da equipe, com responsável e prazo." },
      { property: "og:title", content: "Tarefas — Naked CRM — ClinicFlow AI" },
      { property: "og:description", content: "Afazeres da equipe, com responsável e prazo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NakedTarefas,
});

const schema = z.object({
  title: z.string().trim().min(2, "Informe o título da tarefa.").max(200),
  description: z.string().trim().max(2000).optional(),
  due_at: z.string().optional(),
});

const emptyForm = { title: "", description: "", due_at: "" };

function isOverdue(task: CrmTask): boolean {
  return task.status === "pendente" && task.due_at !== null && new Date(task.due_at) < new Date();
}

function NakedTarefas() {
  const orgId = useOrganizationId();
  const canManage = canAccessNaked("tasks.manage");

  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [members, setMembers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [assignedTo, setAssignedTo] = useState("");
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadTasks = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_tasks")
      .select(
        "id, organization_id, title, description, due_at, status, assigned_to, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("due_at", { ascending: true, nullsFirst: false });
    setTasks(data ?? []);
  };

  const loadMembers = async (organizationId: string) => {
    const { data: memberRows } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("status", "active");
    const userIds = (memberRows ?? []).map((m) => m.user_id);
    if (userIds.length === 0) return;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    setMembers(
      userIds.map((id) => ({ user_id: id, full_name: nameById.get(id) ?? "Membro da equipe" })),
    );
  };

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        setCurrentUserId(auth.user.id);
        setAssignedTo(auth.user.id);
      }
    })();
  }, []);

  useEffect(() => {
    if (orgId) {
      void loadTasks(orgId);
      void loadMembers(orgId);
    }
  }, [orgId]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    });
  }, [tasks, search, statusFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setAssignedTo(currentUserId);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      if (!assignedTo) throw new Error("Selecione um responsável.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.from("crm_tasks").insert({
        organization_id: orgId,
        title: v.title,
        description: v.description || null,
        due_at: v.due_at ? new Date(v.due_at).toISOString() : null,
        assigned_to: assignedTo,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Tarefa criada com sucesso.");
      resetForm();
      setOpen(false);
      await loadTasks(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar a tarefa."));
    } finally {
      setBusy(false);
    }
  };

  const updateTaskStatus = async (task: CrmTask, status: string) => {
    try {
      const { error } = await supabase.from("crm_tasks").update({ status }).eq("id", task.id);
      if (error) throw error;
      if (orgId) await loadTasks(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a tarefa."));
    }
  };

  const nameByUserId = (userId: string) =>
    userId === currentUserId
      ? "Você"
      : (members.find((m) => m.user_id === userId)?.full_name ?? "Membro da equipe");

  return (
    <AppShell title="Tarefas" eyebrow="Naked CRM">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Afazeres da equipe, com responsável e prazo.
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
                Nova tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova tarefa</DialogTitle>
                <DialogDescription>
                  Preencha os dados para registrar uma nova tarefa.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    className="mt-2"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Responsável</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.user_id === currentUserId ? "Você" : m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="due_at">Prazo</Label>
                    <Input
                      id="due_at"
                      type="datetime-local"
                      className="mt-2"
                      value={form.due_at}
                      onChange={(e) => set("due_at", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    className="mt-2"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    maxLength={2000}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy ? "Salvando..." : "Criar tarefa"}
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
              placeholder="Buscar por título ou descrição..."
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
              {CRM_TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CRM_TASK_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <ListTodo className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {nameByUserId(task.assigned_to)}
                </TableCell>
                <TableCell className="text-sm">
                  <p className="text-muted-foreground">
                    {task.due_at ? new Date(task.due_at).toLocaleString("pt-BR") : "Sem prazo"}
                  </p>
                  {isOverdue(task) && (
                    <p className="mt-0.5 text-xs font-semibold text-warning">Atrasada</p>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={task.status}
                    onValueChange={(v) => void updateTaskStatus(task, v)}
                    disabled={!canManage}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CRM_TASK_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredTasks.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <ListTodo className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {tasks.length === 0
                  ? "Suas tarefas aparecerão aqui, organizadas para facilitar o dia a dia da equipe."
                  : "Nenhuma tarefa encontrada para essa busca ou filtro."}
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
