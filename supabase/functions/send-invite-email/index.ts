import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  professional: "Profissional",
  financial: "Financeiro",
  receptionist: "Recepcionista",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não está configurada.");
    }

    const { invitationId, siteUrl } = await req.json();
    if (!invitationId || typeof invitationId !== "string") {
      throw new Error("invitationId é obrigatório.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("organization_invitations")
      .select("email, role, token, organizations(trade_name)")
      .eq("id", invitationId)
      .single();
    if (invitationError || !invitation) {
      throw new Error(invitationError?.message ?? "Convite não encontrado.");
    }

    const orgName =
      (invitation.organizations as { trade_name?: string } | null)?.trade_name ?? "ClinicFlow AI";
    const inviteUrl = `${siteUrl ?? "https://clinicflow.ai"}/convite/${invitation.token}`;
    const role = roleLabel[invitation.role] ?? invitation.role;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClinicFlow AI <onboarding@resend.dev>",
        to: [invitation.email],
        subject: `Convite para participar de ${orgName} no ClinicFlow AI`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Você foi convidado(a) para ${orgName}</h2>
            <p>Você recebeu um convite para participar da equipe de <strong>${orgName}</strong> no ClinicFlow AI como <strong>${role}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Aceitar convite</a>
            </p>
            <p style="color:#6b7280;font-size:13px;">Este convite expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const body = await emailResponse.text();
      throw new Error(`Falha ao enviar e-mail via Resend: ${body}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao enviar convite.";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
