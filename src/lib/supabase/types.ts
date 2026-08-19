export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          kind: string
          label: string
          opened_on: string
          opening_balance: number
          owner_member_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          kind: string
          label: string
          opened_on?: string
          opening_balance?: number
          owner_member_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          kind?: string
          label?: string
          opened_on?: string
          opening_balance?: number
          owner_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_contributions: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          from_member_id: string
          id: string
          note: string | null
          occurred_on: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          from_member_id: string
          id?: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          from_member_id?: string
          id?: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_contributions_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      column_mappings: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          header_signature: string
          id: string
          mapping: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          header_signature: string
          id?: string
          mapping: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          header_signature?: string
          id?: string
          mapping?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          note: string | null
          occurred_on: string
          taken_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          occurred_on?: string
          taken_by: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          occurred_on?: string
          taken_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          linked_user_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_staff: {
        Row: {
          agreed_fee: number
          created_at: string
          deleted_at: string | null
          id: string
          job_id: string
          role_label: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          agreed_fee: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_id: string
          role_label?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          agreed_fee?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_id?: string
          role_label?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_staff_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          agreed_amount: number
          client_name: string
          client_phone: string | null
          created_at: string
          deleted_at: string | null
          event_date: string
          event_type: string
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agreed_amount: number
          client_name: string
          client_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          event_date: string
          event_type?: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agreed_amount?: number
          client_name?: string
          client_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mapping_rules: {
        Row: {
          created_at: string
          default_category: string | null
          default_job_id: string | null
          default_staff_id: string | null
          deleted_at: string | null
          hit_count: number
          id: string
          kind: string
          ledger: string
          match_type: string
          pattern: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_category?: string | null
          default_job_id?: string | null
          default_staff_id?: string | null
          deleted_at?: string | null
          hit_count?: number
          id?: string
          kind: string
          ledger: string
          match_type: string
          pattern: string
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_category?: string | null
          default_job_id?: string | null
          default_staff_id?: string | null
          deleted_at?: string | null
          hit_count?: number
          id?: string
          kind?: string
          ledger?: string
          match_type?: string
          pattern?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapping_rules_default_job_id_fkey"
            columns: ["default_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapping_rules_default_staff_id_fkey"
            columns: ["default_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_allocations: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          job_staff_id: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_staff_id: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_staff_id?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_allocations_job_staff_id_fkey"
            columns: ["job_staff_id"]
            isOneToOne: false
            referencedRelation: "job_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          default_fee: number | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_fee?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_fee?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      statement_txns: {
        Row: {
          account_id: string
          balance_after: number | null
          created_at: string
          credit_amount: number
          debit_amount: number
          dedupe_hash: string
          deleted_at: string | null
          id: string
          mapped_transaction_id: string | null
          narration: string | null
          raw_row: Json
          ref_no: string | null
          status: string
          txn_date: string
          updated_at: string
          upload_id: string
        }
        Insert: {
          account_id: string
          balance_after?: number | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          dedupe_hash: string
          deleted_at?: string | null
          id?: string
          mapped_transaction_id?: string | null
          narration?: string | null
          raw_row?: Json
          ref_no?: string | null
          status?: string
          txn_date: string
          updated_at?: string
          upload_id: string
        }
        Update: {
          account_id?: string
          balance_after?: number | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          dedupe_hash?: string
          deleted_at?: string | null
          id?: string
          mapped_transaction_id?: string | null
          narration?: string | null
          raw_row?: Json
          ref_no?: string | null
          status?: string
          txn_date?: string
          updated_at?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_txns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_txns_mapped_transaction_id_fkey"
            columns: ["mapped_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_txns_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "statement_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_uploads: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          filename: string
          id: string
          mapped_count: number
          row_count: number
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          filename: string
          id?: string
          mapped_count?: number
          row_count?: number
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          filename?: string
          id?: string
          mapped_count?: number
          row_count?: number
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_uploads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          created_at: string
          deleted_at: string | null
          entered_by: string | null
          id: string
          job_id: string | null
          kind: string
          ledger: string
          member_id: string | null
          mode: string
          note: string | null
          occurred_on: string
          reference: string | null
          staff_id: string | null
          statement_txn_id: string | null
          transfer_group_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          entered_by?: string | null
          id?: string
          job_id?: string | null
          kind: string
          ledger: string
          member_id?: string | null
          mode?: string
          note?: string | null
          occurred_on?: string
          reference?: string | null
          staff_id?: string | null
          statement_txn_id?: string | null
          transfer_group_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          entered_by?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          ledger?: string
          member_id?: string | null
          mode?: string
          note?: string | null
          occurred_on?: string
          reference?: string | null
          staff_id?: string | null
          statement_txn_id?: string | null
          transfer_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_statement_txn_fk"
            columns: ["statement_txn_id"]
            isOneToOne: false
            referencedRelation: "statement_txns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_balances: {
        Args: never
        Returns: {
          account_id: string
          balance: number
          kind: string
          label: string
        }[]
      }
      business_cash_position: { Args: never; Returns: number }
      business_float_ok: { Args: never; Returns: boolean }
      current_profile_role: { Args: never; Returns: string }
      family_cash_position: { Args: never; Returns: number }
      family_drawings_feed: {
        Args: { p_from: string; p_to: string }
        Returns: {
          amount: number
          note: string
          occurred_on: string
        }[]
      }
      is_owner: { Args: never; Returns: boolean }
      job_financials: {
        Args: { p_job_id: string }
        Returns: {
          collected: number
          job_expenses: number
          paid_to_staff: number
          profit: number
          settled: boolean
          still_to_collect: number
        }[]
      }
      job_staff_still_to_pay: {
        Args: { p_job_staff_id: string }
        Returns: number
      }
      safe_to_spend: { Args: never; Returns: number }
      staff_payable_total: { Args: never; Returns: number }
      total_cash_across_accounts: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

