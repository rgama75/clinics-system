import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronRight,
  LockKeyhole,
  Palette,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR } from "@/lib/format";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — ClinicFlow AI" },
      { name: "description", content: "Preferências da organização e da sua conta." },
      { property: "og:title", content: "Configurações — ClinicFlow AI" },
      { property: "og:description", content: "Preferências da organização e da sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

type DialogKey = "org" | "profile" | "security" | "preferences";
type Specialty = "aesthetics" | "dentistry" | "medicine";

const orgSchema = z.object({
  trade_name: z.string().trim().min(2, "Informe o nome fantasia.").max(120),
  legal_name: z.string().trim().min(2, "Informe a razão social.").max(160),
  document: z.string().trim().min(11, "Documento inválido.").max(18),
  specialty: z.enum(["aesthetics", "dentistry", "medicine"]),
  phone: z.string().trim().min(8, "Informe um telefone válido.").max(30),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: z.string().trim().max(30).optional(),
  job_title: z.string().trim().max(80).optional(),
  avatar_url: z.string().trim().max(500).optional(),
});

const securitySchema = z
  .object({
    password: z.string().min(6, "Mínimo de 6 caracteres."),
    confirm: z.string().min(6, "Mínimo de 6 caracteres."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

const specialtyLabel: Record<Specialty, string> = {
  aesthetics: "Estética",
  dentistry: "Odontologia",
  medicine: "Medicina",
};

function applyTheme(theme: string) {
  const effective =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", effective === "dark");
}

function Settings() {
  const navigate = useNavigate();
  const [activeDialog, setActiveDialog] = useState<DialogKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [orgId, setOrgId] = useState("");

  const [orgForm, setOrgForm] = useState({
    trade_name: "",
    legal_name: "",
    document: "",
    specialty: "aesthetics" as Specialty,
    phone: "",
  });
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    job_title: "",
    avatar_url: "",
  });
  const [securityForm, setSecurityForm] = useState({ password: "", confirm: "" });
  const [preferencesForm, setPreferencesForm] = useState({
    language: "pt-BR",
    date_format: "dd/mm/yyyy",
    theme: "system",
  });

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUserId(auth.user.id);
      setLastSignIn(auth.user.last_sign_in_at ?? null);

      const [{ data: profile }, { data: membership }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone, job_title, avatar_url, preferences")
          .eq("id", auth.user.id)
          .maybeSingle(),
        supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", auth.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);

      if (profile) {
        setProfileForm({
          full_name: profile.full_name,
          phone: profile.phone ?? "",
          job_title: profile.job_title ?? "",
          avatar_url: profile.avatar_url ?? "",
        });
        const prefs = (profile.preferences ?? {}) as Record<string, string>;
        const theme = prefs["theme"] ?? "system";
        setPreferencesForm({
          language: prefs["language"] ?? "pt-BR",
          date_format: prefs["date_format"] ?? "dd/mm/yyyy",
          theme,
        });
        applyTheme(theme);
      }

      if (membership) {
        setOrgId(membership.organization_id);
        const { data: org } = await supabase
          .from("organizations")
          .select("trade_name, legal_name, document, specialty, phone")
          .eq("id", membership.organization_id)
          .maybeSingle();
        if (org) {
          setOrgForm({
            trade_name: org.trade_name,
            legal_name: org.legal_name,
            document: org.document,
            specialty: org.specialty,
            phone: org.phone,
          });
        }
      }
    })();
  }, []);

  const closeDialog = () => {
    setActiveDialog(null);
    setSecurityForm({ password: "", confirm: "" });
  };

  const saveOrg = async () => {
    setBusy(true);
    try {
      const v = orgSchema.parse(orgForm);
      if (!orgId) throw new Error("Nenhuma clínica selecionada.");
      const { error } = await supabase
        .from("organizations")
        .update({
          trade_name: v.trade_name,
          legal_name: v.legal_name,
          document: v.document.replace(/\D/g, ""),
          specialty: v.specialty,
          phone: v.phone,
        })
        .eq("id", orgId);
      if (error) throw error;
      toast.success("Dados da organização atualizados.");
      closeDialog();
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar os dados da organização."));
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const v = profileSchema.parse(profileForm);
      if (!userId) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: v.full_name,
        phone: v.phone || null,
        job_title: v.job_title || null,
        avatar_url: v.avatar_url || null,
      });
      if (error) throw error;
      toast.success("Perfil atualizado.");
      closeDialog();
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar o perfil."));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setBusy(true);
    try {
      const v = securitySchema.parse(securityForm);
      const { error } = await supabase.auth.updateUser({ password: v.password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso.");
      setSecurityForm({ password: "", confirm: "" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a senha."));
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Sessões encerradas.");
      await navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível encerrar as sessões."));
    } finally {
      setBusy(false);
    }
  };

  const savePreferences = async () => {
    setBusy(true);
    try {
      if (!userId) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: profileForm.full_name,
        preferences: {
          language: preferencesForm.language,
          date_format: preferencesForm.date_format,
          theme: preferencesForm.theme,
        },
      });
      if (error) throw error;
      applyTheme(preferencesForm.theme);
      window.localStorage.setItem("clinicflow-theme", preferencesForm.theme);
      toast.success("Preferências salvas.");
      closeDialog();
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível salvar as preferências."));
    } finally {
      setBusy(false);
    }
  };

  const rows: Array<[LucideIcon, string, string, DialogKey]> = [
    [Building2, "Dados da organização", "Nome, documento, especialidade e contato", "org"],
    [UserRound, "Meu perfil", "Nome, avatar, telefone e cargo", "profile"],
    [LockKeyhole, "Segurança e acesso", "Senha e sessões ativas", "security"],
    [Palette, "Preferências", "Idioma, formato e aparência", "preferences"],
  ];

  return (
    <AppShell title="Configurações">
      <p className="text-sm text-muted-foreground">
        Gerencie as preferências da clínica e da sua conta.
      </p>
      <div className="mt-7 max-w-3xl overflow-hidden rounded-lg border bg-card">
        {rows.map(([Icon, title, description, key]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveDialog(key)}
            className="flex w-full items-center gap-4 border-b p-5 text-left transition-colors last:border-0 hover:bg-muted/45"
          >
            <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <Dialog open={activeDialog === "org"} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados da organização</DialogTitle>
            <DialogDescription>Atualize as informações da sua clínica.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="trade_name">Nome fantasia</Label>
                <Input
                  id="trade_name"
                  className="mt-2"
                  value={orgForm.trade_name}
                  onChange={(e) => setOrgForm((f) => ({ ...f, trade_name: e.target.value }))}
                  maxLength={120}
                  required
                />
              </div>
              <div>
                <Label htmlFor="legal_name">Razão social</Label>
                <Input
                  id="legal_name"
                  className="mt-2"
                  value={orgForm.legal_name}
                  onChange={(e) => setOrgForm((f) => ({ ...f, legal_name: e.target.value }))}
                  maxLength={160}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="org_document">Documento / CNPJ</Label>
                <Input
                  id="org_document"
                  className="mt-2"
                  value={orgForm.document}
                  onChange={(e) => setOrgForm((f) => ({ ...f, document: e.target.value }))}
                  maxLength={18}
                  required
                />
              </div>
              <div>
                <Label htmlFor="org_phone">Telefone</Label>
                <Input
                  id="org_phone"
                  className="mt-2"
                  value={orgForm.phone}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, phone: formatPhoneBR(e.target.value) }))
                  }
                  maxLength={15}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Especialidade</Label>
              <Select
                value={orgForm.specialty}
                onValueChange={(v) => setOrgForm((f) => ({ ...f, specialty: v as Specialty }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(specialtyLabel) as Specialty[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {specialtyLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void saveOrg()} disabled={busy}>
              {busy ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "profile"} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meu perfil</DialogTitle>
            <DialogDescription>Atualize suas informações pessoais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                className="mt-2"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                maxLength={120}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="profile_phone">Telefone</Label>
                <Input
                  id="profile_phone"
                  className="mt-2"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, phone: formatPhoneBR(e.target.value) }))
                  }
                  maxLength={15}
                />
              </div>
              <div>
                <Label htmlFor="job_title">Cargo</Label>
                <Input
                  id="job_title"
                  className="mt-2"
                  value={profileForm.job_title}
                  onChange={(e) => setProfileForm((f) => ({ ...f, job_title: e.target.value }))}
                  maxLength={80}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="avatar_url">URL do avatar</Label>
              <Input
                id="avatar_url"
                className="mt-2"
                value={profileForm.avatar_url}
                onChange={(e) => setProfileForm((f) => ({ ...f, avatar_url: e.target.value }))}
                maxLength={500}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void saveProfile()} disabled={busy}>
              {busy ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "security"} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segurança e acesso</DialogTitle>
            <DialogDescription>Atualize sua senha e gerencie sessões ativas.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="new_password">Nova senha</Label>
              <Input
                id="new_password"
                type="password"
                className="mt-2"
                value={securityForm.password}
                onChange={(e) => setSecurityForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirmar nova senha</Label>
              <Input
                id="confirm_password"
                type="password"
                className="mt-2"
                value={securityForm.confirm}
                onChange={(e) => setSecurityForm((f) => ({ ...f, confirm: e.target.value }))}
                minLength={6}
              />
            </div>
            <Button onClick={() => void changePassword()} disabled={busy}>
              {busy ? "Salvando..." : "Atualizar senha"}
            </Button>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {lastSignIn
                  ? `Último acesso: ${new Date(lastSignIn).toLocaleString("pt-BR")}`
                  : "Sem informações de acesso."}
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void signOutEverywhere()}
                disabled={busy}
              >
                Sair de todos os dispositivos
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={busy}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "preferences"} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências</DialogTitle>
            <DialogDescription>Personalize idioma, formato e aparência.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Idioma</Label>
              <Select
                value={preferencesForm.language}
                onValueChange={(v) => setPreferencesForm((f) => ({ ...f, language: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Formato de data</Label>
              <Select
                value={preferencesForm.date_format}
                onValueChange={(v) => setPreferencesForm((f) => ({ ...f, date_format: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/mm/yyyy">DD/MM/AAAA</SelectItem>
                  <SelectItem value="mm/dd/yyyy">MM/DD/AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aparência</Label>
              <Select
                value={preferencesForm.theme}
                onValueChange={(v) => {
                  setPreferencesForm((f) => ({ ...f, theme: v }));
                  applyTheme(v);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void savePreferences()} disabled={busy}>
              {busy ? "Salvando..." : "Salvar preferências"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
