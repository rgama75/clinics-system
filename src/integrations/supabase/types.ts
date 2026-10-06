export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string;
          created_by: string;
          ends_at: string;
          id: string;
          notes: string | null;
          organization_id: string;
          patient_name: string;
          procedure: string | null;
          professional_name: string | null;
          starts_at: string;
          status: string;
          unit_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          ends_at: string;
          id?: string;
          notes?: string | null;
          organization_id: string;
          patient_name: string;
          procedure?: string | null;
          professional_name?: string | null;
          starts_at: string;
          status?: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ends_at?: string;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          patient_name?: string;
          procedure?: string | null;
          professional_name?: string | null;
          starts_at?: string;
          status?: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      automations: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          id: string;
          message: string | null;
          name: string;
          organization_id: string;
          trigger_type: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by: string;
          id?: string;
          message?: string | null;
          name: string;
          organization_id: string;
          trigger_type?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          id?: string;
          message?: string | null;
          name?: string;
          organization_id?: string;
          trigger_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_charge_installments: {
        Row: {
          amount: number;
          charge_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          due_date: string;
          id: string;
          installment_number: number;
          notes: string | null;
          organization_id: string;
          paid_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          charge_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          due_date: string;
          id?: string;
          installment_number: number;
          notes?: string | null;
          organization_id: string;
          paid_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          charge_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          due_date?: string;
          id?: string;
          installment_number?: number;
          notes?: string | null;
          organization_id?: string;
          paid_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_charge_installments_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "crm_charges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_charge_installments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_charges: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string;
          id: string;
          notes: string | null;
          organization_id: string;
          project_id: string | null;
          status: string;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description: string;
          id?: string;
          notes?: string | null;
          organization_id: string;
          project_id?: string | null;
          status?: string;
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          project_id?: string | null;
          status?: string;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_charges_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "crm_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_charges_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_charges_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "crm_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_clients: {
        Row: {
          allergies: string;
          birth_date: string;
          city: string;
          complement: string | null;
          cpf: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          lead_id: string;
          name: string;
          neighborhood: string;
          number: string;
          organization_id: string;
          phone: string;
          postal_code: string;
          state: string;
          street: string;
          updated_at: string;
        };
        Insert: {
          allergies: string;
          birth_date: string;
          city: string;
          complement?: string | null;
          cpf: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          lead_id: string;
          name: string;
          neighborhood: string;
          number: string;
          organization_id: string;
          phone: string;
          postal_code: string;
          state: string;
          street: string;
          updated_at?: string;
        };
        Update: {
          allergies?: string;
          birth_date?: string;
          city?: string;
          complement?: string | null;
          cpf?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          lead_id?: string;
          name?: string;
          neighborhood?: string;
          number?: string;
          organization_id?: string;
          phone?: string;
          postal_code?: string;
          state?: string;
          street?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_clients_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: true;
            referencedRelation: "crm_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_clients_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_contacts: {
        Row: {
          created_at: string;
          created_by: string;
          email: string | null;
          id: string;
          name: string;
          next_contact_at: string | null;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          stage: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          email?: string | null;
          id?: string;
          name: string;
          next_contact_at?: string | null;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          stage?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          email?: string | null;
          id?: string;
          name?: string;
          next_contact_at?: string | null;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          stage?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_contacts_history: {
        Row: {
          contact_type: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          lead_id: string;
          notes: string | null;
          occurred_at: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          contact_type?: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          lead_id: string;
          notes?: string | null;
          occurred_at?: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          contact_type?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          lead_id?: string;
          notes?: string | null;
          occurred_at?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_contacts_history_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "crm_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_contacts_history_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_leads: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          last_contact_date: string | null;
          name: string;
          organization_id: string;
          phone: string;
          procedure: string;
          source: string | null;
          stage: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          last_contact_date?: string | null;
          name: string;
          organization_id: string;
          phone: string;
          procedure: string;
          source?: string | null;
          stage?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          last_contact_date?: string | null;
          name?: string;
          organization_id?: string;
          phone?: string;
          procedure?: string;
          source?: string | null;
          stage?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_leads_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_project_sessions: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          notes: string | null;
          organization_id: string;
          project_id: string;
          scheduled_at: string;
          session_number: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          organization_id: string;
          project_id: string;
          scheduled_at: string;
          session_number: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          project_id?: string;
          scheduled_at?: string;
          session_number?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_project_sessions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_project_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "crm_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_projects: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notes: string | null;
          organization_id: string;
          planned_sessions: number | null;
          procedure: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          organization_id: string;
          planned_sessions?: number | null;
          procedure: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          planned_sessions?: number | null;
          procedure?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "crm_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_tasks: {
        Row: {
          assigned_to: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          due_at: string | null;
          id: string;
          organization_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          organization_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          organization_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_tasks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluations: {
        Row: {
          created_at: string;
          created_by: string;
          evaluated_at: string;
          evaluation_type: string | null;
          id: string;
          organization_id: string;
          patient_name: string;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          evaluated_at?: string;
          evaluation_type?: string | null;
          id?: string;
          organization_id: string;
          patient_name: string;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          evaluated_at?: string;
          evaluation_type?: string | null;
          id?: string;
          organization_id?: string;
          patient_name?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_entries: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string;
          description: string;
          due_date: string | null;
          entry_type: string;
          id: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by: string;
          description: string;
          due_date?: string | null;
          entry_type: string;
          id?: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string;
          description?: string;
          due_date?: string | null;
          entry_type?: string;
          id?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_entries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invitations: {
        Row: {
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          status: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: string;
          token?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string;
          document: string;
          id: string;
          legal_name: string;
          phone: string;
          specialty: Database["public"]["Enums"]["clinic_specialty"];
          trade_name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          document: string;
          id?: string;
          legal_name: string;
          phone: string;
          specialty: Database["public"]["Enums"]["clinic_specialty"];
          trade_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          document?: string;
          id?: string;
          legal_name?: string;
          phone?: string;
          specialty?: Database["public"]["Enums"]["clinic_specialty"];
          trade_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          price: number | null;
          sessions_count: number | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          price?: number | null;
          sessions_count?: number | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          price?: number | null;
          sessions_count?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          birth_date: string | null;
          city: string | null;
          complement: string | null;
          created_at: string;
          created_by: string;
          email: string | null;
          full_name: string;
          id: string;
          notes: string | null;
          number: string | null;
          organization_id: string;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          street: string | null;
          updated_at: string;
        };
        Insert: {
          birth_date?: string | null;
          city?: string | null;
          complement?: string | null;
          created_at?: string;
          created_by: string;
          email?: string | null;
          full_name: string;
          id?: string;
          notes?: string | null;
          number?: string | null;
          organization_id: string;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          city?: string | null;
          complement?: string | null;
          created_at?: string;
          created_by?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          notes?: string | null;
          number?: string | null;
          organization_id?: string;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      procedures: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          name: string;
          organization_id: string;
          price: number | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          name: string;
          organization_id: string;
          price?: number | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          name?: string;
          organization_id?: string;
          price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "procedures_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          job_title: string | null;
          phone: string | null;
          preferences: Json;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          job_title?: string | null;
          phone?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          job_title?: string | null;
          phone?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          amount: number | null;
          client_name: string;
          created_at: string;
          created_by: string;
          id: string;
          notes: string | null;
          organization_id: string;
          status: string;
          title: string;
          updated_at: string;
          valid_until: string | null;
        };
        Insert: {
          amount?: number | null;
          client_name: string;
          created_at?: string;
          created_by: string;
          id?: string;
          notes?: string | null;
          organization_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          valid_until?: string | null;
        };
        Update: {
          amount?: number | null;
          client_name?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proposals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          notes: string | null;
          organization_id: string;
          period_end: string | null;
          period_start: string | null;
          report_type: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          notes?: string | null;
          organization_id: string;
          period_end?: string | null;
          period_start?: string | null;
          report_type?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          period_end?: string | null;
          period_start?: string | null;
          report_type?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          amount: number;
          client_name: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          organization_id: string;
          sold_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          client_name: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          organization_id: string;
          sold_at?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          client_name?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          organization_id?: string;
          sold_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          amount: number | null;
          billing_cycle: string;
          client_name: string;
          created_at: string;
          created_by: string;
          id: string;
          organization_id: string;
          plan_name: string;
          started_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount?: number | null;
          billing_cycle?: string;
          client_name: string;
          created_at?: string;
          created_by: string;
          id?: string;
          organization_id: string;
          plan_name: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number | null;
          billing_cycle?: string;
          client_name?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          organization_id?: string;
          plan_name?: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          active: boolean;
          city: string | null;
          code: string;
          complement: string | null;
          created_at: string;
          id: string;
          is_headquarters: boolean;
          name: string;
          neighborhood: string | null;
          number: string | null;
          organization_id: string;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          street: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          city?: string | null;
          code: string;
          complement?: string | null;
          created_at?: string;
          id?: string;
          is_headquarters?: boolean;
          name: string;
          neighborhood?: string | null;
          number?: string | null;
          organization_id: string;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          city?: string | null;
          code?: string;
          complement?: string | null;
          created_at?: string;
          id?: string;
          is_headquarters?: boolean;
          name?: string;
          neighborhood?: string | null;
          number?: string | null;
          organization_id?: string;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string };
      crm_convert_lead_to_client: {
        Args: {
          _allergies: string;
          _birth_date: string;
          _city: string;
          _complement: string | null;
          _cpf: string;
          _lead_id: string;
          _neighborhood: string;
          _number: string;
          _postal_code: string;
          _state: string;
          _street: string;
        };
        Returns: string;
      };
      crm_create_charge_with_installments: {
        Args: {
          _client_id: string;
          _description: string;
          _first_due_date: string;
          _installments_count: number;
          _notes: string | null;
          _project_id: string | null;
          _total_amount: number;
        };
        Returns: string;
      };
      get_invitation_by_token: {
        Args: { _token: string };
        Returns: {
          email: string;
          expires_at: string;
          organization_name: string;
          role: Database["public"]["Enums"]["app_role"];
          status: string;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "professional" | "receptionist" | "manager" | "financial";
      clinic_specialty: "aesthetics" | "dentistry" | "medicine";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "professional", "receptionist", "manager", "financial"],
      clinic_specialty: ["aesthetics", "dentistry", "medicine"],
    },
  },
} as const;
