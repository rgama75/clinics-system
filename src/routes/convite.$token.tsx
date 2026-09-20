import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite — ClinicFlow AI" },
      { name: "description", content: "Aceite o convite para participar da equipe." },
    ],
  }),
  component: ConvitePage,
});

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  professional: "Profissional",
  financial: "Financeiro",
  receptionist: "Recepcionista",
};

type Invitation = {
  organization_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: inv, error: invError }, { data: auth }] = await Promise.all([
        supabase.rpc("get_invitation_by_token", { _token: token }),
        supabase.auth.getUser(),
      ]);
      const first = inv?.[0];
      if (invError || !first) {
        setError("Este convite não existe ou não é mais válido.");
      } else {
        setInvitation(first);
      }
      setCurrentEmail(auth.user?.email ?? null);
      setLoading(false);
    })();
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      const { data: orgId, error: acceptError } = await supabase.rpc("accept_invitation", {
        _token: token,
      });
      if (acceptError) throw acceptError;
      if (orgId) window.localStorage.setItem("clinicflow-org", orgId);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível aceitar o convite."));
    } finally {
      setBusy(false);
    }
  };

  const goToAuth = (mode: "login" | "signup") => {
    window.localStorage.setItem("clinicflow-pending-invite", token);
    const params = new URLSearchParams({ mode, email: invitation?.email ?? "" });
    window.location.href = `/auth?${params.toString()}`;
  };

  const signOutAndSwitch = async () => {
    window.localStorage.setItem("clinicflow-pending-invite", token);
    await supabase.auth.signOut();
    window.location.href = `/auth?${new URLSearchParams({ mode: "login", email: invitation?.email ?? "" }).toString()}`;
  };

  return (
    <main className="grid min-h-screen place-items-center bg-muted/35 p-5">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
          C
        </div>
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Verificando convite...</p>
          </div>
        ) : error || !invitation ? (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="size-10 text-destructive" />
            <h1 className="font-display text-xl font-semibold">Convite inválido</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : invitation.status !== "pending" ? (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="size-10 text-muted-foreground" />
            <h1 className="font-display text-xl font-semibold">Convite não está mais ativo</h1>
            <p className="text-sm text-muted-foreground">
              {invitation.status === "accepted"
                ? "Este convite já foi aceito."
                : "Este convite foi cancelado ou expirou."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="size-10 text-success" />
            <h1 className="font-display text-xl font-semibold">
              Você foi convidado(a) para {invitation.organization_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Papel: <strong>{roleLabel[invitation.role] ?? invitation.role}</strong>
              <br />
              Convite enviado para <strong>{invitation.email}</strong>
            </p>
            {error && (
              <p className="mt-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {currentEmail ? (
              currentEmail.toLowerCase() === invitation.email.toLowerCase() ? (
                <Button className="mt-3 h-11 w-full" disabled={busy} onClick={() => void accept()}>
                  {busy ? "Aceitando..." : "Aceitar convite"}
                </Button>
              ) : (
                <div className="mt-3 w-full space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você está conectado(a) como <strong>{currentEmail}</strong>. Saia para aceitar
                    com o e-mail convidado.
                  </p>
                  <Button className="h-11 w-full" onClick={() => void signOutAndSwitch()}>
                    Sair e entrar com {invitation.email}
                  </Button>
                </div>
              )
            ) : (
              <div className="mt-3 w-full space-y-2">
                <Button className="h-11 w-full" onClick={() => goToAuth("signup")}>
                  Criar conta e aceitar
                </Button>
                <Button variant="outline" className="h-11 w-full" onClick={() => goToAuth("login")}>
                  Já tenho conta
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
