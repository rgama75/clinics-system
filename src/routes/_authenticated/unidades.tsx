import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, MapPin, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/unidades")({
  head: () => ({
    meta: [
      { title: "Unidades — ClinicFlow AI" },
      { name: "description", content: "Gerencie a matriz e filiais da clínica." },
      { property: "og:title", content: "Unidades — ClinicFlow AI" },
      { property: "og:description", content: "Gerencie a matriz e filiais da clínica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Units,
});

type Unit = {
  id: string;
  name: string;
  code: string;
  is_headquarters: boolean;
  street: string | null;
  number: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
};

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da unidade.").max(120),
  code: z.string().trim().min(1, "Informe um código.").max(20),
  phone: z.string().trim().max(30).optional(),
  postal_code: z.string().trim().max(12).optional(),
  street: z.string().trim().max(160).optional(),
  number: z.string().trim().max(20).optional(),
  neighborhood: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
});

const emptyForm = {
  name: "",
  code: "",
  phone: "",
  postal_code: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
};

function Units() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("units")
      .select("id,name,code,is_headquarters,street,number,city,state,active")
      .eq("organization_id", organizationId);
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
      const { error } = await supabase.from("units").insert({
        organization_id: orgId,
        name: v.name,
        code: v.code,
        phone: v.phone || null,
        postal_code: v.postal_code || null,
        street: v.street || null,
        number: v.number || null,
        neighborhood: v.neighborhood || null,
        city: v.city || null,
        state: v.state ? v.state.toUpperCase() : null,
      });
      if (error) throw error;
      toast.success("Unidade criada com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(
        err instanceof z.ZodError
          ? (err.issues[0]?.message ?? "Revise os campos obrigatórios.")
          : err instanceof Error
            ? err.message
            : "Não foi possível criar a unidade.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Unidades">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Administre a matriz e todas as filiais.</p>
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
              Nova unidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova unidade</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar uma nova unidade.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    className="mt-2"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    className="mt-2"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value)}
                    maxLength={20}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    className="mt-2"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">CEP</Label>
                  <Input
                    id="postal_code"
                    className="mt-2"
                    value={form.postal_code}
                    onChange={(e) => set("postal_code", e.target.value)}
                    maxLength={12}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="street">Endereço</Label>
                  <Input
                    id="street"
                    className="mt-2"
                    value={form.street}
                    onChange={(e) => set("street", e.target.value)}
                    maxLength={160}
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    className="mt-2"
                    value={form.number}
                    onChange={(e) => set("number", e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    className="mt-2"
                    value={form.neighborhood}
                    onChange={(e) => set("neighborhood", e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    className="mt-2"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    className="mt-2"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={() => void submit()} disabled={busy}>
                {busy ? "Salvando..." : "Criar unidade"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((u) => (
          <article key={u.id} className="rounded-lg border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Building2 />
              </div>
              <Button variant="ghost" size="icon" aria-label="Mais opções">
                <MoreHorizontal />
              </Button>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">{u.name}</h2>
              {u.is_headquarters && (
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                  Matriz
                </span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {[u.street, u.number, u.city, u.state].filter(Boolean).join(", ") ||
                "Endereço não informado"}
            </p>
            <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">
              Código: <b className="text-foreground">{u.code}</b>
              <span className="float-right font-semibold text-success">Ativa</span>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && (
        <div className="mt-7 rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          Crie sua clínica para adicionar unidades.
        </div>
      )}
    </AppShell>
  );
}
