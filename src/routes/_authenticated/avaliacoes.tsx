import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
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

const module_ = modules.find((m) => m.slug === "avaliacoes")!;

export const Route = createFileRoute("/_authenticated/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Avaliações — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Avaliacoes,
});

type Evaluation = {
  id: string;
  patient_name: string;
  evaluation_type: string | null;
  summary: string | null;
  evaluated_at: string;
};

const schema = z.object({
  patient_name: z.string().trim().min(2, "Informe o nome do paciente.").max(160),
  evaluation_type: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(2000).optional(),
  evaluated_at: z.string().min(1, "Selecione a data."),
});

const emptyForm = { patient_name: "", evaluation_type: "", summary: "", evaluated_at: "" };

function Avaliacoes() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Evaluation[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [procedures, setProcedures] = useState<{ id: string; name: string }[]>([]);
  const [patientSuggestOpen, setPatientSuggestOpen] = useState(false);
  const [procedureSuggestOpen, setProcedureSuggestOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("evaluations")
      .select("id, patient_name, evaluation_type, summary, evaluated_at")
      .eq("organization_id", organizationId)
      .order("evaluated_at", { ascending: false });
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

  useEffect(() => {
    if (orgId) {
      void loadItems(orgId);
      void loadPatients(orgId);
      void loadProcedures(orgId);
    }
  }, [orgId]);

  const patientMatches = form.patient_name.trim()
    ? patients
        .filter((p) => p.full_name.toLowerCase().includes(form.patient_name.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const procedureMatches = form.evaluation_type.trim()
    ? procedures
        .filter((p) => p.name.toLowerCase().includes(form.evaluation_type.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.from("evaluations").insert({
        organization_id: orgId,
        patient_name: v.patient_name,
        evaluation_type: v.evaluation_type || null,
        summary: v.summary || null,
        evaluated_at: new Date(v.evaluated_at).toISOString(),
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Avaliação registrada com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível registrar a avaliação."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Avaliações">
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
              <DialogTitle>Nova avaliação</DialogTitle>
              <DialogDescription>
                Preencha os dados para registrar uma nova avaliação.
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
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Label htmlFor="evaluation_type">Procedimento</Label>
                  <Input
                    id="evaluation_type"
                    className="mt-2"
                    placeholder="Digite para buscar um procedimento"
                    value={form.evaluation_type}
                    onChange={(e) => {
                      set("evaluation_type", e.target.value);
                      setProcedureSuggestOpen(true);
                    }}
                    onFocus={() => setProcedureSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setProcedureSuggestOpen(false), 150)}
                    autoComplete="off"
                    maxLength={120}
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
                              set("evaluation_type", p.name);
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
                  <Label htmlFor="evaluated_at">Data</Label>
                  <Input
                    id="evaluated_at"
                    type="datetime-local"
                    className="mt-2"
                    value={form.evaluated_at}
                    onChange={(e) => set("evaluated_at", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="summary">Resumo / plano</Label>
                <Textarea
                  id="summary"
                  className="mt-2"
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
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
                {busy ? "Salvando..." : "Registrar avaliação"}
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
              <TableHead>Procedimento</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <Star className="size-4" />
                    </div>
                    <p className="font-medium">{ev.patient_name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ev.evaluation_type ?? "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {ev.summary ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(ev.evaluated_at).toLocaleString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <Star className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Suas avaliações aparecerão aqui, organizadas para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
