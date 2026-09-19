import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — ClinicFlow AI" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Nova senha — ClinicFlow AI" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reset,
});
function Reset() {
  const navigate = useNavigate();
  const [p, setP] = useState("");
  const [e, setE] = useState("");
  const submit = async (x: React.FormEvent) => {
    x.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: p });
    if (error) {
      setE(error.message);
      return;
    }
    await navigate({ to: "/dashboard" });
  };
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-7 text-xl font-semibold">ClinicFlow AI</div>
        <h1 className="font-display text-3xl font-semibold">Crie uma nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use pelo menos oito caracteres.</p>
        <div className="mt-7">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            className="mt-2 h-11"
            minLength={8}
            maxLength={72}
            value={p}
            onChange={(x) => setP(x.target.value)}
            required
          />
        </div>
        {e && <p className="mt-3 text-sm text-destructive">{e}</p>}
        <Button className="mt-6 h-11 w-full">Atualizar senha</Button>
      </form>
    </main>
  );
}
