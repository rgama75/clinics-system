import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
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

const module_ = modules.find((m) => m.slug === "propostas")!;

export const Route = createFileRoute("/_authenticated/propostas")({
  head: () => ({
    meta: [
      { title: "Propostas — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Propostas — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Propostas,
});

type Proposal = {
  id: string;
  client_name: string;
  title: string;
  amount: number | null;
  status: string;
  valid_until: string | null;
};

const schema = z.object({
  client_name: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
  title: z.string().trim().min(2, "Informe o título da proposta.").max(160),
  amount: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]),
  valid_until: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  client_name: "",
  title: "",
  amount: "",
  status: "draft" as "draft" | "sent" | "accepted" | "rejected",
  valid_until: "",
  notes: "",
};

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Recusada",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  accepted: "default",
  rejected: "destructive",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Propostas() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Proposal[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("proposals")
      .select("id, client_name, title, amount, status, valid_until")
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
      const { error } = await supabase.from("proposals").insert({
        organization_id: orgId,
        client_name: v.client_name,
        title: v.title,
        amount: v.amount ? Number(v.amount) : null,
        status: v.status,
        valid_until: v.valid_until || null,
        notes: v.notes || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Proposta criada com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar a proposta."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Propostas">
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
              <DialogTitle>Nova proposta</DialogTitle>
              <DialogDescription>Preencha os dados para criar uma nova proposta.</DialogDescription>
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
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as typeof form.status)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="accepted">Aceita</SelectItem>
                      <SelectItem value="rejected">Recusada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valid_until">Válida até</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    className="mt-2"
                    value={form.valid_until}
                    onChange={(e) => set("valid_until", e.target.value)}
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
                {busy ? "Salvando..." : "Criar proposta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proposta</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Válida até</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.client_name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.amount != null ? currency.format(p.amount) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[p.status] ?? "secondary"}>
                    {statusLabel[p.status] ?? p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.valid_until
                    ? new Date(`${p.valid_until}T00:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Suas propostas aparecerão aqui, organizadas para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
