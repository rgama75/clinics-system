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
      accept_invitation: {
        Args: { _token: string };
        Returns: string;
      };
      get_invitation_by_token: {
        Args: { _token: string };
        Returns: {
          organization_name: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
          status: string;
          expires_at: string;
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
