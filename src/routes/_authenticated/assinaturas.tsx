import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Repeat2 } from "lucide-react";
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

const module_ = modules.find((m) => m.slug === "assinaturas")!;

export const Route = createFileRoute("/_authenticated/assinaturas")({
  head: () => ({
    meta: [
      { title: "Assinaturas — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Assinaturas — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assinaturas,
});

type Subscription = {
  id: string;
  client_name: string;
  plan_name: string;
  amount: number | null;
  billing_cycle: string;
  status: string;
};

const schema = z.object({
  client_name: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
  plan_name: z.string().trim().min(2, "Informe o nome do plano.").max(160),
  amount: z.string().optional(),
  billing_cycle: z.enum(["monthly", "quarterly", "yearly"]),
  status: z.enum(["active", "paused", "cancelled"]),
});

const emptyForm = {
  client_name: "",
  plan_name: "",
  amount: "",
  billing_cycle: "monthly" as "monthly" | "quarterly" | "yearly",
  status: "active" as "active" | "paused" | "cancelled",
};

const cycleLabel: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};
const statusLabel: Record<string, string> = {
  active: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paused: "secondary",
  cancelled: "destructive",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Assinaturas() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Subscription[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, client_name, plan_name, amount, billing_cycle, status")
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
      const { error } = await supabase.from("subscriptions").insert({
        organization_id: orgId,
        client_name: v.client_name,
        plan_name: v.plan_name,
        amount: v.amount ? Number(v.amount) : null,
        billing_cycle: v.billing_cycle,
        status: v.status,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Assinatura criada com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar a assinatura."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Assinaturas">
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
              <DialogTitle>Nova assinatura</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma nova assinatura.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="client_name">Cliente</Label>
                  <Input
                    id="client_name"
                    className="mt-2"
                    value={form.client_name}
                    onChange={(e) => set("client_name", e.target.value)}
                    maxLength={160}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="plan_name">Plano</Label>
                  <Input
                    id="plan_name"
                    className="mt-2"
                    value={form.plan_name}
                    onChange={(e) => set("plan_name", e.target.value)}
                    maxLength={160}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select
                    value={form.billing_cycle}
                    onValueChange={(v) => set("billing_cycle", v as typeof form.billing_cycle)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as typeof form.status)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={() => void submit()} disabled={busy}>
                {busy ? "Salvando..." : "Criar assinatura"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <Repeat2 className="size-4" />
                    </div>
                    <p className="font-medium">{s.client_name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.plan_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.amount != null ? currency.format(s.amount) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {cycleLabel[s.billing_cycle] ?? s.billing_cycle}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[s.status] ?? "secondary"}>
                    {statusLabel[s.status] ?? s.status}
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
                <Repeat2 className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Suas assinaturas aparecerão aqui, organizadas para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
