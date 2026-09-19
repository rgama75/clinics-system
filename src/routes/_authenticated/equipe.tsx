import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MoreHorizontal, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { getErrorMessage } from "@/lib/errors";
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

type Member = { id: string; role: string; status: string; user_id: string };

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  role: z.enum(["admin", "manager", "professional", "financial", "receptionist"]),
});

type Role = "admin" | "manager" | "professional" | "financial" | "receptionist";

const emptyForm = { email: "", role: "professional" as Role };

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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadItems = async (organizationId: string) => {
    const { data } = await supabase
      .from("organization_members")
      .select("id,role,status,user_id")
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
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { data: invitation, error } = await supabase
        .from("organization_invitations")
        .insert({
          organization_id: orgId,
          email: v.email,
          role: v.role,
          invited_by: auth.user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: fnError } = await supabase.functions.invoke("send-invite-email", {
        body: { invitationId: invitation.id, siteUrl: window.location.origin },
      });
      if (fnError) {
        toast.warning(
          "Convite registrado, mas o e-mail não pôde ser enviado. Tente reenviar mais tarde.",
        );
      } else {
        toast.success("Convite enviado com sucesso.");
      }
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível enviar o convite."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Equipe e permissões">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Controle quem acessa cada área da clínica.</p>
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
              Convidar membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar membro</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para um novo membro da equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
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
                <Select value={form.role} onValueChange={(v) => set("role", v as typeof form.role)}>
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
                {busy ? "Enviando..." : "Enviar convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            {items.map((x, i) => (
              <TableRow key={x.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{i === 0 ? "Você" : "Membro da equipe"}</p>
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
    </AppShell>
  );
}
