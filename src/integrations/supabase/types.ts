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
          approved_path: string | null
          author_name: string
          company_code: string
          created_at: string | null
          department: string
          draft_content: string | null
          draft_path: string
          id: string
          signature_hash: string | null
          status: string | null
          title: string
        }
        Insert: {
          ai_summary?: string | null
          approved_path?: string | null
          author_name: string
          company_code: string
          created_at?: string | null
          department: string
          draft_content?: string | null
          draft_path: string
          id?: string
          signature_hash?: string | null
          status?: string | null
          title: string
        }
        Update: {
          ai_summary?: string | null
          approved_path?: string | null
          author_name?: string
          company_code?: string
          created_at?: string | null
          department?: string
          draft_content?: string | null
          draft_path?: string
          id?: string
          signature_hash?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      causal_graph_edges: {
        Row: {
          description: string | null
          id: string
          impact_weight: number | null
          relation_type: string
          source_entity: string
          target_entity: string
        }
        Insert: {
          description?: string | null
          id?: string
          impact_weight?: number | null
          relation_type: string
          source_entity: string
          target_entity: string
        }
        Update: {
          description?: string | null
          id?: string
          impact_weight?: number | null
          relation_type?: string
          source_entity?: string
          target_entity?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          code: string
          created_at: string | null
          drive_folder_id: string | null
          id: string
          name: string
          storage_quota_gb: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          drive_folder_id?: string | null
          id?: string
          name: string
          storage_quota_gb?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          drive_folder_id?: string | null
          id?: string
          name?: string
          storage_quota_gb?: number | null
        }
        Relationships: []
      }
      gps_checkins: {
        Row: {
          company_code: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photo_data: string | null
          staff_name: string | null
        }
        Insert: {
          company_code?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_data?: string | null
          staff_name?: string | null
        }
        Update: {
          company_code?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_data?: string | null
          staff_name?: string | null
        }
        Relationships: []
      }
      knowledge_vectors: {
        Row: {
          company_code: string | null
          content: string
          created_at: string | null
          domain: string
          id: string
          source_citation: string | null
          title: string
        }
        Insert: {
          company_code?: string | null
          content: string
          created_at?: string | null
          domain: string
          id?: string
          source_citation?: string | null
          title: string
        }
        Update: {
          company_code?: string | null
          content?: string
          created_at?: string | null
          domain?: string
          id?: string
          source_citation?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
