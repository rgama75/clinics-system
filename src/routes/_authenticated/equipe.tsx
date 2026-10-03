import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, MoreHorizontal, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
import { createTeamMember } from "@/functions/team-members.functions";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe e permissões — ClinicFlow AI" },
      { name: "description", content: "Gerencie membros e papéis da equipe." },
      { property: "og:title", content: "Equipe e permissões — ClinicFlow AI" },
      { property: "og:description", content: "Gerencie membros e papéis da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Equipe,
});

type Member = {
  id: string;
  role: string;
  status: string;
  user_id: string;
  full_name: string | null;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome do novo membro.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  role: z.enum(["admin", "manager", "professional", "financial", "receptionist"]),
});

type Role = "admin" | "manager" | "professional" | "financial" | "receptionist";

const emptyForm = { full_name: "", email: "", role: "professional" as Role };

const roleLabel = (r: string) =>
  ({
    admin: "Administrador",
    manager: "Gerente",
    professional: "Profissional",
    financial: "Financeiro",
    receptionist: "Recepcionista",
  })[r] ?? r;

function Equipe() {
  const orgId = useOrganizationId();
  const [items, setItems] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("organization_members")
      .select("id,role,status,user_id")
      .eq("organization_id", organizationId);
    const members = data ?? [];
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } =
      userIds.length > 0
        ? await supabase.from("profiles").select("id,full_name").in("id", userIds)
        : { data: [] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    setItems(members.map((m) => ({ ...m, full_name: nameById.get(m.user_id) ?? null })));
  };

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) setCurrentUserId(auth.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!orgId || !currentUserId) return;
    void loadItems(orgId);
    void supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", currentUserId)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, [orgId, currentUserId]);

  const submit = async () => {
    setBusy(true);
    try {
      const v = schema.parse(form);
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const result = await createTeamMember({
        data: { organizationId: orgId, email: v.email, fullName: v.full_name, role: v.role },
      });
      toast.success("Membro cadastrado com sucesso.");
      setCredentials({ email: result.email, password: result.temporaryPassword });
      setForm(emptyForm);
      setOpen(false);
      await loadItems(orgId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível cadastrar o membro."));
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `E-mail: ${credentials.email}\nSenha temporária: ${credentials.password}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell title="Equipe e permissões">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Controle quem acessa cada área da clínica.</p>
        {isAdmin && (
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
                Cadastrar membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar membro</DialogTitle>
                <DialogDescription>
                  Crie o acesso do novo membro diretamente. Você receberá uma senha temporária para
                  compartilhar com ele.
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
                    maxLength={120}
                    required
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
                    required
                  />
                </div>
                <div>
                  <Label>Papel</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => set("role", v as typeof form.role)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="receptionist">Recepcionista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy ? "Cadastrando..." : "Cadastrar membro"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((x) => (
              <TableRow key={x.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {x.user_id === currentUserId ? "Você" : (x.full_name ?? "Membro da equipe")}
                      </p>
                      <p className="text-xs text-muted-foreground">Conta protegida</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                    <ShieldCheck className="size-3" />
                    {roleLabel(x.role)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-success">Ativo</span>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" aria-label="Mais opções">
                    <MoreHorizontal />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            A equipe aparecerá aqui após a configuração inicial.
          </div>
        )}
      </section>

      <Dialog open={credentials !== null} onOpenChange={(next) => !next && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Membro cadastrado</DialogTitle>
            <DialogDescription>
              Compartilhe estas credenciais com segurança. O novo membro pode alterar a senha em
              Configurações após o primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3 rounded-md border bg-muted/40 p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  E-mail
                </p>
                <p className="font-medium">{credentials.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Senha temporária
                </p>
                <p className="font-mono font-medium">{credentials.password}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => void copyCredentials()}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button onClick={() => setCredentials(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
