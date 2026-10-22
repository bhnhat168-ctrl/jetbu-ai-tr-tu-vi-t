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
      admin_advisor_logs: {
        Row: {
          ai_name: string | null
          citations: Json
          company_code: string
          content: string
          created_at: string
          done: boolean
          due_at: string | null
          id: string
          kind: string
          role: string
          tier_used: number | null
        }
        Insert: {
          ai_name?: string | null
          citations?: Json
          company_code?: string
          content: string
          created_at?: string
          done?: boolean
          due_at?: string | null
          id?: string
          kind?: string
          role: string
          tier_used?: number | null
        }
        Update: {
          ai_name?: string | null
          citations?: Json
          company_code?: string
          content?: string
          created_at?: string
          done?: boolean
          due_at?: string | null
          id?: string
          kind?: string
          role?: string
          tier_used?: number | null
        }
        Relationships: []
      }
      ai_api_gateways: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          enabled: boolean
          fail_count: number
          id: string
          is_healthy: boolean
          key_last4: string | null
          last_checked: string | null
          last_error: string | null
          last_status: number | null
          model_id: string
          name: string
          priority: number
          supports_json: boolean
          updated_at: string
        }
        Insert: {
          api_key?: string
          base_url: string
          created_at?: string
          enabled?: boolean
          fail_count?: number
          id?: string
          is_healthy?: boolean
          key_last4?: string | null
          last_checked?: string | null
          last_error?: string | null
          last_status?: number | null
          model_id: string
          name: string
          priority?: number
          supports_json?: boolean
          updated_at?: string
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          enabled?: boolean
          fail_count?: number
          id?: string
          is_healthy?: boolean
          key_last4?: string | null
          last_checked?: string | null
          last_error?: string | null
          last_status?: number | null
          model_id?: string
          name?: string
          priority?: number
          supports_json?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ai_autonomous_creations: {
        Row: {
          admin_feedback: string | null
          company_code: string
          created_at: string
          creation_type: string
          drive_file_id: string | null
          full_markdown: string
          id: string
          instruction: string
          lease_until: string | null
          pause_reason: string | null
          reviewed_at: string | null
          signature_hash: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_feedback?: string | null
          company_code: string
          created_at?: string
          creation_type: string
          drive_file_id?: string | null
          full_markdown?: string
          id?: string
          instruction?: string
          lease_until?: string | null
          pause_reason?: string | null
          reviewed_at?: string | null
          signature_hash?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_feedback?: string | null
          company_code?: string
          created_at?: string
          creation_type?: string
          drive_file_id?: string | null
          full_markdown?: string
          id?: string
          instruction?: string
          lease_until?: string | null
          pause_reason?: string | null
          reviewed_at?: string | null
          signature_hash?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          custom_providers: Json
          id: number
          routing: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          custom_providers?: Json
          id?: number
          routing?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          custom_providers?: Json
          id?: number
          routing?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          name: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          name: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
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
      books_luc_dao: {
        Row: {
          ai_participants: string[]
          applications: Json
          company_code: string
          content_md: string
          council_log: Json
          created_at: string
          cycle_round: number
          id: string
          origin: string
          realms: Json
          status: string
          title_vi: string
          topic: string
        }
        Insert: {
          ai_participants?: string[]
          applications?: Json
          company_code?: string
          content_md: string
          council_log?: Json
          created_at?: string
          cycle_round?: number
          id?: string
          origin?: string
          realms?: Json
          status?: string
          title_vi: string
          topic: string
        }
        Update: {
          ai_participants?: string[]
          applications?: Json
          company_code?: string
          content_md?: string
          council_log?: Json
          created_at?: string
          cycle_round?: number
          id?: string
          origin?: string
          realms?: Json
          status?: string
          title_vi?: string
          topic?: string
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
          address: string
          auto_harvest: boolean
          brand_kit_json: Json | null
          code: string
          created_at: string | null
          drive_folder_id: string | null
          drive_root_folder_id: string | null
          id: string
          industry: string
          name: string
          representative: string | null
          storage_quota_gb: number | null
          tax_code: string | null
        }
        Insert: {
          address?: string
          auto_harvest?: boolean
          brand_kit_json?: Json | null
          code: string
          created_at?: string | null
          drive_folder_id?: string | null
          drive_root_folder_id?: string | null
          id?: string
          industry?: string
          name: string
          representative?: string | null
          storage_quota_gb?: number | null
          tax_code?: string | null
        }
        Update: {
          address?: string
          auto_harvest?: boolean
          brand_kit_json?: Json | null
          code?: string
          created_at?: string | null
          drive_folder_id?: string | null
          drive_root_folder_id?: string | null
          id?: string
          industry?: string
          name?: string
          representative?: string | null
          storage_quota_gb?: number | null
          tax_code?: string | null
        }
        Relationships: []
      }
      company_dossiers: {
        Row: {
          byte_size: number
          company_code: string
          created_at: string
          file_kind: string
          file_name: string
          id: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          byte_size: number
          company_code: string
          created_at?: string
          file_kind: string
          file_name: string
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          byte_size?: number
          company_code?: string
          created_at?: string
          file_kind?: string
          file_name?: string
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_dossiers_company_code_fkey"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
        ]
      }
      daily_world_news: {
        Row: {
          company_code: string
          content_md: string
          created_at: string
          id: string
          market_view: Json
          news_date: string
          sources: Json
          title: string
          verified_by: string[]
        }
        Insert: {
          company_code?: string
          content_md: string
          created_at?: string
          id?: string
          market_view?: Json
          news_date?: string
          sources?: Json
          title: string
          verified_by?: string[]
        }
        Update: {
          company_code?: string
          content_md?: string
          created_at?: string
          id?: string
          market_view?: Json
          news_date?: string
          sources?: Json
          title?: string
          verified_by?: string[]
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
          permissions: Json
          position_title: string
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
          permissions?: Json
          position_title?: string
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
          permissions?: Json
          position_title?: string
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
      knowledge_base: {
        Row: {
          compressed_content: string
          created_at: string
          id: string
          summary: string | null
          title: string
          token_count: number
          user_id: string
        }
        Insert: {
          compressed_content: string
          created_at?: string
          id?: string
          summary?: string | null
          title: string
          token_count?: number
          user_id: string
        }
        Update: {
          compressed_content?: string
          created_at?: string
          id?: string
          summary?: string | null
          title?: string
          token_count?: number
          user_id?: string
        }
        Relationships: []
      }
      knowledge_harvest_jobs: {
        Row: {
          category_folder: string
          company_code: string
          compressed_bytes: number
          created_at: string
          cycle: number
          drive_file_id: string | null
          failover_log: Json
          id: string
          lease_until: string | null
          mode: string
          next_seed: string | null
          pause_reason: string | null
          raw_bytes: number
          realm: string | null
          schedule_config: Json | null
          seed: string | null
          slot: number | null
          slot_date: string | null
          sources: Json
          spawned_variables: Json
          status: string
          synthesized_content: string
          topic: string
          topic_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category_folder: string
          company_code: string
          compressed_bytes?: number
          created_at?: string
          cycle?: number
          drive_file_id?: string | null
          failover_log?: Json
          id?: string
          lease_until?: string | null
          mode?: string
          next_seed?: string | null
          pause_reason?: string | null
          raw_bytes?: number
          realm?: string | null
          schedule_config?: Json | null
          seed?: string | null
          slot?: number | null
          slot_date?: string | null
          sources?: Json
          spawned_variables?: Json
          status?: string
          synthesized_content?: string
          topic: string
          topic_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category_folder?: string
          company_code?: string
          compressed_bytes?: number
          created_at?: string
          cycle?: number
          drive_file_id?: string | null
          failover_log?: Json
          id?: string
          lease_until?: string | null
          mode?: string
          next_seed?: string | null
          pause_reason?: string | null
          raw_bytes?: number
          realm?: string | null
          schedule_config?: Json | null
          seed?: string | null
          slot?: number | null
          slot_date?: string | null
          sources?: Json
          spawned_variables?: Json
          status?: string
          synthesized_content?: string
          topic?: string
          topic_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_harvest_missions: {
        Row: {
          approved_at: string | null
          company_code: string
          created_at: string | null
          data_size_kb: number | null
          drive_file_id: string | null
          id: string
          input_source_type: string | null
          is_approved_and_saved: boolean | null
          is_global_shared: boolean | null
          items_collected: number | null
          lease_token: string | null
          lease_until: string | null
          luc_dao_wheel_analysis: Json | null
          mission_title: string
          multi_company_application: Json | null
          pause_reason: string | null
          practical_masterpiece_content: string | null
          realm_cursor: number
          sha256_dedup_hash: string | null
          source_channel: string
          source_evidence: Json
          source_job_id: string | null
          status: string
          summary_content: string | null
          target_drive_folder: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          company_code?: string
          created_at?: string | null
          data_size_kb?: number | null
          drive_file_id?: string | null
          id?: string
          input_source_type?: string | null
          is_approved_and_saved?: boolean | null
          is_global_shared?: boolean | null
          items_collected?: number | null
          lease_token?: string | null
          lease_until?: string | null
          luc_dao_wheel_analysis?: Json | null
          mission_title: string
          multi_company_application?: Json | null
          pause_reason?: string | null
          practical_masterpiece_content?: string | null
          realm_cursor?: number
          sha256_dedup_hash?: string | null
          source_channel?: string
          source_evidence?: Json
          source_job_id?: string | null
          status?: string
          summary_content?: string | null
          target_drive_folder?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          company_code?: string
          created_at?: string | null
          data_size_kb?: number | null
          drive_file_id?: string | null
          id?: string
          input_source_type?: string | null
          is_approved_and_saved?: boolean | null
          is_global_shared?: boolean | null
          items_collected?: number | null
          lease_token?: string | null
          lease_until?: string | null
          luc_dao_wheel_analysis?: Json | null
          mission_title?: string
          multi_company_application?: Json | null
          pause_reason?: string | null
          practical_masterpiece_content?: string | null
          realm_cursor?: number
          sha256_dedup_hash?: string | null
          source_channel?: string
          source_evidence?: Json
          source_job_id?: string | null
          status?: string
          summary_content?: string | null
          target_drive_folder?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_library_settings: {
        Row: {
          allow_all_companies: boolean
          created_at: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_all_companies?: boolean
          created_at?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_all_companies?: boolean
          created_at?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      knowledge_md_chunks: {
        Row: {
          category: string
          chunk_index: number
          company_code: string
          content: string
          created_at: string
          doc_id: string
          embedding: string | null
          fts: unknown
          heading: string | null
          id: string
        }
        Insert: {
          category: string
          chunk_index: number
          company_code: string
          content: string
          created_at?: string
          doc_id: string
          embedding?: string | null
          fts?: unknown
          heading?: string | null
          id?: string
        }
        Update: {
          category?: string
          chunk_index?: number
          company_code?: string
          content?: string
          created_at?: string
          doc_id?: string
          embedding?: string | null
          fts?: unknown
          heading?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_md_chunks_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "knowledge_md_store"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_md_store: {
        Row: {
          category: string
          company_code: string
          content_md: string
          created_at: string
          embedding: string | null
          file_name: string
          fts: unknown
          id: string
          source_name: string | null
          source_type: string
          source_url: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          verified_by: string[]
          word_count: number | null
        }
        Insert: {
          category?: string
          company_code?: string
          content_md: string
          created_at?: string
          embedding?: string | null
          file_name: string
          fts?: unknown
          id?: string
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          verified_by?: string[]
          word_count?: number | null
        }
        Update: {
          category?: string
          company_code?: string
          content_md?: string
          created_at?: string
          embedding?: string | null
          file_name?: string
          fts?: unknown
          id?: string
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          verified_by?: string[]
          word_count?: number | null
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
      legal_knowledge: {
        Row: {
          citations: Json
          company_code: string
          content_md: string
          created_at: string
          id: string
          jurisdiction: string
          question: string
          risk_level: string | null
          title: string
          verified_by: string[]
        }
        Insert: {
          citations?: Json
          company_code?: string
          content_md: string
          created_at?: string
          id?: string
          jurisdiction?: string
          question: string
          risk_level?: string | null
          title: string
          verified_by?: string[]
        }
        Update: {
          citations?: Json
          company_code?: string
          content_md?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          question?: string
          risk_level?: string | null
          title?: string
          verified_by?: string[]
        }
        Relationships: []
      }
      mass_audit_batches: {
        Row: {
          batch_name: string
          company_code: string
          created_at: string
          custom_instruction: string | null
          drive_file_id: string | null
          executive_summary: string | null
          file_count: number
          id: string
          lease_token: string | null
          lease_until: string | null
          output_documents: Json
          pause_reason: string | null
          status: string
          task_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_name: string
          company_code: string
          created_at?: string
          custom_instruction?: string | null
          drive_file_id?: string | null
          executive_summary?: string | null
          file_count?: number
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          output_documents?: Json
          pause_reason?: string | null
          status?: string
          task_mode: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_name?: string
          company_code?: string
          created_at?: string
          custom_instruction?: string | null
          drive_file_id?: string | null
          executive_summary?: string | null
          file_count?: number
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          output_documents?: Json
          pause_reason?: string | null
          status?: string
          task_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mass_audit_items: {
        Row: {
          batch_id: string
          byte_size: number
          chunk_cursor: number
          created_at: string
          extracted_text: string
          file_name: string
          findings: string | null
          id: string
          position: number
          status: string
        }
        Insert: {
          batch_id: string
          byte_size: number
          chunk_cursor?: number
          created_at?: string
          extracted_text: string
          file_name: string
          findings?: string | null
          id?: string
          position: number
          status?: string
        }
        Update: {
          batch_id?: string
          byte_size?: number
          chunk_cursor?: number
          created_at?: string
          extracted_text?: string
          file_name?: string
          findings?: string | null
          id?: string
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mass_audit_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "mass_audit_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          company_code: string
          created_at: string
          duration_sec: number
          id: string
          mode: string
          segments: Json
          speakers: Json
          started_at: string
          summary_md: string | null
          title: string
          transcript_md: string
        }
        Insert: {
          company_code?: string
          created_at?: string
          duration_sec?: number
          id?: string
          mode?: string
          segments?: Json
          speakers?: Json
          started_at?: string
          summary_md?: string | null
          title: string
          transcript_md?: string
        }
        Update: {
          company_code?: string
          created_at?: string
          duration_sec?: number
          id?: string
          mode?: string
          segments?: Json
          speakers?: Json
          started_at?: string
          summary_md?: string | null
          title?: string
          transcript_md?: string
        }
        Relationships: []
      }
      scientific_knowledge_vectors: {
        Row: {
          allow_all_companies: boolean | null
          company_id: string | null
          company_scope: string | null
          content: string
          created_at: string | null
          domain: string
          id: string
          parent_context: string | null
          practical_work_title: string | null
          source_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          allow_all_companies?: boolean | null
          company_id?: string | null
          company_scope?: string | null
          content: string
          created_at?: string | null
          domain?: string
          id?: string
          parent_context?: string | null
          practical_work_title?: string | null
          source_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          allow_all_companies?: boolean | null
          company_id?: string | null
          company_scope?: string | null
          content?: string
          created_at?: string | null
          domain?: string
          id?: string
          parent_context?: string | null
          practical_work_title?: string | null
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
          company_code: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      v7_ai_access: {
        Row: {
          created_at: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          id: string
          reason: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      ai_api_gateways_public: {
        Row: {
          base_url: string | null
          created_at: string | null
          enabled: boolean | null
          fail_count: number | null
          id: string | null
          is_healthy: boolean | null
          key_last4: string | null
          last_checked: string | null
          last_error: string | null
          last_status: number | null
          model_id: string | null
          name: string | null
          priority: number | null
          supports_json: boolean | null
          updated_at: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string | null
          enabled?: boolean | null
          fail_count?: number | null
          id?: string | null
          is_healthy?: boolean | null
          key_last4?: string | null
          last_checked?: string | null
          last_error?: string | null
          last_status?: number | null
          model_id?: string | null
          name?: string | null
          priority?: number | null
          supports_json?: boolean | null
          updated_at?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string | null
          enabled?: boolean | null
          fail_count?: number | null
          id?: string | null
          is_healthy?: boolean | null
          key_last4?: string | null
          last_checked?: string | null
          last_error?: string | null
          last_status?: number | null
          model_id?: string | null
          name?: string | null
          priority?: number | null
          supports_json?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_group_admin: { Args: never; Returns: boolean }
      jetbu_auto_tags: {
        Args: { p_content: string; p_title: string }
        Returns: string[]
      }
      jetbu_chunk_doc: { Args: { p_doc: string }; Returns: undefined }
      jetbu_norm: { Args: { t: string }; Returns: string }
      jetbu_slug: { Args: { t: string }; Returns: string }
      knowledge_md_stats: {
        Args: { p_company?: string }
        Returns: {
          category: string
          docs: number
          last_at: string
          words: number
        }[]
      }
      knowledge_md_titles: {
        Args: { p_company?: string }
        Returns: {
          category: string
          file_name: string
          id: string
          tags: string[]
          title: string
          word_count: number
        }[]
      }
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
      practical_claim: {
        Args: {
          hash?: string
          mission: string
          operation: string
          token: string
        }
        Returns: boolean
      }
      practical_publish: {
        Args: { mission: string; token: string }
        Returns: boolean
      }
      search_knowledge_chunks: {
        Args: {
          p_category?: string
          p_company?: string
          p_limit?: number
          q: string
          query_embedding?: string
        }
        Returns: {
          category: string
          chunk_id: string
          content: string
          doc_id: string
          file_name: string
          heading: string
          score: number
          title: string
        }[]
      }
      search_knowledge_md: {
        Args: {
          p_category?: string
          p_company?: string
          p_limit?: number
          q: string
          query_embedding?: string
        }
        Returns: {
          category: string
          content_md: string
          file_name: string
          id: string
          score: number
          snippet: string
          source_name: string
          source_url: string
          title: string
        }[]
      }
      v7_claim_audit: {
        Args: { batch: string; token: string }
        Returns: boolean
      }
      v7_company_access: {
        Args: { admin_only?: boolean; code: string }
        Returns: boolean
      }
      v7_publish_creation: {
        Args: { approved_text: string; creation: string; hash: string }
        Returns: string
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
