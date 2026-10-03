import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock3,
  DollarSign,
  Plus,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/clinicflow/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão geral — ClinicFlow AI" },
      { name: "description", content: "Acompanhe a operação e configuração da sua clínica." },
      { property: "og:title", content: "Visão geral — ClinicFlow AI" },
      {
        property: "og:description",
        content: "Acompanhe a operação e configuração da sua clínica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type TodayAppointment = {
  id: string;
  patient_name: string;
  procedure: string | null;
  professional_name: string | null;
  starts_at: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusPillClass: Record<string, string> = {
  scheduled: "bg-warning/12 text-warning",
  confirmed: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function Dashboard() {
  const [orgCount, setOrgCount] = useState(0);
  const [units, setUnits] = useState(0);
  const [members, setMembers] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [todayDelta, setTodayDelta] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [newPatientsThisMonth, setNewPatientsThisMonth] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [revenueDeltaPct, setRevenueDeltaPct] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [attendanceDeltaPp, setAttendanceDeltaPp] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: o } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", u.user.id)
        .eq("status", "active");
      setOrgCount(o?.length ?? 0);
      const ids = o?.map((x) => x.organization_id) ?? [];
      if (ids.length === 0) return;
      const [{ count: uc }, { count: mc }] = await Promise.all([
        supabase
          .from("units")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
      ]);
      setUnits(uc ?? 0);
      setMembers(mc ?? 0);

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = addDays(todayStart, 1);
      const yesterdayStart = addDays(todayStart, -1);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const window30Start = addDays(now, -30);
      const window60Start = addDays(now, -60);

      const [
        { data: todays },
        { count: yesterdayCount },
        { count: totalPatients },
        { count: newPatients },
        { data: incomeThisMonth },
        { data: incomeLastMonth },
        { data: recentAppts },
        { data: priorAppts },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, patient_name, procedure, professional_name, starts_at, status")
          .in("organization_id", ids)
          .gte("starts_at", todayStart.toISOString())
          .lt("starts_at", todayEnd.toISOString())
          .order("starts_at", { ascending: true }),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids)
          .gte("starts_at", yesterdayStart.toISOString())
          .lt("starts_at", todayStart.toISOString()),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids)
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("financial_entries")
          .select("amount")
          .in("organization_id", ids)
          .eq("entry_type", "income")
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("financial_entries")
          .select("amount")
          .in("organization_id", ids)
          .eq("entry_type", "income")
          .gte("created_at", lastMonthStart.toISOString())
          .lt("created_at", monthStart.toISOString()),
        supabase
          .from("appointments")
          .select("status")
          .in("organization_id", ids)
          .in("status", ["completed", "cancelled"])
          .gte("starts_at", window30Start.toISOString())
          .lt("starts_at", now.toISOString()),
        supabase
          .from("appointments")
          .select("status")
          .in("organization_id", ids)
          .in("status", ["completed", "cancelled"])
          .gte("starts_at", window60Start.toISOString())
          .lt("starts_at", window30Start.toISOString()),
      ]);

      setTodayAppointments(todays ?? []);
      setTodayDelta((todays?.length ?? 0) - (yesterdayCount ?? 0));
      setPatientCount(totalPatients ?? 0);
      setNewPatientsThisMonth(newPatients ?? 0);

      const sumAmount = (rows: { amount: number }[] | null) =>
        (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
      const thisMonthSum = sumAmount(incomeThisMonth);
      const lastMonthSum = sumAmount(incomeLastMonth);
      setRevenueThisMonth(thisMonthSum);
      setRevenueDeltaPct(
        lastMonthSum > 0 ? ((thisMonthSum - lastMonthSum) / lastMonthSum) * 100 : null,
      );

      const rate = (rows: { status: string }[] | null) => {
        const list = rows ?? [];
        if (list.length === 0) return null;
        return (list.filter((r) => r.status === "completed").length / list.length) * 100;
      };
      const recentRate = rate(recentAppts);
      const priorRate = rate(priorAppts);
      setAttendanceRate(recentRate);
      setAttendanceDeltaPp(
        recentRate !== null && priorRate !== null ? recentRate - priorRate : null,
      );

      setLoadingStats(false);
    })();
  }, []);

  if (!orgCount)
    return (
      <AppShell title="Visão geral">
        <div className="rounded-lg border bg-card p-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
            <Plus />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold">
            Configure sua primeira clínica
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Cadastre os dados essenciais e criaremos sua unidade matriz automaticamente.
          </p>
          <Button asChild className="mt-6">
            <Link to="/onboarding">Começar configuração</Link>
          </Button>
        </div>
      </AppShell>
    );

  const cards: Array<{
    label: string;
    value: string;
    delta: string | null;
    deltaDown?: boolean;
    icon: typeof CalendarCheck;
  }> = [
    {
      label: "Agendamentos hoje",
      value: String(todayAppointments.length),
      delta:
        todayDelta === 0 ? "Igual a ontem" : `${todayDelta > 0 ? "+" : ""}${todayDelta} vs ontem`,
      deltaDown: todayDelta < 0,
      icon: CalendarCheck,
    },
    {
      label: "Pacientes cadastrados",
      value: String(patientCount),
      delta: `+${newPatientsThisMonth} este mês`,
      icon: UsersRound,
    },
    {
      label: "Receita no mês",
      value: currency.format(revenueThisMonth),
      delta:
        revenueDeltaPct === null
          ? null
          : `${revenueDeltaPct >= 0 ? "+" : ""}${revenueDeltaPct.toFixed(0)}%`,
      deltaDown: (revenueDeltaPct ?? 0) < 0,
      icon: DollarSign,
    },
    {
      label: "Taxa de comparecimento",
      value: attendanceRate === null ? "—" : `${Math.round(attendanceRate)}%`,
      delta:
        attendanceDeltaPp === null
          ? null
          : `${attendanceDeltaPp >= 0 ? "+" : ""}${attendanceDeltaPp.toFixed(0)} p.p.`,
      deltaDown: (attendanceDeltaPp ?? 0) < 0,
      icon: Clock3,
    },
  ];

  return (
    <AppShell title="Visão geral" eyebrow={greeting()}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                <c.icon className="size-4" />
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <b className="font-display text-2xl">{loadingStats ? "…" : c.value}</b>
              {c.delta && !loadingStats && (
                <span
                  className={`flex items-center text-xs font-semibold ${c.deltaDown ? "text-destructive" : "text-success"}`}
                >
                  {c.deltaDown ? (
                    <ArrowDownRight className="size-3" />
                  ) : (
                    <ArrowUpRight className="size-3" />
                  )}
                  {c.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <section className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Agenda de hoje</h2>
              <p className="text-sm text-muted-foreground">Próximos atendimentos da unidade</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/agenda">Ver agenda</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-2">
            {todayAppointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {loadingStats ? "Carregando..." : "Nenhum agendamento para hoje."}
              </p>
            ) : (
              todayAppointments.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b py-4 last:border-0"
                >
                  <span className="text-sm font-semibold">
                    {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{a.patient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.procedure ?? a.professional_name ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`hidden rounded-full px-2.5 py-1 text-xs sm:block ${statusPillClass[a.status] ?? statusPillClass["scheduled"]}`}
                  >
                    {statusLabel[a.status] ?? a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Configuração inicial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deixe sua operação pronta para a equipe.
          </p>
          <div className="mt-6 space-y-5">
            {[
              ["Dados da clínica", orgCount > 0],
              ["Unidade matriz", units > 0],
              ["Convidar a equipe", members > 1],
            ].map(([l, done]) => (
              <div key={String(l)} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <Circle className="size-5 text-muted-foreground/40" />
                )}
                <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  {l}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.round(([orgCount > 0, units > 0, members > 1].filter(Boolean).length / 3) * 100)}%`,
              }}
            />
          </div>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/configuracoes">Continuar configuração</Link>
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
