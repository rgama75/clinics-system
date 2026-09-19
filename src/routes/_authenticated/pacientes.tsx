import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { formatPhoneBR } from "@/lib/format";
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

const module_ = modules.find((m) => m.slug === "pacientes")!;

export const Route = createFileRoute("/_authenticated/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — ClinicFlow AI" },
      { name: "description", content: module_.copy },
      { property: "og:title", content: "Pacientes — ClinicFlow AI" },
      { property: "og:description", content: module_.copy },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pacientes,
});

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome do paciente.").max(160),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(255).optional(),
  birth_date: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = { full_name: "", phone: "", email: "", birth_date: "", notes: "" };

function Pacientes() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, phone, email, birth_date")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });
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
      const { error } = await supabase.from("patients").insert({
        organization_id: orgId,
        full_name: v.full_name,
        phone: v.phone || null,
        email: v.email || null,
        birth_date: v.birth_date || null,
        notes: v.notes || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
      toast.success("Paciente cadastrado com sucesso.");
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível cadastrar o paciente."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Pacientes">
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
              <DialogTitle>Novo paciente</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo paciente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  className="mt-2"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
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
              <div>
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  className="mt-2"
                  value={form.birth_date}
                  onChange={(e) => set("birth_date", e.target.value)}
                />
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
                {busy ? "Salvando..." : "Cadastrar paciente"}
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
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nascimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-4" />
                    </div>
                    <p className="font-medium">{p.full_name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.phone ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.email ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.birth_date
                    ? new Date(`${p.birth_date}T00:00:00`).toLocaleDateString("pt-BR")
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
                <UserRound className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus pacientes aparecerão aqui, organizados para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
