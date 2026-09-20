import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ContactRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { formatPhoneBR } from "@/lib/format";
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

const module_ = modules.find((m) => m.slug === "crm")!;

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "CRM — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "CRM — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Crm,
});

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  stage: string;
  next_contact_at: string | null;
};

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato.").max(160),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(255).optional(),
  stage: z.enum(["lead", "contacted", "negotiating", "won", "lost"]),
  next_contact_at: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  stage: "lead" as "lead" | "contacted" | "negotiating" | "won" | "lost",
  next_contact_at: "",
  notes: "",
};

const stageLabel: Record<string, string> = {
  lead: "Lead",
  contacted: "Contatado",
  negotiating: "Negociando",
  won: "Ganho",
  lost: "Perdido",
};

const stageVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  lead: "secondary",
  contacted: "outline",
  negotiating: "default",
  won: "default",
  lost: "destructive",
};

function Crm() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_contacts")
      .select("id, name, phone, email, stage, next_contact_at")
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
      const { error } = await supabase.from("crm_contacts").insert({
        organization_id: orgId,
        name: v.name,
        phone: v.phone || null,
        email: v.email || null,
        stage: v.stage,
        next_contact_at: v.next_contact_at ? new Date(v.next_contact_at).toISOString() : null,
        notes: v.notes || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Contato criado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível criar o contato."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="CRM">
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
              <DialogTitle>Novo contato</DialogTitle>
              <DialogDescription>
                Preencha os dados para registrar um novo contato.
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
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    className="mt-2"
                    value={form.phone}
                    onChange={(e) => set("phone", formatPhoneBR(e.target.value))}
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-2"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    maxLength={255}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estágio</Label>
                  <Select
                    value={form.stage}
                    onValueChange={(v) => set("stage", v as typeof form.stage)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="contacted">Contatado</SelectItem>
                      <SelectItem value="negotiating">Negociando</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="next_contact_at">Próximo contato</Label>
                  <Input
                    id="next_contact_at"
                    type="datetime-local"
                    className="mt-2"
                    value={form.next_contact_at}
                    onChange={(e) => set("next_contact_at", e.target.value)}
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
                {busy ? "Salvando..." : "Criar contato"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Próximo contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <ContactRound className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={stageVariant[c.stage] ?? "secondary"}>
                    {stageLabel[c.stage] ?? c.stage}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.next_contact_at ? new Date(c.next_contact_at).toLocaleString("pt-BR") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <ContactRound className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus contatos aparecerão aqui, organizados para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
