import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { getErrorMessage } from "@/lib/errors";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const module_ = modules.find((m) => m.slug === "agenda")!;

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Agenda — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agenda,
});

type Appointment = {
  id: string;
  patient_name: string;
  procedure: string | null;
  professional_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
};

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const schema = z.object({
  patient_name: z.string().trim().min(2, "Informe o nome do paciente.").max(160),
  procedure: z.string().trim().max(200).optional(),
  professional_name: z.string().trim().max(160).optional(),
  date: z.string().min(1, "Selecione a data."),
  start_time: z.string().min(1, "Selecione o horário de início."),
  end_time: z.string().min(1, "Selecione o horário de término."),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  patient_name: "",
  procedure: "",
  professional_name: "",
  date: "",
  start_time: "",
  end_time: "",
  notes: "",
};

const statusBlockClass: Record<string, string> = {
  scheduled: "border-secondary-foreground/20 bg-secondary text-secondary-foreground",
  confirmed: "border-primary/40 bg-primary/15 text-primary",
  completed: "border-border bg-muted text-muted-foreground",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive line-through",
};

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 32;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function minutesSinceMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const date = start.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `${date} · ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type PlacedAppointment = {
  appt: Appointment;
  col: number;
  cols: number;
  startMin: number;
  endMin: number;
};

function layoutDayEvents(dayAppointments: Appointment[]): PlacedAppointment[] {
  const sorted = [...dayAppointments].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  type Placing = { appt: Appointment; col: number; startMin: number; endMin: number };
  const clusters: Placing[][] = [];
  let current: Placing[] = [];
  let currentEnd = -Infinity;
  for (const appt of sorted) {
    const startMin = minutesSinceMidnight(appt.starts_at);
    const endMin = Math.max(minutesSinceMidnight(appt.ends_at), startMin + 15);
    if (current.length && startMin >= currentEnd) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    const activeCols = current.filter((p) => p.endMin > startMin).map((p) => p.col);
    let col = 0;
    while (activeCols.includes(col)) col++;
    current.push({ appt, col, startMin, endMin });
    currentEnd = Math.max(currentEnd, endMin);
  }
  if (current.length) clusters.push(current);
  const result: PlacedAppointment[] = [];
  for (const cluster of clusters) {
    const cols = Math.max(...cluster.map((p) => p.col)) + 1;
    for (const p of cluster) result.push({ ...p, cols });
  }
  return result;
}

function Agenda() {
  const [orgId, setOrgId] = useState("");
  const [items, setItems] = useState<Appointment[]>([]);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [procedures, setProcedures] = useState<{ id: string; name: string }[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string }[]>([]);
  const [patientSuggestOpen, setPatientSuggestOpen] = useState(false);
  const [procedureSuggestOpen, setProcedureSuggestOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadAppointments = async (organizationId: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("id, patient_name, procedure, professional_name, starts_at, ends_at, status, notes")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true });
    setItems(data ?? []);
  };

  const loadPatients = async (organizationId: string) => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });
    setPatients(data ?? []);
  };

  const loadProcedures = async (organizationId: string) => {
    const { data } = await supabase
      .from("procedures")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    setProcedures(data ?? []);
  };

  const loadProfessionals = async (organizationId: string) => {
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("role", ["admin", "professional"]);
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) {
      setProfessionals([]);
      return;
    }
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    setProfessionals(profs ?? []);
  };

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!membership) return;
      setOrgId(membership.organization_id);
      await Promise.all([
        loadAppointments(membership.organization_id),
        loadPatients(membership.organization_id),
        loadProcedures(membership.organization_id),
        loadProfessionals(membership.organization_id),
      ]);
    })();
  }, []);

  const patientMatches = form.patient_name.trim()
    ? patients
        .filter((p) => p.full_name.toLowerCase().includes(form.patient_name.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const procedureMatches = form.procedure.trim()
    ? procedures
        .filter((p) => p.name.toLowerCase().includes(form.procedure.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      const startsAt = new Date(`${v.date}T${v.start_time}`);
      const endsAt = new Date(`${v.date}T${v.end_time}`);
      if (!(endsAt > startsAt)) throw new Error("O horário de término deve ser depois do início.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.from("appointments").insert({
        organization_id: orgId,
        patient_name: v.patient_name,
        procedure: v.procedure || null,
        professional_name: v.professional_name || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        notes: v.notes || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Agendamento criado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadAppointments(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar o agendamento."));
    } finally {
      setBusy(false);
    }
  };

  const weekStart = useMemo(() => startOfWeek(cursorDate), [cursorDate]);
  const daysToShow = useMemo(
    () =>
      view === "day" ? [cursorDate] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [view, cursorDate, weekStart],
  );

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return capitalize(
        cursorDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      );
    }
    if (view === "month") {
      return capitalize(cursorDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
    }
    const last = addDays(weekStart, 6);
    const from = weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const to = last.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${from} – ${to}`;
  }, [view, cursorDate, weekStart]);

  const dayLayouts = useMemo(
    () =>
      daysToShow.map((day) =>
        layoutDayEvents(
          items.filter((a) => new Date(a.starts_at).toDateString() === day.toDateString()),
        ),
      ),
    [daysToShow, items],
  );

  const monthMatrix = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursorDate));
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursorDate]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of items) {
      const key = new Date(a.starts_at).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }
    return map;
  }, [items]);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentMonth = cursorDate.getMonth();

  const goPrev = () => {
    if (view === "day") setCursorDate((d) => addDays(d, -1));
    else if (view === "week") setCursorDate((d) => addDays(d, -7));
    else setCursorDate((d) => addMonths(d, -1));
  };
  const goNext = () => {
    if (view === "day") setCursorDate((d) => addDays(d, 1));
    else if (view === "week") setCursorDate((d) => addDays(d, 7));
    else setCursorDate((d) => addMonths(d, 1));
  };
  const goToday = () => setCursorDate(new Date());

  return (
    <AppShell title="Agenda">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">{module_.copy}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-medium"
              onClick={goToday}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={goPrev}
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={goNext}
              aria-label="Próximo"
            >
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-1 px-2 text-sm font-medium capitalize">{rangeLabel}</span>
          </div>
          <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
            <SelectTrigger className="h-9 w-44">
              <CalendarDays className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoje</SelectItem>
              <SelectItem value="week">Próximos 7 dias</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
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
                {module_.action}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo agendamento</DialogTitle>
                <DialogDescription>
                  Preencha os dados para registrar um novo agendamento.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="relative">
                  <Label htmlFor="patient_name">Paciente</Label>
                  <Input
                    id="patient_name"
                    className="mt-2"
                    value={form.patient_name}
                    onChange={(e) => {
                      set("patient_name", e.target.value);
                      setPatientSuggestOpen(true);
                    }}
                    onFocus={() => setPatientSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setPatientSuggestOpen(false), 150)}
                    autoComplete="off"
                    maxLength={160}
                    required
                  />
                  {patientSuggestOpen && patientMatches.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                      {patientMatches.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              set("patient_name", p.full_name);
                              setPatientSuggestOpen(false);
                            }}
                          >
                            {p.full_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="relative">
                  <Label htmlFor="procedure">Procedimento</Label>
                  <Input
                    id="procedure"
                    className="mt-2"
                    value={form.procedure}
                    onChange={(e) => {
                      set("procedure", e.target.value);
                      setProcedureSuggestOpen(true);
                    }}
                    onFocus={() => setProcedureSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setProcedureSuggestOpen(false), 150)}
                    autoComplete="off"
                    maxLength={200}
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
                  <Label htmlFor="professional_name">Profissional</Label>
                  <Select
                    {...(form.professional_name ? { value: form.professional_name } : {})}
                    onValueChange={(v) => set("professional_name", v)}
                  >
                    <SelectTrigger id="professional_name" className="mt-2">
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum profissional encontrado
                        </div>
                      ) : (
                        professionals.map((p) => (
                          <SelectItem key={p.id} value={p.full_name}>
                            {p.full_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      className="mt-2"
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_time">Início</Label>
                    <Input
                      id="start_time"
                      type="time"
                      className="mt-2"
                      value={form.start_time}
                      onChange={(e) => set("start_time", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Término</Label>
                    <Input
                      id="end_time"
                      type="time"
                      className="mt-2"
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                      required
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
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy ? "Criando..." : "Criar agendamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={selectedAppointment !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedAppointment(null);
        }}
      >
        <DialogContent>
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAppointment.patient_name}</DialogTitle>
                <DialogDescription>
                  {formatDateTimeRange(selectedAppointment.starts_at, selectedAppointment.ends_at)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBlockClass[selectedAppointment.status] ?? statusBlockClass["scheduled"]}`}
                  >
                    {statusLabel[selectedAppointment.status] ?? selectedAppointment.status}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-muted-foreground">Procedimento</span>
                  <span className="font-medium">{selectedAppointment.procedure ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">
                    {selectedAppointment.professional_name ?? "—"}
                  </span>
                </div>
                {selectedAppointment.notes && (
                  <div className="border-t pt-3">
                    <p className="mb-1 text-muted-foreground">Observações</p>
                    <p className="whitespace-pre-wrap">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {view === "month" ? (
        <section className="mt-7 overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-7 border-b">
            {monthMatrix.slice(0, 7).map((day) => (
              <div
                key={day.toISOString()}
                className="border-l px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground first:border-l-0"
              >
                {day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
              </div>
            ))}
          </div>
          <div
            className="grid grid-cols-7 grid-rows-6"
            style={{ height: GRID_HEIGHT + HOUR_HEIGHT }}
          >
            {monthMatrix.map((day) => {
              const isToday = day.toDateString() === now.toDateString();
              const inMonth = day.getMonth() === currentMonth;
              const dayItems = itemsByDate.get(day.toDateString()) ?? [];
              const visible = dayItems.slice(0, 3);
              return (
                <div
                  key={day.toISOString()}
                  className={`overflow-hidden border-b border-l p-1 first:border-l-0 ${inMonth ? "" : "bg-muted/30"}`}
                >
                  <span
                    className={`inline-flex size-5 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {visible.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        title={`${formatTime(a.starts_at)} · ${a.patient_name}${a.procedure ? ` · ${a.procedure}` : ""}`}
                        onClick={() => setSelectedAppointment(a)}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight hover:opacity-80 ${statusBlockClass[a.status] ?? statusBlockClass["scheduled"]}`}
                      >
                        {formatTime(a.starts_at)} {a.patient_name}
                      </button>
                    ))}
                    {dayItems.length > visible.length && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{dayItems.length - visible.length} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mt-7 overflow-hidden rounded-lg border bg-card">
          <div
            className={`grid border-b ${view === "day" ? "grid-cols-[56px_1fr]" : "grid-cols-[56px_repeat(7,1fr)]"}`}
          >
            <div />
            {daysToShow.map((day) => {
              const isToday = day.toDateString() === now.toDateString();
              return (
                <div
                  key={day.toISOString()}
                  className={`border-l px-2 py-2 text-center ${isToday ? "bg-primary/5" : ""}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                  </p>
                  <p
                    className={`text-base font-semibold ${isToday ? "text-primary" : "text-foreground"}`}
                  >
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          <div
            className={`grid ${view === "day" ? "grid-cols-[56px_1fr]" : "grid-cols-[56px_repeat(7,1fr)]"}`}
          >
            <div className="relative">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map(
                (hour) => (
                  <div
                    key={hour}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-t px-2 text-right text-[10px] text-muted-foreground first:border-t-0"
                  >
                    <span className="relative -top-1.5">{`${String(hour).padStart(2, "0")}:00`}</span>
                  </div>
                ),
              )}
            </div>
            {daysToShow.map((day, dayIndex) => {
              const isToday = day.toDateString() === now.toDateString();
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-l"
                  style={{ height: GRID_HEIGHT }}
                >
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i).map((i) => (
                    <div
                      key={i}
                      className="border-t first:border-t-0"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}
                  {isToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
                      style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT }}
                    />
                  )}
                  {dayLayouts[dayIndex]?.map(({ appt, col, cols, startMin, endMin }) => {
                    const top = Math.max(0, ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT);
                    const height = Math.max(
                      14,
                      ((Math.min(endMin, END_HOUR * 60) - Math.max(startMin, START_HOUR * 60)) /
                        60) *
                        HOUR_HEIGHT,
                    );
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => setSelectedAppointment(appt)}
                        className={`absolute overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight shadow-xs hover:opacity-80 ${statusBlockClass[appt.status] ?? statusBlockClass["scheduled"]}`}
                        style={{
                          top,
                          height,
                          left: `${(col / cols) * 100}%`,
                          width: `calc(${100 / cols}% - 3px)`,
                        }}
                        title={`${appt.patient_name}${appt.procedure ? ` · ${appt.procedure}` : ""}`}
                      >
                        <p className="truncate font-semibold">{appt.patient_name}</p>
                        {appt.procedure && <p className="truncate opacity-80">{appt.procedure}</p>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {items.length === 0 && (
            <div className="grid min-h-40 place-items-center border-t px-5 py-10 text-center text-sm text-muted-foreground">
              Seus agendamentos aparecerão aqui, organizados para facilitar o dia a dia da equipe.
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
