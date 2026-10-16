export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      approval_reports: {
        Row: {
          ai_summary: string | null
          approved_at: string | null
          approved_path: string | null
          author_name: string
          company_code: string
          created_at: string | null
          department: string
          draft_content: string | null
          draft_path: string
          file_name: string | null
          id: string
          is_embedded_to_rag: boolean | null
          signature_hash: string | null
          status: string | null
          title: string
        }
        Insert: {
          ai_summary?: string | null
          approved_at?: string | null
          approved_path?: string | null
          author_name: string
          company_code: string
          created_at?: string | null
          department: string
          draft_content?: string | null
          draft_path: string
          file_name?: string | null
          id?: string
          is_embedded_to_rag?: boolean | null
          signature_hash?: string | null
          status?: string | null
          title: string
        }
        Update: {
          ai_summary?: string | null
          approved_at?: string | null
          approved_path?: string | null
          author_name?: string
          company_code?: string
          created_at?: string | null
          department?: string
          draft_content?: string | null
          draft_path?: string
          file_name?: string | null
          id?: string
          is_embedded_to_rag?: boolean | null
          signature_hash?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      causal_graph_edges: {
        Row: {
          company_code: string | null
          created_at: string | null
          description: string | null
          id: string
          impact_weight: number | null
          relation_type: string
          source_entity: string
          source_type: string | null
          target_entity: string
          target_type: string | null
        }
        Insert: {
          company_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_weight?: number | null
          relation_type: string
          source_entity: string
          source_type?: string | null
          target_entity: string
          target_type?: string | null
        }
        Update: {
          company_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_weight?: number | null
          relation_type?: string
          source_entity?: string
          source_type?: string | null
          target_entity?: string
          target_type?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          brand_kit_json: Json | null
          code: string
          created_at: string | null
          drive_folder_id: string | null
          drive_root_folder_id: string | null
          id: string
          name: string
          representative: string | null
          storage_quota_gb: number | null
          tax_code: string | null
        }
        Insert: {
          brand_kit_json?: Json | null
          code: string
          created_at?: string | null
          drive_folder_id?: string | null
          drive_root_folder_id?: string | null
          id?: string
          name: string
          representative?: string | null
          storage_quota_gb?: number | null
          tax_code?: string | null
        }
        Update: {
          brand_kit_json?: Json | null
          code?: string
          created_at?: string | null
          drive_folder_id?: string | null
          drive_root_folder_id?: string | null
          id?: string
          name?: string
          representative?: string | null
          storage_quota_gb?: number | null
          tax_code?: string | null
        }
        Relationships: []
      }
      employee_companies: {
        Row: {
          company_code: string | null
          company_id: string | null
          created_at: string | null
          department: string
          id: string
          role: string
          storage_quota_gb: number | null
          user_id: string
        }
        Insert: {
          company_code?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string
          id?: string
          role?: string
          storage_quota_gb?: number | null
          user_id: string
        }
        Update: {
          company_code?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string
          id?: string
          role?: string
          storage_quota_gb?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_permissions: {
        Row: {
          can_approve: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          company_code: string
          created_at: string | null
          department: string | null
          folder_id: string
          folder_name: string
          id: string
          role: string
        }
        Insert: {
          can_approve?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          company_code: string
          created_at?: string | null
          department?: string | null
          folder_id: string
          folder_name: string
          id?: string
          role: string
        }
        Update: {
          can_approve?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          company_code?: string
          created_at?: string | null
          department?: string | null
          folder_id?: string
          folder_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      gps_checkins: {
        Row: {
          company_code: string | null
          created_at: string | null
          department: string | null
          device_hash: string | null
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          photo_data: string | null
          staff_name: string | null
          task_note: string | null
          user_id: string | null
        }
        Insert: {
          company_code?: string | null
          created_at?: string | null
          department?: string | null
          device_hash?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          photo_data?: string | null
          staff_name?: string | null
          task_note?: string | null
          user_id?: string | null
        }
        Update: {
          company_code?: string | null
          created_at?: string | null
          department?: string | null
          device_hash?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          photo_data?: string | null
          staff_name?: string | null
          task_note?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_vectors: {
        Row: {
          company_code: string | null
          content: string
          created_at: string | null
          domain: string
          embedding: string | null
          id: string
          parent_context: string | null
          source_citation: string | null
          source_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          company_code?: string | null
          content: string
          created_at?: string | null
          domain: string
          embedding?: string | null
          id?: string
          parent_context?: string | null
          source_citation?: string | null
          source_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          company_code?: string | null
          content?: string
          created_at?: string | null
          domain?: string
          embedding?: string | null
          id?: string
          parent_context?: string | null
          source_citation?: string | null
          source_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_at: string | null
          assignee_name: string | null
          company_code: string
          completed_at: string | null
          department: string
          gps_verified: boolean | null
          id: string
          priority: string | null
          started_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          assigned_at?: string | null
          assignee_name?: string | null
          company_code?: string
          completed_at?: string | null
          department: string
          gps_verified?: boolean | null
          id?: string
          priority?: string | null
          started_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          assigned_at?: string | null
          assignee_name?: string | null
          company_code?: string
          completed_at?: string | null
          department?: string
          gps_verified?: boolean | null
          id?: string
          priority?: string | null
          started_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_jetbu_knowledge: {
        Args: {
          filter_domain?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          domain: string
          id: string
          parent_context: string
          similarity: number
          title: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
