import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { useOrganizationId } from "@/hooks/use-organization-id";
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

const module_ = modules.find((m) => m.slug === "financeiro")!;

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Financeiro — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Financeiro,
});

type Entry = {
  id: string;
  description: string;
  entry_type: string;
  amount: number;
  status: string;
  due_date: string | null;
};

const schema = z.object({
  description: z.string().trim().min(2, "Informe a descrição.").max(200),
  entry_type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .min(1, "Informe o valor.")
    .refine((v) => Number(v) >= 0, "Valor inválido."),
  status: z.enum(["pending", "paid", "overdue"]),
  due_date: z.string().optional(),
});

const emptyForm = {
  description: "",
  entry_type: "income" as "income" | "expense",
  amount: "",
  status: "pending" as "pending" | "paid" | "overdue",
  due_date: "",
};

const typeLabel: Record<string, string> = { income: "Entrada", expense: "Saída" };
const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  overdue: "destructive",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Financeiro() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("financial_entries")
      .select("id, description, entry_type, amount, status, due_date")
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
      const { error } = await supabase.from("financial_entries").insert({
        organization_id: orgId,
        description: v.description,
        entry_type: v.entry_type,
        amount: Number(v.amount),
        status: v.status,
        due_date: v.due_date || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Lançamento criado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(
        err instanceof z.ZodError
          ? (err.issues[0]?.message ?? "Revise os campos obrigatórios.")
          : err instanceof Error
            ? err.message
            : "Não foi possível criar o lançamento.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Financeiro">
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
              <DialogTitle>Novo lançamento</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo lançamento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  className="mt-2"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.entry_type}
                    onValueChange={(v) => set("entry_type", v as typeof form.entry_type)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Vencimento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    className="mt-2"
                    value={form.due_date}
                    onChange={(e) => set("due_date", e.target.value)}
                  />
                </div>
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
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={() => void submit()} disabled={busy}>
                {busy ? "Salvando..." : "Criar lançamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <WalletCards className="size-4" />
                    </div>
                    <p className="font-medium">{e.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {typeLabel[e.entry_type] ?? e.entry_type}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {currency.format(e.amount)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {e.due_date
                    ? new Date(`${e.due_date}T00:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[e.status] ?? "secondary"}>
                    {statusLabel[e.status] ?? e.status}
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
                <WalletCards className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus lançamentos aparecerão aqui, organizados para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
