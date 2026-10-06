import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ListTodo, Receipt, Sun, Target } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
import {
  crmInstallmentIsOverdue,
  crmLeadDaysStalled,
  crmTodayISODate,
  type CrmChargeInstallment,
  type CrmLead,
  type CrmProjectSession,
  type CrmTask,
} from "@/types/naked";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/naked/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — Naked CRM — ClinicFlow AI" },
      { name: "description", content: "O que precisa da sua atenção hoje." },
      { property: "og:title", content: "Hoje — Naked CRM — ClinicFlow AI" },
      { property: "og:description", content: "O que precisa da sua atenção hoje." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NakedHoje,
});

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function NakedHoje() {
  const orgId = useOrganizationId();
  const [currentUserId, setCurrentUserId] = useState("");

  const [sessions, setSessions] = useState<CrmProjectSession[]>([]);
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());

  const [installments, setInstallments] = useState<CrmChargeInstallment[]>([]);
  const [chargeDescriptions, setChargeDescriptions] = useState<Map<string, string>>(new Map());

  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());

  const [stalledLeads, setStalledLeads] = useState<CrmLead[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);

  const ensureClientNames = async (clientIds: string[]) => {
    const missing = Array.from(new Set(clientIds)).filter((id) => !clientNames.has(id));
    if (missing.length === 0) return;
    const { data } = await supabase.from("crm_clients").select("id, name").in("id", missing);
    setClientNames((prev) => {
      const next = new Map(prev);
      for (const c of data ?? []) next.set(c.id, c.name);
      return next;
    });
  };

  const loadSessions = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_project_sessions")
      .select(
        "id, organization_id, project_id, session_number, scheduled_at, status, notes, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "agendada")
      .gte("scheduled_at", startOfTodayISO())
      .lte("scheduled_at", endOfTodayISO())
      .order("scheduled_at", { ascending: true });
    const rows = data ?? [];
    setSessions(rows);
    const projectIds = Array.from(new Set(rows.map((s) => s.project_id)));
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("crm_projects")
        .select("id, name, client_id")
        .in("id", projectIds);
      setProjectNames((prev) => {
        const next = new Map(prev);
        for (const p of projects ?? []) next.set(p.id, p.name);
        return next;
      });
      await ensureClientNames((projects ?? []).map((p) => p.client_id));
    }
  };

  const loadInstallments = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_charge_installments")
      .select(
        "id, organization_id, charge_id, installment_number, amount, due_date, status, paid_at, notes, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "pendente")
      .lte("due_date", crmTodayISODate())
      .order("due_date", { ascending: true });
    const rows = data ?? [];
    setInstallments(rows);
    const chargeIds = Array.from(new Set(rows.map((i) => i.charge_id)));
    if (chargeIds.length > 0) {
      const { data: charges } = await supabase
        .from("crm_charges")
        .select("id, description, client_id")
        .in("id", chargeIds);
      setChargeDescriptions((prev) => {
        const next = new Map(prev);
        for (const c of charges ?? []) next.set(c.id, c.description);
        return next;
      });
      await ensureClientNames((charges ?? []).map((c) => c.client_id));
    }
  };

  const loadLeads = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_leads")
      .select(
        "id, organization_id, name, phone, procedure, source, stage, last_contact_date, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("stage", ["novo", "em_contato", "negociacao"]);
    const rows = (data ?? []).filter((l) => crmLeadDaysStalled(l) !== null);
    setStalledLeads(rows);
  };

  const loadTasks = async (organizationId: string, userId: string) => {
    const { data } = await supabase
      .from("crm_tasks")
      .select(
        "id, organization_id, title, description, due_at, status, assigned_to, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "pendente")
      .eq("assigned_to", userId)
      .lte("due_at", endOfTodayISO())
      .order("due_at", { ascending: true });
    setTasks(data ?? []);
  };

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) setCurrentUserId(auth.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    void loadSessions(orgId);
    void loadInstallments(orgId);
    void loadLeads(orgId);
    if (currentUserId) void loadTasks(orgId, currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentUserId]);

  const completeSession = async (session: CrmProjectSession) => {
    try {
      const { error } = await supabase
        .from("crm_project_sessions")
        .update({ status: "realizada" })
        .eq("id", session.id);
      if (error) throw error;
      if (orgId) await loadSessions(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a sessão."));
    }
  };

  const payInstallment = async (installment: CrmChargeInstallment) => {
    try {
      const { error } = await supabase
        .from("crm_charge_installments")
        .update({ status: "pago", paid_at: new Date().toISOString() })
        .eq("id", installment.id);
      if (error) throw error;
      if (orgId) await loadInstallments(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a parcela."));
    }
  };

  const completeTask = async (task: CrmTask) => {
    try {
      const { error } = await supabase
        .from("crm_tasks")
        .update({ status: "concluida" })
        .eq("id", task.id);
      if (error) throw error;
      if (orgId) await loadTasks(orgId, currentUserId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a tarefa."));
    }
  };

  return (
    <AppShell title="Hoje" eyebrow="Naked CRM">
      <p className="max-w-xl text-sm text-muted-foreground">
        O que precisa da sua atenção hoje, reunido num só lugar.
      </p>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Sessões de hoje</h2>
            <span className="text-xs text-muted-foreground">({sessions.length})</span>
          </div>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {projectNames.get(session.project_id) ?? "Projeto"} — Sessão{" "}
                    {session.session_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.scheduled_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void completeSession(session)}>
                  <CheckCircle2 />
                  Realizada
                </Button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma sessão agendada para hoje.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Parcelas a vencer</h2>
            <span className="text-xs text-muted-foreground">({installments.length})</span>
          </div>
          <div className="mt-4 space-y-3">
            {installments.map((installment) => (
              <div
                key={installment.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {chargeDescriptions.get(installment.charge_id) ?? "Cobrança"} — Parcela{" "}
                    {installment.installment_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currency.format(installment.amount)} · vence{" "}
                    {new Date(`${installment.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
                    {crmInstallmentIsOverdue(installment) && (
                      <span className="ml-1 font-semibold text-warning">(atrasada)</span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void payInstallment(installment)}
                >
                  <CheckCircle2 />
                  Paga
                </Button>
              </div>
            ))}
            {installments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma parcela vencendo hoje ou atrasada.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Leads parados</h2>
            <span className="text-xs text-muted-foreground">({stalledLeads.length})</span>
          </div>
          <div className="mt-4 space-y-3">
            {stalledLeads.map((lead) => (
              <div key={lead.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{lead.name}</p>
                <p className="text-xs font-semibold text-warning">
                  Parado há {crmLeadDaysStalled(lead)} dias
                </p>
              </div>
            ))}
            {stalledLeads.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum lead parado no momento.
              </p>
            )}
            {stalledLeads.length > 0 && (
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link to="/naked/leads">Ver todos os leads</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Suas tarefas de hoje</h2>
            <span className="text-xs text-muted-foreground">({tasks.length})</span>
          </div>
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.due_at ? new Date(task.due_at).toLocaleString("pt-BR") : "Sem prazo"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void completeTask(task)}>
                  <CheckCircle2 />
                  Concluir
                </Button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa sua para hoje.
              </p>
            )}
          </div>
        </section>
      </div>

      {sessions.length === 0 &&
        installments.length === 0 &&
        stalledLeads.length === 0 &&
        tasks.length === 0 && (
          <div className="mt-5 grid place-items-center rounded-lg border bg-card px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sun className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo em dia</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Nada precisa da sua atenção agora. Volte mais tarde.
              </p>
            </div>
          </div>
        )}
    </AppShell>
  );
}
