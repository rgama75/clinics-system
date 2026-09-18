import {
  CalendarDays, ContactRound, UsersRound, Star, FileText, ShoppingBag,
  PackageOpen, Repeat2, WalletCards, Workflow, BarChart3, LayoutDashboard,
  ShieldCheck, Building2, Settings2,
} from "lucide-react";

export const modules = [
  { slug: "agenda", label: "Agenda", icon: CalendarDays, copy: "Organize horários, salas e profissionais.", action: "Novo agendamento" },
  { slug: "crm", label: "CRM", icon: ContactRound, copy: "Acompanhe oportunidades e próximos contatos.", action: "Novo contato" },
  { slug: "pacientes", label: "Pacientes", icon: UsersRound, copy: "Centralize histórico e informações dos pacientes.", action: "Novo paciente" },
  { slug: "avaliacoes", label: "Avaliações", icon: Star, copy: "Registre avaliações, planos e evoluções.", action: "Nova avaliação" },
  { slug: "propostas", label: "Propostas", icon: FileText, copy: "Crie e acompanhe propostas comerciais.", action: "Nova proposta" },
  { slug: "vendas", label: "Vendas", icon: ShoppingBag, copy: "Visualize negociações e conversões.", action: "Registrar venda" },
  { slug: "pacotes", label: "Pacotes", icon: PackageOpen, copy: "Monte combinações de procedimentos.", action: "Novo pacote" },
  { slug: "assinaturas", label: "Assinaturas", icon: Repeat2, copy: "Gerencie planos recorrentes da clínica.", action: "Nova assinatura" },
  { slug: "financeiro", label: "Financeiro", icon: WalletCards, copy: "Controle entradas, saídas e recebíveis.", action: "Novo lançamento" },
  { slug: "automacoes", label: "Automações", icon: Workflow, copy: "Configure lembretes e jornadas automáticas.", action: "Nova automação" },
  { slug: "relatorios", label: "Relatórios", icon: BarChart3, copy: "Analise resultados clínicos e comerciais.", action: "Gerar relatório" },
];

export const administration = [
  { slug: "equipe", label: "Equipe e permissões", icon: ShieldCheck },
  { slug: "unidades", label: "Unidades", icon: Building2 },
  { slug: "configuracoes", label: "Configurações", icon: Settings2 },
];
export const dashboardItem = { slug: "dashboard", label: "Visão geral", icon: LayoutDashboard };
