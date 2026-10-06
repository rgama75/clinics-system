import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, UserRoundCheck } from "lucide-react";
import { AppShell } from "@/components/clinicflow/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-organization-id";
import type { CrmClient } from "@/types/naked";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/naked/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Naked CRM — ClinicFlow AI" },
      {
        name: "description",
        content: "Clientes convertidos a partir de leads, com dados completos.",
      },
      { property: "og:title", content: "Clientes — Naked CRM — ClinicFlow AI" },
      {
        property: "og:description",
        content: "Clientes convertidos a partir de leads, com dados completos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NakedClientes,
});

function NakedClientes() {
  const orgId = useOrganizationId();
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");

  const loadClients = async (organizationId: string) => {
    const { data } = await supabase
      .from("crm_clients")
      .select(
        "id, organization_id, lead_id, name, phone, cpf, birth_date, postal_code, street, number, complement, neighborhood, city, state, allergies, created_by, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setClients(rows);
    const ids = Array.from(new Set(rows.map((c) => c.created_by)));
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      setProfileNames(new Map((profiles ?? []).map((p) => [p.id, p.full_name])));
    }
  };

  useEffect(() => {
    if (orgId) void loadClients(orgId);
  }, [orgId]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cpf.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [clients, search]);

  return (
    <AppShell title="Clientes" eyebrow="Naked CRM">
      <p className="max-w-xl text-sm text-muted-foreground">
        Clientes surgem da conversão de um lead, lá na tela de Leads — não é possível cadastrar um
        cliente diretamente por aqui.
      </p>

      <section className="mt-7 overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, CPF ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Alergias</TableHead>
              <TableHead>Cadastrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRoundCheck className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.cpf}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(`${client.birth_date}T00:00:00`).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">
                  {client.street}, {client.number}
                  {client.complement ? ` — ${client.complement}` : ""} · {client.city}/
                  {client.state}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {client.allergies}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {profileNames.get(client.created_by) ?? "Membro da equipe"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredClients.length === 0 && (
          <div className="grid min-h-80 place-items-center px-5 py-14 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
                <UserRoundCheck className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Tudo pronto para começar</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {clients.length === 0
                  ? "Converta um lead em Leads para ver seus clientes aparecerem aqui."
                  : "Nenhum cliente encontrado para essa busca."}
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
