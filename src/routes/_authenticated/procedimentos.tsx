import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Syringe } from "lucide-react";
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

const module_ = modules.find((m) => m.slug === "procedimentos")!;

export const Route = createFileRoute("/_authenticated/procedimentos")({
  head: () => ({
    meta: [
      { title: "Procedimentos — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Procedimentos — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Procedimentos,
});

type Procedure = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  active: boolean;
};

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do procedimento.").max(160),
  description: z.string().trim().max(500).optional(),
  price: z.string().optional(),
  duration_minutes: z.string().optional(),
});

const emptyForm = { name: "", description: "", price: "", duration_minutes: "" };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Procedimentos() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Procedure[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = (p: Procedure) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: p.price != null ? String(p.price) : "",
      duration_minutes: p.duration_minutes != null ? String(p.duration_minutes) : "",
    });
    setOpen(true);
  };

  const visibleItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
      ),
    [items, sortAsc],
  );

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("procedures")
      .select("id, name, description, price, duration_minutes, active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    setItems(data ?? []);
  };

  useEffect(() => {
    if (orgId) void loadItems(orgId);
  }, [orgId]);

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const payload = {
        name: v.name,
        description: v.description || null,
        price: v.price ? Number(v.price) : null,
        duration_minutes: v.duration_minutes ? Number(v.duration_minutes) : null,
      };
      if (editingId) {
        const { error } = await supabase.from("procedures").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Procedimento atualizado com sucesso.");
      } else {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Sessão expirada.");
        const { error } = await supabase
          .from("procedures")
          .insert({ ...payload, organization_id: orgId, created_by: auth.user.id });
        if (error) throw error;
        toast.success("Procedimento criado com sucesso.");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          editingId
            ? "Não foi possível atualizar o procedimento."
            : "Não foi possível criar o procedimento.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Procedimentos">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">{module_.copy}</p>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setForm(emptyForm);
              setEditingId(null);
            }
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
              <DialogTitle>{editingId ? "Editar procedimento" : "Novo procedimento"}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Atualize os dados do procedimento."
                  : "Preencha os dados para criar um novo procedimento."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  className="mt-2"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={160}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duração (min)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="1"
                    step="1"
                    className="mt-2"
                    value={form.duration_minutes}
                    onChange={(e) => set("duration_minutes", e.target.value)}
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
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={() => void submit()} disabled={busy}>
                {busy ? "Salvando..." : editingId ? "Salvar alterações" : "Criar procedimento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => setSortAsc((a) => !a)}
              >
                <span className="inline-flex items-center gap-1">
                  Procedimento
                  {sortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                </span>
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="py-1">
                  <div className="flex items-center gap-3">
                    <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                      <Syringe className="size-3" />
                    </div>
                    <p className="font-medium">{p.name}</p>
                  </div>
                </TableCell>
                <TableCell className="py-1 text-sm text-muted-foreground">
                  {p.description ?? "—"}
                </TableCell>
                <TableCell className="py-1 text-sm text-muted-foreground">
                  {p.duration_minutes != null ? `${p.duration_minutes} min` : "—"}
                </TableCell>
                <TableCell className="py-1 text-sm text-muted-foreground">
                  {p.price != null ? currency.format(p.price) : "—"}
                </TableCell>
                <TableCell className="py-1">
                  <Badge variant={p.active ? "default" : "secondary"}>
                    {p.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar procedimento"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <Syringe className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus procedimentos aparecerão aqui, organizados para facilitar o dia a dia da
                equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
