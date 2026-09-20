import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Syringe, Plus } from "lucide-react";
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
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("procedures")
      .select("id, name, description, price, duration_minutes, active")
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
      const { error } = await supabase.from("procedures").insert({
        organization_id: orgId,
        name: v.name,
        description: v.description || null,
        price: v.price ? Number(v.price) : null,
        duration_minutes: v.duration_minutes ? Number(v.duration_minutes) : null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Procedimento criado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar o procedimento."));
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
              <DialogTitle>Novo procedimento</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo procedimento.
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
                {busy ? "Salvando..." : "Criar procedimento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => (
          <article key={p.id} className="rounded-lg border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Syringe />
              </div>
              <Badge variant={p.active ? "default" : "secondary"}>
                {p.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <h2 className="mt-5 font-display text-lg font-semibold">{p.name}</h2>
            {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
            <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
              <span>
                {p.duration_minutes != null ? `${p.duration_minutes} min` : "Duração não definida"}
              </span>
              <span className="font-semibold text-foreground">
                {p.price != null ? currency.format(p.price) : "—"}
              </span>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && (
        <div className="mt-7 rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          Seus procedimentos aparecerão aqui, organizados para facilitar o dia a dia da equipe.
        </div>
      )}
    </AppShell>
  );
}
