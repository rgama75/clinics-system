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
