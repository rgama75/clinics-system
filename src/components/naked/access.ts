/**
 * Ponto único de autorização do Naked CRM.
 *
 * Hoje qualquer membro ativo da organização tem acesso a todas as ações —
 * a própria leitura/escrita já é garantida pelas políticas de RLS das
 * tabelas crm_*. Quando os perfis de permissão forem desenhados, as regras
 * passam a ser checadas aqui, num único lugar, sem precisar tocar nas telas.
 */
export type NakedAction =
  | "leads.view"
  | "leads.manage"
  | "leads.convert"
  | "clients.view"
  | "clients.manage"
  | "projects.view"
  | "projects.manage"
  | "charges.view"
  | "charges.manage"
  | "tasks.view"
  | "tasks.manage";

export function canAccessNaked(_action: NakedAction): boolean {
  return true;
}
