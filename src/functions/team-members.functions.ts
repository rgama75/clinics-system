import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "manager", "professional", "financial", "receptionist"]),
});

async function generateTemporaryPassword(): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(9).toString("base64url");
}

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: membership, error: membershipError } = await context.supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership || membership.role !== "admin") {
      throw new Error("Apenas administradores podem cadastrar novos membros.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const temporaryPassword = await generateTemporaryPassword();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Não foi possível criar a conta do membro.");
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.fullName });
    if (profileError) throw new Error(profileError.message);

    const { error: memberError } = await supabaseAdmin.from("organization_members").insert({
      organization_id: data.organizationId,
      user_id: created.user.id,
      role: data.role,
      status: "active",
    });
    if (memberError) throw new Error(memberError.message);

    return { userId: created.user.id, email: data.email, temporaryPassword };
  });
