import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
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

const module_ = modules.find((m) => m.slug === "relatorios")!;

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Relatórios — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

type Report = {
  id: string;
  title: string;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

const schema = z.object({
  title: z.string().trim().min(2, "Informe o título do relatório.").max(160),
  report_type: z.enum(["financial", "clinical", "operational", "custom"]),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  title: "",
  report_type: "operational" as "financial" | "clinical" | "operational" | "custom",
  period_start: "",
  period_end: "",
  notes: "",
};

const typeLabel: Record<string, string> = {
  financial: "Financeiro",
  clinical: "Clínico",
  operational: "Operacional",
  custom: "Personalizado",
};

function Relatorios() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("reports")
      .select("id, title, report_type, period_start, period_end, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    if (orgId) void loadItems(orgId);
  }, [orgId]);

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase.from("reports").insert({
        organization_id: orgId,
        title: v.title,
        report_type: v.report_type,
        period_start: v.period_start || null,
        period_end: v.period_end || null,
        notes: v.notes || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Relatório gerado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível gerar o relatório."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Relatórios">
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
              <DialogTitle>Gerar relatório</DialogTitle>
              <DialogDescription>
                Escolha o tipo e o período para gerar um novo relatório.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    className="mt-2"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    maxLength={160}
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.report_type}
                    onValueChange={(v) => set("report_type", v as typeof form.report_type)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="clinical">Clínico</SelectItem>
                      <SelectItem value="operational">Operacional</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="period_start">Período de</Label>
                  <Input
                    id="period_start"
                    type="date"
                    className="mt-2"
                    value={form.period_start}
                    onChange={(e) => set("period_start", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="period_end">Período até</Label>
                  <Input
                    id="period_end"
                    type="date"
                    className="mt-2"
                    value={form.period_end}
                    onChange={(e) => set("period_end", e.target.value)}
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
                {busy ? "Gerando..." : "Gerar relatório"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Relatório</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Gerado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <BarChart3 className="size-4" />
                    </div>
                    <p className="font-medium">{r.title}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{typeLabel[r.report_type] ?? r.report_type}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.period_start && r.period_end
                    ? `${new Date(`${r.period_start}T00:00:00`).toLocaleDateString("pt-BR")} – ${new Date(`${r.period_end}T00:00:00`).toLocaleDateString("pt-BR")}`
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus relatórios aparecerão aqui, organizados para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
