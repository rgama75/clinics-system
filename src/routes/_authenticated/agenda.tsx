import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  professional_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

const schema = z.object({
  patient_name: z.string().trim().min(2, "Informe o nome do paciente.").max(160),
  professional_name: z.string().trim().max(160).optional(),
  date: z.string().min(1, "Selecione a data."),
  start_time: z.string().min(1, "Selecione o horário de início."),
  end_time: z.string().min(1, "Selecione o horário de término."),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  patient_name: "",
  professional_name: "",
  date: "",
  start_time: "",
  end_time: "",
  notes: "",
};

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
};

function Agenda() {
  const [orgId, setOrgId] = useState("");
  const [items, setItems] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadAppointments = async (organizationId: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("id, patient_name, professional_name, starts_at, ends_at, status")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true });
    setItems(data ?? []);
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
      await loadAppointments(membership.organization_id);
    })();
  }, []);

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

  const formatWhen = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const date = start.toLocaleDateString("pt-BR");
    const range = `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    return `${date} · ${range}`;
  };

  return (
    <AppShell title="Agenda">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">{module_.copy}</p>
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
              <div>
                <Label htmlFor="patient_name">Paciente</Label>
                <Input
                  id="patient_name"
                  className="mt-2"
                  value={form.patient_name}
                  onChange={(e) => set("patient_name", e.target.value)}
                  maxLength={160}
                  required
                />
              </div>
              <div>
                <Label htmlFor="professional_name">Profissional</Label>
                <Input
                  id="professional_name"
                  className="mt-2"
                  value={form.professional_name}
                  onChange={(e) => set("professional_name", e.target.value)}
                  maxLength={160}
                />
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

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Data/Horário</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <CalendarClock className="size-4" />
                    </div>
                    <p className="font-medium">{a.patient_name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.professional_name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatWhen(a.starts_at, a.ends_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[a.status] ?? "secondary"}>
                    {statusLabel[a.status] ?? a.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus agendamentos aparecerão aqui, organizados para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
