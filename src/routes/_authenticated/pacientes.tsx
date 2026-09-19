import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/lib/clinicflow";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { formatPhoneBR, formatCEP } from "@/lib/format";
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
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome do paciente.").max(160),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(255).optional(),
  birth_date: z.string().optional(),
  postal_code: z.string().trim().max(12).optional(),
  street: z.string().trim().max(160).optional(),
  number: z.string().trim().max(20).optional(),
  complement: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  birth_date: "",
  postal_code: "",
  street: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  notes: "",
};

function Pacientes() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = (p: Patient) => {
    setEditingId(p.id);
    setForm({
      full_name: p.full_name,
      phone: p.phone ?? "",
      email: p.email ?? "",
      birth_date: p.birth_date ?? "",
      postal_code: p.postal_code ?? "",
      street: p.street ?? "",
      number: p.number ?? "",
      complement: p.complement ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      notes: p.notes ?? "",
    });
    setOpen(true);
  };

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(
        (p) => !q || [p.full_name, p.phone, p.email].some((v) => v?.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sortAsc ? a.full_name.localeCompare(b.full_name) : b.full_name.localeCompare(a.full_name),
      );
  }, [items, search, sortAsc]);

  const lookupCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch {
      toast.error("Não foi possível buscar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("patients")
      .select(
        "id, full_name, phone, email, birth_date, postal_code, street, number, complement, city, state, notes",
      )
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
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const payload = {
        full_name: v.full_name,
        phone: v.phone || null,
        email: v.email || null,
        birth_date: v.birth_date || null,
        postal_code: v.postal_code || null,
        street: v.street || null,
        number: v.number || null,
        complement: v.complement || null,
        city: v.city || null,
        state: v.state ? v.state.toUpperCase() : null,
        notes: v.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("patients").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Paciente atualizado com sucesso.");
      } else {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Sessão expirada.");
        const { error } = await supabase
          .from("patients")
          .insert({ ...payload, organization_id: orgId, created_by: auth.user.id });
        if (error) throw error;
        toast.success("Paciente cadastrado com sucesso.");
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
            ? "Não foi possível atualizar o paciente."
            : "Não foi possível cadastrar o paciente.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Pacientes">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">{module_.copy}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
                <DialogTitle>{editingId ? "Editar paciente" : "Novo paciente"}</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Atualize os dados do paciente."
                    : "Preencha os dados para cadastrar um novo paciente."}
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="postal_code">CEP</Label>
                    <Input
                      id="postal_code"
                      className="mt-2"
                      value={form.postal_code}
                      onChange={(e) => {
                        const v = formatCEP(e.target.value);
                        set("postal_code", v);
                        if (v.replace(/\D/g, "").length === 8) void lookupCep(v);
                      }}
                      maxLength={9}
                      placeholder={cepLoading ? "Buscando..." : undefined}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      className="mt-2"
                      value={form.street}
                      onChange={(e) => set("street", e.target.value)}
                      maxLength={160}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      className="mt-2"
                      value={form.complement}
                      onChange={(e) => set("complement", e.target.value)}
                      maxLength={80}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
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
                  {busy ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar paciente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                  Paciente
                  {sortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                </span>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="py-1">
                  <div className="flex items-center gap-3">
                    <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-3" />
                    </div>
                    <p className="font-medium">{p.full_name}</p>
                  </div>
                </TableCell>
                <TableCell className="py-1 text-sm text-muted-foreground">
                  {p.phone ?? "—"}
                </TableCell>
                <TableCell className="py-1 text-sm text-muted-foreground">
                  {p.email ?? "—"}
                </TableCell>
                <TableCell className="py-1 text-sm text-muted-foreground">
                  {p.birth_date
                    ? new Date(`${p.birth_date}T00:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar paciente"
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
                <UserRound className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Seus pacientes aparecerão aqui, organizados para facilitar o dia a dia da equipe.
              </p>
            </div>
          </div>
        )}
        {items.length > 0 && visibleItems.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum paciente encontrado para essa busca.
          </div>
        )}
      </section>
    </AppShell>
  );
}
