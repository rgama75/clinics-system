export type CrmLeadStage = "novo" | "em_contato" | "negociacao" | "virou_cliente" | "perdido";

export const CRM_LEAD_STAGES: CrmLeadStage[] = [
  "novo",
  "em_contato",
  "negociacao",
  "virou_cliente",
  "perdido",
];

export const CRM_LEAD_STAGE_LABEL: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  negociacao: "Negociação",
  virou_cliente: "Virou cliente",
  perdido: "Perdido",
};

/** Etapas ainda "em aberto" — usado para decidir se o destaque de lead parado se aplica. */
export const CRM_LEAD_OPEN_STAGES: string[] = ["novo", "em_contato", "negociacao"];

/** Dias sem contato (>=60 em etapa aberta) — só um destaque informativo, não muda a etapa. */
export function crmLeadDaysStalled(lead: {
  stage: string;
  last_contact_date: string | null;
  created_at: string;
}): number | null {
  if (!CRM_LEAD_OPEN_STAGES.includes(lead.stage)) return null;
  const reference = lead.last_contact_date ?? lead.created_at;
  const days = Math.floor((Date.now() - new Date(reference).getTime()) / 86_400_000);
  return days >= 60 ? days : null;
}

export type CrmContactType = "ligacao" | "whatsapp" | "email" | "presencial" | "outro";

export const CRM_CONTACT_TYPES: CrmContactType[] = [
  "ligacao",
  "whatsapp",
  "email",
  "presencial",
  "outro",
];

export const CRM_CONTACT_TYPE_LABEL: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  presencial: "Presencial",
  outro: "Outro",
};

export type CrmLead = {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  procedure: string;
  source: string | null;
  stage: string;
  last_contact_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CrmContactHistoryEntry = {
  id: string;
  organization_id: string;
  lead_id: string;
  contact_type: string;
  notes: string | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
};

export type CrmClient = {
  id: string;
  organization_id: string;
  lead_id: string;
  name: string;
  phone: string;
  cpf: string;
  birth_date: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  allergies: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CrmProjectStatus = "em_andamento" | "concluido" | "cancelado";

export const CRM_PROJECT_STATUSES: CrmProjectStatus[] = ["em_andamento", "concluido", "cancelado"];

export const CRM_PROJECT_STATUS_LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type CrmProjectSessionStatus = "agendada" | "realizada" | "cancelada" | "falta";

export const CRM_PROJECT_SESSION_STATUSES: CrmProjectSessionStatus[] = [
  "agendada",
  "realizada",
  "cancelada",
  "falta",
];

export const CRM_PROJECT_SESSION_STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  falta: "Falta",
};

export type CrmProject = {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  procedure: string;
  status: string;
  planned_sessions: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CrmProjectSession = {
  id: string;
  organization_id: string;
  project_id: string;
  session_number: number;
  scheduled_at: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CrmChargeStatus = "ativa" | "cancelada";

export const CRM_CHARGE_STATUSES: CrmChargeStatus[] = ["ativa", "cancelada"];

export const CRM_CHARGE_STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  cancelada: "Cancelada",
};

export type CrmInstallmentStatus = "pendente" | "pago" | "cancelado";

export const CRM_INSTALLMENT_STATUSES: CrmInstallmentStatus[] = ["pendente", "pago", "cancelado"];

export const CRM_INSTALLMENT_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

export type CrmCharge = {
  id: string;
  organization_id: string;
  client_id: string;
  project_id: string | null;
  description: string;
  total_amount: number;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CrmChargeInstallment = {
  id: string;
  organization_id: string;
  charge_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function crmTodayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "Atrasada" não é um status gravado — é calculado aqui, igual ao "Parado há N dias". */
export function crmInstallmentIsOverdue(installment: {
  status: string;
  due_date: string;
}): boolean {
  return installment.status === "pendente" && installment.due_date < crmTodayISODate();
}

export type CrmTaskStatus = "pendente" | "concluida" | "cancelada";

export const CRM_TASK_STATUSES: CrmTaskStatus[] = ["pendente", "concluida", "cancelada"];

export const CRM_TASK_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export type CrmTask = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function crmTaskIsOverdue(task: { status: string; due_at: string | null }): boolean {
  return task.status === "pendente" && task.due_at !== null && new Date(task.due_at) < new Date();
}
