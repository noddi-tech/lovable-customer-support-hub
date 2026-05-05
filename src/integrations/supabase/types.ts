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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_category: string
          action_type: string
          actor_email: string
          actor_id: string | null
          actor_role: string
          changes: Json
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string | null
          target_id: string | null
          target_identifier: string | null
          target_type: string
        }
        Insert: {
          action_category: string
          action_type: string
          actor_email: string
          actor_id?: string | null
          actor_role: string
          changes?: Json
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_identifier?: string | null
          target_type: string
        }
        Update: {
          action_category?: string
          action_type?: string
          actor_email?: string
          actor_id?: string | null
          actor_role?: string
          changes?: Json
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_identifier?: string | null
          target_type?: string
        }
        Relationships: []
      }
      ai_action_flows: {
        Row: {
          created_at: string
          description: string | null
          flow_steps: Json
          id: string
          intent_key: string
          is_active: boolean
          label: string
          organization_id: string
          requires_verification: boolean
          sort_order: number
          trigger_phrases: string[] | null
          updated_at: string
          widget_config_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_steps?: Json
          id?: string
          intent_key: string
          is_active?: boolean
          label: string
          organization_id: string
          requires_verification?: boolean
          sort_order?: number
          trigger_phrases?: string[] | null
          updated_at?: string
          widget_config_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_steps?: Json
          id?: string
          intent_key?: string
          is_active?: boolean
          label?: string
          organization_id?: string
          requires_verification?: boolean
          sort_order?: number
          trigger_phrases?: string[] | null
          updated_at?: string
          widget_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_flows_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_instructions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          instruction_text: string
          is_active: boolean
          organization_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          instruction_text: string
          is_active?: boolean
          organization_id: string
          priority?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instruction_text?: string
          is_active?: boolean
          organization_id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_instructions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_conversations: {
        Row: {
          applicant_id: string
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          applicant_id: string
          conversation_id: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          applicant_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_conversations_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_files: {
        Row: {
          applicant_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          organization_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          applicant_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string
          id?: string
          organization_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          applicant_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          organization_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_files_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_notes: {
        Row: {
          applicant_id: string
          application_id: string | null
          author_id: string
          content: string
          created_at: string
          id: string
          note_type: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id?: string | null
          author_id: string
          content: string
          created_at?: string
          id?: string
          note_type?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_notes_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applicants: {
        Row: {
          availability_date: string | null
          certifications: string[]
          created_at: string
          drivers_license_classes: string[]
          email: string
          external_id: string | null
          first_name: string
          gdpr_consent: boolean
          gdpr_consent_at: string | null
          id: string
          import_status: string | null
          imported_via: string | null
          imported_via_bulk_import_id: string | null
          language_norwegian: string
          last_name: string
          location: string | null
          metadata: Json
          organization_id: string
          own_vehicle: boolean | null
          phone: string | null
          source: string
          source_details: Json
          updated_at: string
          work_permit_status: string
          years_experience: number | null
        }
        Insert: {
          availability_date?: string | null
          certifications?: string[]
          created_at?: string
          drivers_license_classes?: string[]
          email: string
          external_id?: string | null
          first_name: string
          gdpr_consent?: boolean
          gdpr_consent_at?: string | null
          id?: string
          import_status?: string | null
          imported_via?: string | null
          imported_via_bulk_import_id?: string | null
          language_norwegian?: string
          last_name: string
          location?: string | null
          metadata?: Json
          organization_id: string
          own_vehicle?: boolean | null
          phone?: string | null
          source?: string
          source_details?: Json
          updated_at?: string
          work_permit_status?: string
          years_experience?: number | null
        }
        Update: {
          availability_date?: string | null
          certifications?: string[]
          created_at?: string
          drivers_license_classes?: string[]
          email?: string
          external_id?: string | null
          first_name?: string
          gdpr_consent?: boolean
          gdpr_consent_at?: string | null
          id?: string
          import_status?: string | null
          imported_via?: string | null
          imported_via_bulk_import_id?: string | null
          language_norwegian?: string
          last_name?: string
          location?: string | null
          metadata?: Json
          organization_id?: string
          own_vehicle?: boolean | null
          phone?: string | null
          source?: string
          source_details?: Json
          updated_at?: string
          work_permit_status?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_imported_via_bulk_import_id_fkey"
            columns: ["imported_via_bulk_import_id"]
            isOneToOne: false
            referencedRelation: "recruitment_bulk_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          applicant_id: string
          application_id: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          notes: string | null
          organization_id: string
          performed_by: string | null
        }
        Insert: {
          applicant_id: string
          application_id: string
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          notes?: string | null
          organization_id: string
          performed_by?: string | null
        }
        Update: {
          applicant_id?: string
          application_id?: string
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          notes?: string | null
          organization_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_id: string
          applied_at: string
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          current_stage_id: string
          entered_stage_at: string | null
          id: string
          organization_id: string
          position_id: string
          rejection_reason: string | null
          score: number | null
          score_breakdown: Json | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          current_stage_id?: string
          entered_stage_at?: string | null
          id?: string
          organization_id: string
          position_id: string
          rejection_reason?: string | null
          score?: number | null
          score_breakdown?: Json | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          current_stage_id?: string
          entered_stage_at?: string | null
          id?: string
          organization_id?: string
          position_id?: string
          rejection_reason?: string | null
          score?: number | null
          score_breakdown?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_outreach_jobs: {
        Row: {
          created_at: string
          created_by: string
          failed_count: number
          id: string
          inbox_id: string | null
          message_template: string
          organization_id: string
          recipient_count: number
          recipients: Json
          sent_count: number
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          created_by: string
          failed_count?: number
          id?: string
          inbox_id?: string | null
          message_template: string
          organization_id: string
          recipient_count?: number
          recipients?: Json
          sent_count?: number
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          created_by?: string
          failed_count?: number
          id?: string
          inbox_id?: string | null
          message_template?: string
          organization_id?: string
          recipient_count?: number
          recipients?: Json
          sent_count?: number
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_outreach_jobs_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_outreach_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events: {
        Row: {
          call_id: string
          created_at: string
          event_data: Json | null
          event_type: Database["public"]["Enums"]["call_event_type"]
          id: string
          timestamp: string
        }
        Insert: {
          call_id: string
          created_at?: string
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["call_event_type"]
          id?: string
          timestamp?: string
        }
        Update: {
          call_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["call_event_type"]
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_notes: {
        Row: {
          call_id: string
          content: string
          created_at: string
          created_by_id: string
          id: string
          is_private: boolean | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          call_id: string
          content: string
          created_at?: string
          created_by_id: string
          id?: string
          is_private?: boolean | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          call_id?: string
          content?: string
          created_at?: string
          created_by_id?: string
          id?: string
          is_private?: boolean | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_notes_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_notes_created_by_id_profiles_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_phone: string | null
          availability_status: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          enriched_details: Json | null
          external_id: string
          hangup_cause: string | null
          hidden: boolean | null
          id: string
          ivr_interaction: Json | null
          metadata: Json | null
          organization_id: string
          provider: string
          recording_url: string | null
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
          webhook_event_type: string | null
        }
        Insert: {
          agent_phone?: string | null
          availability_status?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          enriched_details?: Json | null
          external_id: string
          hangup_cause?: string | null
          hidden?: boolean | null
          id?: string
          ivr_interaction?: Json | null
          metadata?: Json | null
          organization_id: string
          provider?: string
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
          webhook_event_type?: string | null
        }
        Update: {
          agent_phone?: string | null
          availability_status?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          enriched_details?: Json | null
          external_id?: string
          hangup_cause?: string | null
          hidden?: boolean | null
          id?: string
          ivr_interaction?: Json | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
          webhook_event_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing_indicators: {
        Row: {
          conversation_id: string | null
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversation_evaluations: {
        Row: {
          accuracy_score: number | null
          completeness_score: number | null
          composite_score: number | null
          conversation_id: string
          created_at: string | null
          evaluation_notes: string | null
          evaluator_model: string | null
          flagged_for_review: boolean | null
          helpfulness_score: number | null
          id: string
          organization_id: string
          policy_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          tone_score: number | null
        }
        Insert: {
          accuracy_score?: number | null
          completeness_score?: number | null
          composite_score?: number | null
          conversation_id: string
          created_at?: string | null
          evaluation_notes?: string | null
          evaluator_model?: string | null
          flagged_for_review?: boolean | null
          helpfulness_score?: number | null
          id?: string
          organization_id: string
          policy_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tone_score?: number | null
        }
        Update: {
          accuracy_score?: number | null
          completeness_score?: number | null
          composite_score?: number | null
          conversation_id?: string
          created_at?: string | null
          evaluation_notes?: string | null
          evaluator_model?: string | null
          flagged_for_review?: boolean | null
          helpfulness_score?: number | null
          id?: string
          organization_id?: string
          policy_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tone_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_evaluations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "widget_ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to_id: string | null
          auto_close_days: number | null
          call_id: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          department_id: string | null
          email_account_id: string | null
          external_id: string | null
          first_response_at: string | null
          id: string
          inbox_id: string | null
          is_archived: boolean | null
          is_read: boolean | null
          last_message_is_internal: boolean | null
          last_message_sender_type: string | null
          memories_extracted_at: string | null
          metadata: Json | null
          organization_id: string
          preview_text: string | null
          priority: string
          received_at: string | null
          sla_breach_at: string | null
          snooze_until: string | null
          snoozed_by_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          auto_close_days?: number | null
          call_id?: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email_account_id?: string | null
          external_id?: string | null
          first_response_at?: string | null
          id?: string
          inbox_id?: string | null
          is_archived?: boolean | null
          is_read?: boolean | null
          last_message_is_internal?: boolean | null
          last_message_sender_type?: string | null
          memories_extracted_at?: string | null
          metadata?: Json | null
          organization_id: string
          preview_text?: string | null
          priority?: string
          received_at?: string | null
          sla_breach_at?: string | null
          snooze_until?: string | null
          snoozed_by_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          auto_close_days?: number | null
          call_id?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email_account_id?: string | null
          external_id?: string | null
          first_response_at?: string | null
          id?: string
          inbox_id?: string | null
          is_archived?: boolean | null
          is_read?: boolean | null
          last_message_is_internal?: boolean | null
          last_message_sender_type?: string | null
          memories_extracted_at?: string | null
          metadata?: Json | null
          organization_id?: string
          preview_text?: string | null
          priority?: string
          received_at?: string | null
          sla_breach_at?: string | null
          snooze_until?: string | null
          snoozed_by_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_alert_feedback: {
        Row: {
          ai_category: string | null
          conversation_id: string | null
          created_at: string
          id: string
          matched_keyword: string | null
          notification_id: string | null
          organization_id: string
          reaction: string
          reactor_email: string | null
          reactor_slack_id: string
          resolved_bucket: string | null
          slack_channel_id: string | null
          slack_message_ts: string | null
          trigger_source: string
        }
        Insert: {
          ai_category?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_keyword?: string | null
          notification_id?: string | null
          organization_id: string
          reaction: string
          reactor_email?: string | null
          reactor_slack_id: string
          resolved_bucket?: string | null
          slack_channel_id?: string | null
          slack_message_ts?: string | null
          trigger_source: string
        }
        Update: {
          ai_category?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_keyword?: string | null
          notification_id?: string | null
          organization_id?: string
          reaction?: string
          reactor_email?: string | null
          reactor_slack_id?: string
          resolved_bucket?: string | null
          slack_channel_id?: string | null
          slack_message_ts?: string | null
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_alert_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_alert_feedback_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_alert_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_keyword_mutes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          keyword: string
          muted_by_id: string | null
          muted_via: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          keyword: string
          muted_by_id?: string | null
          muted_via?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          keyword?: string
          muted_by_id?: string | null
          muted_via?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_keyword_mutes_muted_by_id_fkey"
            columns: ["muted_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_keyword_mutes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memories: {
        Row: {
          confidence: number
          created_at: string
          customer_identifier: string
          embedding: string | null
          expires_at: string | null
          id: string
          identifier_type: string
          is_active: boolean | null
          language: string | null
          memory_text: string
          memory_type: string
          organization_id: string
          source_conversation_id: string | null
          structured_data: Json | null
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          customer_identifier: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          identifier_type: string
          is_active?: boolean | null
          language?: string | null
          memory_text: string
          memory_type: string
          organization_id: string
          source_conversation_id?: string | null
          structured_data?: Json | null
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          customer_identifier?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          identifier_type?: string
          is_active?: boolean | null
          language?: string | null
          memory_text?: string
          memory_type?: string
          organization_id?: string
          source_conversation_id?: string | null
          structured_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_summaries: {
        Row: {
          created_at: string
          customer_identifier: string
          first_seen_at: string | null
          id: string
          identifier_type: string
          last_seen_at: string | null
          organization_id: string
          sentiment_trend: string | null
          summary_text: string
          total_conversations: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_identifier: string
          first_seen_at?: string | null
          id?: string
          identifier_type: string
          last_seen_at?: string | null
          organization_id: string
          sentiment_trend?: string | null
          summary_text: string
          total_conversations?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_identifier?: string
          first_seen_at?: string | null
          id?: string
          identifier_type?: string
          last_seen_at?: string | null
          organization_id?: string
          sentiment_trend?: string | null
          summary_text?: string
          total_conversations?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          event: string
          id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          event: string
          id?: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          event?: string
          id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          auto_sync_enabled: boolean
          created_at: string
          email_address: string
          forwarding_address: string | null
          id: string
          inbox_id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          refresh_token: string | null
          sync_interval_minutes: number
          sync_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          auto_sync_enabled?: boolean
          created_at?: string
          email_address: string
          forwarding_address?: string | null
          id?: string
          inbox_id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          provider?: string
          refresh_token?: string | null
          sync_interval_minutes?: number
          sync_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          auto_sync_enabled?: boolean
          created_at?: string
          email_address?: string
          forwarding_address?: string | null
          id?: string
          inbox_id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          sync_interval_minutes?: number
          sync_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_domains: {
        Row: {
          created_at: string
          dns_records: Json
          domain: string
          id: string
          organization_id: string
          parse_subdomain: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dns_records?: Json
          domain: string
          id?: string
          organization_id: string
          parse_subdomain: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dns_records?: Json
          domain?: string
          id?: string
          organization_id?: string
          parse_subdomain?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_ingestion_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_message: string | null
          external_id: string | null
          from_email: string | null
          id: string
          metadata: Json | null
          source: string
          status: string
          subject: string | null
          to_email: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          from_email?: string | null
          id?: string
          metadata?: Json | null
          source: string
          status: string
          subject?: string | null
          to_email?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          from_email?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          status?: string
          subject?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ingestion_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_background_color: string | null
          body_text_color: string | null
          created_at: string
          created_by_id: string | null
          footer_background_color: string | null
          footer_content: string | null
          footer_text_color: string | null
          header_background_color: string | null
          header_content: string | null
          header_text_color: string | null
          id: string
          inbox_id: string | null
          include_agent_name: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          scope: string
          signature_content: string | null
          template_type: string
          updated_at: string
        }
        Insert: {
          body_background_color?: string | null
          body_text_color?: string | null
          created_at?: string
          created_by_id?: string | null
          footer_background_color?: string | null
          footer_content?: string | null
          footer_text_color?: string | null
          header_background_color?: string | null
          header_content?: string | null
          header_text_color?: string | null
          id?: string
          inbox_id?: string | null
          include_agent_name?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id: string
          scope?: string
          signature_content?: string | null
          template_type: string
          updated_at?: string
        }
        Update: {
          body_background_color?: string | null
          body_text_color?: string | null
          created_at?: string
          created_by_id?: string | null
          footer_background_color?: string | null
          footer_content?: string | null
          footer_text_color?: string | null
          header_background_color?: string | null
          header_content?: string | null
          header_text_color?: string | null
          id?: string
          inbox_id?: string | null
          include_agent_name?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          scope?: string
          signature_content?: string | null
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          conversations_imported: number | null
          created_at: string
          created_by: string | null
          customers_imported: number | null
          errors: Json | null
          id: string
          messages_imported: number | null
          metadata: Json | null
          organization_id: string
          source: string
          started_at: string | null
          status: string
          total_conversations: number | null
          total_mailboxes: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          conversations_imported?: number | null
          created_at?: string
          created_by?: string | null
          customers_imported?: number | null
          errors?: Json | null
          id?: string
          messages_imported?: number | null
          metadata?: Json | null
          organization_id: string
          source: string
          started_at?: string | null
          status?: string
          total_conversations?: number | null
          total_mailboxes?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          conversations_imported?: number | null
          created_at?: string
          created_by?: string | null
          customers_imported?: number | null
          errors?: Json | null
          id?: string
          messages_imported?: number | null
          metadata?: Json | null
          organization_id?: string
          source?: string
          started_at?: string | null
          status?: string
          total_conversations?: number | null
          total_mailboxes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_routes: {
        Row: {
          address: string
          alias_local_part: string
          created_at: string
          domain_id: string
          group_email: string | null
          id: string
          inbox_id: string | null
          is_active: boolean
          organization_id: string
          secret_token: string | null
          sender_display_name: string | null
          updated_at: string
        }
        Insert: {
          address: string
          alias_local_part: string
          created_at?: string
          domain_id: string
          group_email?: string | null
          id?: string
          inbox_id?: string | null
          is_active?: boolean
          organization_id: string
          secret_token?: string | null
          sender_display_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          alias_local_part?: string
          created_at?: string
          domain_id?: string
          group_email?: string | null
          id?: string
          inbox_id?: string | null
          is_active?: boolean
          organization_id?: string
          secret_token?: string | null
          sender_display_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_routes_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "email_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_routes_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_slack_routing: {
        Row: {
          channel_id: string
          channel_name: string | null
          created_at: string | null
          critical_channel_id: string | null
          critical_channel_name: string | null
          critical_enabled: boolean | null
          critical_ops_mention_mode: string | null
          critical_ops_subteam_handle: string | null
          critical_ops_subteam_id: string | null
          critical_ops_user_id: string | null
          critical_tech_mention_mode: string | null
          critical_tech_subteam_handle: string | null
          critical_tech_subteam_id: string | null
          critical_tech_user_id: string | null
          critical_use_secondary: boolean | null
          digest_channel_id: string | null
          digest_channel_name: string | null
          digest_enabled: boolean | null
          digest_use_secondary: boolean | null
          id: string
          inbox_id: string
          is_active: boolean | null
          slack_integration_id: string
          updated_at: string | null
          use_secondary_workspace: boolean | null
        }
        Insert: {
          channel_id: string
          channel_name?: string | null
          created_at?: string | null
          critical_channel_id?: string | null
          critical_channel_name?: string | null
          critical_enabled?: boolean | null
          critical_ops_mention_mode?: string | null
          critical_ops_subteam_handle?: string | null
          critical_ops_subteam_id?: string | null
          critical_ops_user_id?: string | null
          critical_tech_mention_mode?: string | null
          critical_tech_subteam_handle?: string | null
          critical_tech_subteam_id?: string | null
          critical_tech_user_id?: string | null
          critical_use_secondary?: boolean | null
          digest_channel_id?: string | null
          digest_channel_name?: string | null
          digest_enabled?: boolean | null
          digest_use_secondary?: boolean | null
          id?: string
          inbox_id: string
          is_active?: boolean | null
          slack_integration_id: string
          updated_at?: string | null
          use_secondary_workspace?: boolean | null
        }
        Update: {
          channel_id?: string
          channel_name?: string | null
          created_at?: string | null
          critical_channel_id?: string | null
          critical_channel_name?: string | null
          critical_enabled?: boolean | null
          critical_ops_mention_mode?: string | null
          critical_ops_subteam_handle?: string | null
          critical_ops_subteam_id?: string | null
          critical_ops_user_id?: string | null
          critical_tech_mention_mode?: string | null
          critical_tech_subteam_handle?: string | null
          critical_tech_subteam_id?: string | null
          critical_tech_user_id?: string | null
          critical_use_secondary?: boolean | null
          digest_channel_id?: string | null
          digest_channel_name?: string | null
          digest_enabled?: boolean | null
          digest_use_secondary?: boolean | null
          id?: string
          inbox_id?: string
          is_active?: boolean | null
          slack_integration_id?: string
          updated_at?: string | null
          use_secondary_workspace?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_slack_routing_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: true
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_slack_routing_slack_integration_id_fkey"
            columns: ["slack_integration_id"]
            isOneToOne: false
            referencedRelation: "slack_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      inboxes: {
        Row: {
          auto_assignment_rules: Json | null
          color: string | null
          created_at: string
          created_by_id: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          sender_display_name: string | null
          updated_at: string
        }
        Insert: {
          auto_assignment_rules?: Json | null
          color?: string | null
          created_at?: string
          created_by_id?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          sender_display_name?: string | null
          updated_at?: string
        }
        Update: {
          auto_assignment_rules?: Json | null
          color?: string | null
          created_at?: string
          created_by_id?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          sender_display_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_event_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          schema: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          schema?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          schema?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      internal_events: {
        Row: {
          assigned_to_id: string | null
          call_id: string | null
          conversation_id: string | null
          created_at: string | null
          customer_phone: string | null
          event_data: Json | null
          event_type: string
          id: string
          organization_id: string
          processed_at: string | null
          status: string | null
          triggered_by_event_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          call_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_phone?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          organization_id: string
          processed_at?: string | null
          status?: string | null
          triggered_by_event_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          call_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_phone?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          organization_id?: string
          processed_at?: string | null
          status?: string | null
          triggered_by_event_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_events_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "internal_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_event_type_fkey"
            columns: ["event_type"]
            isOneToOne: false
            referencedRelation: "internal_event_types"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "internal_events_triggered_by_event_id_fkey"
            columns: ["triggered_by_event_id"]
            isOneToOne: false
            referencedRelation: "call_events"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_email_logs: {
        Row: {
          created_at: string | null
          email: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          provider: string
          sent_by_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          sent_by_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          sent_by_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_email_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          campaign: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          employment_type: string
          finn_listing_url: string | null
          id: string
          location: string | null
          meta_lead_form_id: string | null
          organization_id: string
          pipeline_id: string | null
          published_at: string | null
          requirements: Json
          salary_range_max: number | null
          salary_range_min: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string
          finn_listing_url?: string | null
          id?: string
          location?: string | null
          meta_lead_form_id?: string | null
          organization_id: string
          pipeline_id?: string | null
          published_at?: string | null
          requirements?: Json
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string
          finn_listing_url?: string | null
          id?: string
          location?: string | null
          meta_lead_form_id?: string | null
          organization_id?: string
          pipeline_id?: string | null
          published_at?: string | null
          requirements?: Json
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_positions_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "recruitment_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          acceptance_count: number | null
          agent_response: string
          category: string | null
          created_at: string
          created_by_id: string | null
          created_from_message_id: string | null
          customer_context: string
          embedding: string | null
          id: string
          is_active: boolean | null
          is_manually_curated: boolean | null
          last_verified_at: string | null
          organization_id: string
          quality_score: number | null
          sanitized_at: string | null
          search_vector: unknown
          staleness_category: string | null
          tags: string[] | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          acceptance_count?: number | null
          agent_response: string
          category?: string | null
          created_at?: string
          created_by_id?: string | null
          created_from_message_id?: string | null
          customer_context: string
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          is_manually_curated?: boolean | null
          last_verified_at?: string | null
          organization_id: string
          quality_score?: number | null
          sanitized_at?: string | null
          search_vector?: unknown
          staleness_category?: string | null
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          acceptance_count?: number | null
          agent_response?: string
          category?: string | null
          created_at?: string
          created_by_id?: string | null
          created_from_message_id?: string | null
          customer_context?: string
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          is_manually_curated?: boolean | null
          last_verified_at?: string | null
          organization_id?: string
          quality_score?: number | null
          sanitized_at?: string | null
          search_vector?: unknown
          staleness_category?: string | null
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_created_from_message_id_fkey"
            columns: ["created_from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_extraction_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          entries_created: number | null
          entries_skipped: number | null
          error_message: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string
          total_conversations: number | null
          total_processed: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          entries_created?: number | null
          entries_skipped?: number | null
          error_message?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          status?: string
          total_conversations?: number | null
          total_processed?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          entries_created?: number | null
          entries_skipped?: number | null
          error_message?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          total_conversations?: number | null
          total_processed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_extraction_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_gaps: {
        Row: {
          conversation_id: string | null
          created_at: string
          frequency: number
          id: string
          last_seen_at: string
          organization_id: string
          priority: number | null
          question: string
          resolved_by_entry_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          organization_id: string
          priority?: number | null
          question: string
          resolved_by_entry_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          organization_id?: string
          priority?: number | null
          question?: string
          resolved_by_entry_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_gaps_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "widget_ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_resolved_by_entry_id_fkey"
            columns: ["resolved_by_entry_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_patterns: {
        Row: {
          created_at: string | null
          example_refinements: string[] | null
          id: string
          last_seen_at: string | null
          occurrence_count: number | null
          organization_id: string
          pattern_description: string | null
          pattern_key: string
          pattern_type: string
          success_rate: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          example_refinements?: string[] | null
          id?: string
          last_seen_at?: string | null
          occurrence_count?: number | null
          organization_id: string
          pattern_description?: string | null
          pattern_key: string
          pattern_type: string
          success_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          example_refinements?: string[] | null
          id?: string
          last_seen_at?: string | null
          occurrence_count?: number | null
          organization_id?: string
          pattern_description?: string | null
          pattern_key?: string
          pattern_type?: string
          success_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_pending_entries: {
        Row: {
          admin_quality_score: number | null
          agent_response: string
          ai_quality_score: number | null
          created_at: string
          customer_context: string
          evaluated_at: string | null
          evaluation_notes: Json | null
          evaluation_score: number | null
          extraction_job_id: string | null
          id: string
          organization_id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by_id: string | null
          source_conversation_id: string | null
          source_message_id: string | null
          suggested_category_id: string | null
          suggested_tags: string[] | null
          updated_at: string
        }
        Insert: {
          admin_quality_score?: number | null
          agent_response: string
          ai_quality_score?: number | null
          created_at?: string
          customer_context: string
          evaluated_at?: string | null
          evaluation_notes?: Json | null
          evaluation_score?: number | null
          extraction_job_id?: string | null
          id?: string
          organization_id: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_id?: string | null
          source_conversation_id?: string | null
          source_message_id?: string | null
          suggested_category_id?: string | null
          suggested_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          admin_quality_score?: number | null
          agent_response?: string
          ai_quality_score?: number | null
          created_at?: string
          customer_context?: string
          evaluated_at?: string | null
          evaluation_notes?: Json | null
          evaluation_score?: number | null
          extraction_job_id?: string | null
          id?: string
          organization_id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_id?: string | null
          source_conversation_id?: string | null
          source_message_id?: string | null
          suggested_category_id?: string | null
          suggested_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_pending_entries_extraction_job_id_fkey"
            columns: ["extraction_job_id"]
            isOneToOne: false
            referencedRelation: "knowledge_extraction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pending_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pending_entries_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pending_entries_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pending_entries_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_tags: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          assigned_to_id: string | null
          attachments: Json | null
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string
          email_headers: Json | null
          email_message_id: string | null
          email_status: string | null
          email_subject: string | null
          email_thread_id: string | null
          external_id: string | null
          id: string
          is_internal: boolean | null
          is_pinned: boolean | null
          sender_id: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          attachments?: Json | null
          content: string
          content_type?: string | null
          conversation_id: string
          created_at?: string
          email_headers?: Json | null
          email_message_id?: string | null
          email_status?: string | null
          email_subject?: string | null
          email_thread_id?: string | null
          external_id?: string | null
          id?: string
          is_internal?: boolean | null
          is_pinned?: boolean | null
          sender_id?: string | null
          sender_type: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          attachments?: Json | null
          content?: string
          content_type?: string | null
          conversation_id?: string
          created_at?: string
          email_headers?: Json | null
          email_message_id?: string | null
          email_status?: string | null
          email_subject?: string | null
          email_thread_id?: string | null
          external_id?: string | null
          id?: string
          is_internal?: boolean | null
          is_pinned?: boolean | null
          sender_id?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_campaigns: {
        Row: {
          clicked_count: number | null
          created_at: string
          delivered_count: number | null
          id: string
          name: string
          newsletter_id: string
          opened_count: number | null
          personalization_rules: Json | null
          segment_criteria: Json | null
          sent_at: string | null
          sent_count: number | null
          status: string
          updated_at: string
          user_id: string
          utm_parameters: Json | null
        }
        Insert: {
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          name: string
          newsletter_id: string
          opened_count?: number | null
          personalization_rules?: Json | null
          segment_criteria?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
          utm_parameters?: Json | null
        }
        Update: {
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          name?: string
          newsletter_id?: string
          opened_count?: number | null
          personalization_rules?: Json | null
          segment_criteria?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          utm_parameters?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_campaigns_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          description: string | null
          global_styles: Json | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          content?: Json
          created_at?: string
          description?: string | null
          global_styles?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          description?: string | null
          global_styles?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          content: Json
          created_at: string
          global_styles: Json | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_data: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          global_styles?: Json | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_data?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          global_styles?: Json | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_data?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      noddi_customer_cache: {
        Row: {
          cached_customer_data: Json | null
          cached_pending_bookings: Json | null
          cached_priority_booking: Json | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          last_refreshed_at: string
          noddi_user_id: number | null
          organization_id: string
          pending_bookings_count: number | null
          phone: string | null
          priority_booking_id: number | null
          priority_booking_type: string | null
          updated_at: string
          user_group_id: number | null
        }
        Insert: {
          cached_customer_data?: Json | null
          cached_pending_bookings?: Json | null
          cached_priority_booking?: Json | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_refreshed_at?: string
          noddi_user_id?: number | null
          organization_id: string
          pending_bookings_count?: number | null
          phone?: string | null
          priority_booking_id?: number | null
          priority_booking_type?: string | null
          updated_at?: string
          user_group_id?: number | null
        }
        Update: {
          cached_customer_data?: Json | null
          cached_pending_bookings?: Json | null
          cached_priority_booking?: Json | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_refreshed_at?: string
          noddi_user_id?: number | null
          organization_id?: string
          pending_bookings_count?: number | null
          phone?: string | null
          priority_booking_id?: number | null
          priority_booking_type?: string | null
          updated_at?: string
          user_group_id?: number | null
        }
        Relationships: []
      }
      note_templates: {
        Row: {
          color: string | null
          content: string
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          is_global: boolean | null
          name: string
          organization_id: string
          shortcut: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          organization_id: string
          shortcut?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          organization_id?: string
          shortcut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          app_on_conversation_assigned: boolean | null
          app_on_customer_reply: boolean | null
          app_on_incoming_call: boolean | null
          app_on_mention: boolean | null
          app_on_missed_call: boolean | null
          app_on_new_email: boolean | null
          app_on_sla_breach: boolean | null
          app_on_ticket_assigned: boolean | null
          app_on_ticket_commented: boolean | null
          app_on_ticket_updated: boolean | null
          app_on_voicemail: boolean | null
          created_at: string
          daily_digest_enabled: boolean | null
          email_on_conversation_assigned: boolean | null
          email_on_customer_reply: boolean | null
          email_on_mention: boolean | null
          email_on_missed_call: boolean | null
          email_on_new_email: boolean | null
          email_on_sla_breach: boolean | null
          email_on_ticket_assigned: boolean | null
          email_on_ticket_commented: boolean | null
          email_on_ticket_updated: boolean | null
          email_on_voicemail: boolean | null
          id: string
          organization_id: string
          updated_at: string
          user_id: string
          weekly_digest_enabled: boolean | null
        }
        Insert: {
          app_on_conversation_assigned?: boolean | null
          app_on_customer_reply?: boolean | null
          app_on_incoming_call?: boolean | null
          app_on_mention?: boolean | null
          app_on_missed_call?: boolean | null
          app_on_new_email?: boolean | null
          app_on_sla_breach?: boolean | null
          app_on_ticket_assigned?: boolean | null
          app_on_ticket_commented?: boolean | null
          app_on_ticket_updated?: boolean | null
          app_on_voicemail?: boolean | null
          created_at?: string
          daily_digest_enabled?: boolean | null
          email_on_conversation_assigned?: boolean | null
          email_on_customer_reply?: boolean | null
          email_on_mention?: boolean | null
          email_on_missed_call?: boolean | null
          email_on_new_email?: boolean | null
          email_on_sla_breach?: boolean | null
          email_on_ticket_assigned?: boolean | null
          email_on_ticket_commented?: boolean | null
          email_on_ticket_updated?: boolean | null
          email_on_voicemail?: boolean | null
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
          weekly_digest_enabled?: boolean | null
        }
        Update: {
          app_on_conversation_assigned?: boolean | null
          app_on_customer_reply?: boolean | null
          app_on_incoming_call?: boolean | null
          app_on_mention?: boolean | null
          app_on_missed_call?: boolean | null
          app_on_new_email?: boolean | null
          app_on_sla_breach?: boolean | null
          app_on_ticket_assigned?: boolean | null
          app_on_ticket_commented?: boolean | null
          app_on_ticket_updated?: boolean | null
          app_on_voicemail?: boolean | null
          created_at?: string
          daily_digest_enabled?: boolean | null
          email_on_conversation_assigned?: boolean | null
          email_on_customer_reply?: boolean | null
          email_on_mention?: boolean | null
          email_on_missed_call?: boolean | null
          email_on_new_email?: boolean | null
          email_on_sla_breach?: boolean | null
          email_on_ticket_assigned?: boolean | null
          email_on_ticket_commented?: boolean | null
          email_on_ticket_updated?: boolean | null
          email_on_voicemail?: boolean | null
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
          weekly_digest_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          created_at: string
          email: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_at: string | null
          invited_by_id: string | null
          is_default: boolean | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invited_by_id?: string | null
          is_default?: boolean | null
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invited_by_id?: string | null
          is_default?: boolean | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          primary_color: string | null
          recruitment_audit_last_cleanup_at: string | null
          recruitment_audit_retention_days: number
          sender_display_name: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          primary_color?: string | null
          recruitment_audit_last_cleanup_at?: string | null
          recruitment_audit_retention_days?: number
          sender_display_name?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          primary_color?: string | null
          recruitment_audit_last_cleanup_at?: string | null
          recruitment_audit_retention_days?: number
          sender_display_name?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      preference_pairs: {
        Row: {
          chosen_response: string
          created_at: string | null
          customer_message: string
          edit_category: string | null
          edit_distance: number | null
          id: string
          organization_id: string
          quality_verified: boolean | null
          rejected_response: string
          response_tracking_id: string | null
        }
        Insert: {
          chosen_response: string
          created_at?: string | null
          customer_message: string
          edit_category?: string | null
          edit_distance?: number | null
          id?: string
          organization_id: string
          quality_verified?: boolean | null
          rejected_response: string
          response_tracking_id?: string | null
        }
        Update: {
          chosen_response?: string
          created_at?: string | null
          customer_message?: string
          edit_category?: string | null
          edit_distance?: number | null
          id?: string
          organization_id?: string
          quality_verified?: boolean | null
          rejected_response?: string
          response_tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preference_pairs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preference_pairs_response_tracking_id_fkey"
            columns: ["response_tracking_id"]
            isOneToOne: false
            referencedRelation: "response_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chat_availability: string | null
          chat_availability_updated_at: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          preferred_language: string | null
          primary_role: Database["public"]["Enums"]["app_role"] | null
          role: string
          time_format: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          chat_availability?: string | null
          chat_availability_updated_at?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          preferred_language?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          role?: string
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          chat_availability?: string | null
          chat_availability_updated_at?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          preferred_language?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          role?: string
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      query_performance_logs: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          function_name: string
          id: string
          organization_id: string | null
          parameters: Json | null
          row_count: number | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          function_name: string
          id?: string
          organization_id?: string | null
          parameters?: Json | null
          row_count?: number | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          function_name?: string
          id?: string
          organization_id?: string | null
          parameters?: Json | null
          row_count?: number | null
        }
        Relationships: []
      }
      recruitment_admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          integration_id: string | null
          message: string
          organization_id: string
          resolved_at: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          integration_id?: string | null
          message: string
          organization_id: string
          resolved_at?: string | null
          severity: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          integration_id?: string | null
          message?: string
          organization_id?: string
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_admin_alerts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "recruitment_meta_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_admin_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_applicant_field_values: {
        Row: {
          applicant_id: string
          created_at: string
          field_id: string
          id: string
          raw_value: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          applicant_id: string
          created_at?: string
          field_id: string
          id?: string
          raw_value?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          applicant_id?: string
          created_at?: string
          field_id?: string
          id?: string
          raw_value?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_applicant_field_values_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_applicant_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "recruitment_custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_audit_events: {
        Row: {
          actor_profile_id: string | null
          actor_role: string | null
          applicant_id: string | null
          context: Json | null
          event_category: string
          event_type: string
          expires_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          organization_id: string
          subject_id: string | null
          subject_table: string
          user_agent: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          actor_role?: string | null
          applicant_id?: string | null
          context?: Json | null
          event_category: string
          event_type: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          organization_id: string
          subject_id?: string | null
          subject_table: string
          user_agent?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          actor_role?: string | null
          applicant_id?: string | null
          context?: Json | null
          event_category?: string
          event_type?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          organization_id?: string
          subject_id?: string | null
          subject_table?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_audit_events_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_automation_executions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_results: Json | null
          applicant_id: string | null
          application_id: string | null
          created_at: string
          duration_ms: number | null
          id: string
          is_dry_run: boolean
          organization_id: string
          overall_status: string
          rule_id: string | null
          rule_name: string
          skip_reason: string | null
          trigger_context: Json
          triggered_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_results?: Json | null
          applicant_id?: string | null
          application_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          is_dry_run?: boolean
          organization_id: string
          overall_status: string
          rule_id?: string | null
          rule_name: string
          skip_reason?: string | null
          trigger_context: Json
          triggered_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_results?: Json | null
          applicant_id?: string | null
          application_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          is_dry_run?: boolean
          organization_id?: string
          overall_status?: string
          rule_id?: string | null
          rule_name?: string
          skip_reason?: string | null
          trigger_context?: Json
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_automation_executions_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_executions_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_executions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "recruitment_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_executions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_automation_queue: {
        Row: {
          actor_profile_id: string
          completed_at: string | null
          created_at: string
          error_text: string | null
          execution_id: string
          id: string
          organization_id: string
          picked_up_at: string | null
          rule_id: string | null
          rule_snapshot: Json
          status: string
          trigger_context: Json
        }
        Insert: {
          actor_profile_id: string
          completed_at?: string | null
          created_at?: string
          error_text?: string | null
          execution_id: string
          id?: string
          organization_id: string
          picked_up_at?: string | null
          rule_id?: string | null
          rule_snapshot: Json
          status?: string
          trigger_context: Json
        }
        Update: {
          actor_profile_id?: string
          completed_at?: string | null
          created_at?: string
          error_text?: string | null
          execution_id?: string
          id?: string
          organization_id?: string
          picked_up_at?: string | null
          rule_id?: string | null
          rule_snapshot?: Json
          status?: string
          trigger_context?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_automation_queue_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_queue_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "recruitment_automation_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "recruitment_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number
          execution_order: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          organization_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          execution_order?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          organization_id: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          execution_order?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          organization_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_bulk_import_lead_log: {
        Row: {
          applicant_id: string | null
          bulk_import_id: string
          created_at: string
          error_message: string | null
          form_mapping_id: string
          id: string
          meta_lead_id: string
          status: string
        }
        Insert: {
          applicant_id?: string | null
          bulk_import_id: string
          created_at?: string
          error_message?: string | null
          form_mapping_id: string
          id?: string
          meta_lead_id: string
          status: string
        }
        Update: {
          applicant_id?: string | null
          bulk_import_id?: string
          created_at?: string
          error_message?: string | null
          form_mapping_id?: string
          id?: string
          meta_lead_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_bulk_import_lead_log_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_bulk_import_lead_log_bulk_import_id_fkey"
            columns: ["bulk_import_id"]
            isOneToOne: false
            referencedRelation: "recruitment_bulk_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_bulk_imports: {
        Row: {
          approval_mode: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          form_mapping_ids: string[]
          id: string
          imported_pipeline_stage_id: string | null
          integration_id: string
          organization_id: string
          since_date: string
          started_at: string | null
          status: string
          total_leads_failed: number
          total_leads_found: number | null
          total_leads_imported: number
          total_leads_skipped_duplicate: number
          total_leads_skipped_unmapped: number
          until_date: string
          updated_at: string
        }
        Insert: {
          approval_mode?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          form_mapping_ids: string[]
          id?: string
          imported_pipeline_stage_id?: string | null
          integration_id: string
          organization_id: string
          since_date: string
          started_at?: string | null
          status?: string
          total_leads_failed?: number
          total_leads_found?: number | null
          total_leads_imported?: number
          total_leads_skipped_duplicate?: number
          total_leads_skipped_unmapped?: number
          until_date: string
          updated_at?: string
        }
        Update: {
          approval_mode?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          form_mapping_ids?: string[]
          id?: string
          imported_pipeline_stage_id?: string | null
          integration_id?: string
          organization_id?: string
          since_date?: string
          started_at?: string | null
          status?: string
          total_leads_failed?: number
          total_leads_found?: number | null
          total_leads_imported?: number
          total_leads_skipped_duplicate?: number
          total_leads_skipped_unmapped?: number
          until_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_bulk_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_bulk_imports_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "recruitment_meta_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_bulk_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_custom_field_types: {
        Row: {
          created_at: string
          display_name_en: string
          display_name_no: string
          id: string
          supports_options: boolean
          type_key: string
          ui_component: string
          updated_at: string
          validation_schema: Json
        }
        Insert: {
          created_at?: string
          display_name_en: string
          display_name_no: string
          id?: string
          supports_options?: boolean
          type_key: string
          ui_component: string
          updated_at?: string
          validation_schema?: Json
        }
        Update: {
          created_at?: string
          display_name_en?: string
          display_name_no?: string
          id?: string
          supports_options?: boolean
          type_key?: string
          ui_component?: string
          updated_at?: string
          validation_schema?: Json
        }
        Relationships: []
      }
      recruitment_custom_fields: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          display_order: number
          field_key: string
          id: string
          is_required: boolean
          options: Json | null
          organization_id: string
          show_on_card: boolean
          show_on_profile: boolean
          type_id: string
          updated_at: string
          validation_overrides: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          display_order?: number
          field_key: string
          id?: string
          is_required?: boolean
          options?: Json | null
          organization_id: string
          show_on_card?: boolean
          show_on_profile?: boolean
          type_id: string
          updated_at?: string
          validation_overrides?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          field_key?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          organization_id?: string
          show_on_card?: boolean
          show_on_profile?: boolean
          type_id?: string
          updated_at?: string
          validation_overrides?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_custom_fields_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_custom_fields_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "recruitment_custom_field_types"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_email_templates: {
        Row: {
          body: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          soft_deleted_at: string | null
          stage_trigger: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          soft_deleted_at?: string | null
          stage_trigger?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          soft_deleted_at?: string | null
          stage_trigger?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_field_mapping_template_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          meta_question_pattern: string
          target_custom_field_key: string | null
          target_custom_field_type_key: string | null
          target_kind: string
          target_standard_field: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          meta_question_pattern: string
          target_custom_field_key?: string | null
          target_custom_field_type_key?: string | null
          target_kind: string
          target_standard_field?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          meta_question_pattern?: string
          target_custom_field_key?: string | null
          target_custom_field_type_key?: string | null
          target_kind?: string
          target_standard_field?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_field_mapping_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recruitment_field_mapping_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_field_mapping_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          target_role_hint: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          target_role_hint?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          target_role_hint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_field_mapping_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_field_mapping_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_followups: {
        Row: {
          applicant_id: string
          application_id: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          id: string
          note: string | null
          organization_id: string
          scheduled_for: string
          snoozed_to: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          organization_id: string
          scheduled_for: string
          snoozed_to?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          organization_id?: string
          scheduled_for?: string
          snoozed_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_followups_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_followups_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_followups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_followups_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_followups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_followups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_form_field_mappings: {
        Row: {
          created_at: string
          display_order: number
          form_mapping_id: string
          id: string
          meta_question_id: string
          meta_question_key: string | null
          meta_question_text: string
          target_custom_field_id: string | null
          target_kind: string
          target_standard_field: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          form_mapping_id: string
          id?: string
          meta_question_id: string
          meta_question_key?: string | null
          meta_question_text: string
          target_custom_field_id?: string | null
          target_kind: string
          target_standard_field?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          form_mapping_id?: string
          id?: string
          meta_question_id?: string
          meta_question_key?: string | null
          meta_question_text?: string
          target_custom_field_id?: string | null
          target_kind?: string
          target_standard_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_form_field_mappings_form_mapping_id_fkey"
            columns: ["form_mapping_id"]
            isOneToOne: false
            referencedRelation: "recruitment_meta_form_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_form_field_mappings_target_custom_field_id_fkey"
            columns: ["target_custom_field_id"]
            isOneToOne: false
            referencedRelation: "recruitment_custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_lead_ingestion_log: {
        Row: {
          applicant_id: string | null
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          integration_id: string | null
          organization_id: string
          raw_payload: Json | null
          source: string
          status: string
        }
        Insert: {
          applicant_id?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string | null
          organization_id: string
          raw_payload?: Json | null
          source: string
          status: string
        }
        Update: {
          applicant_id?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string | null
          organization_id?: string
          raw_payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_lead_ingestion_log_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_lead_ingestion_log_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "recruitment_meta_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_lead_ingestion_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_meta_data_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          created_at: string
          details: Json | null
          id: string
          oauth_user_id: string
          organization_id: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_code: string
          created_at?: string
          details?: Json | null
          id?: string
          oauth_user_id: string
          organization_id?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string
          details?: Json | null
          id?: string
          oauth_user_id?: string
          organization_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_meta_data_deletion_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_meta_form_mappings: {
        Row: {
          created_at: string
          form_id: string
          form_name: string | null
          id: string
          integration_id: string
          is_active: boolean
          organization_id: string
          position_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          form_name?: string | null
          id?: string
          integration_id: string
          is_active?: boolean
          organization_id: string
          position_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          form_name?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean
          organization_id?: string
          position_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_meta_form_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "recruitment_meta_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_meta_form_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_meta_form_mappings_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_meta_integrations: {
        Row: {
          connected_via: string
          created_at: string
          created_by: string | null
          deauthorized_at: string | null
          id: string
          last_event_at: string | null
          last_health_check_at: string | null
          last_health_check_result: Json | null
          oauth_user_id: string | null
          oauth_user_name: string | null
          organization_id: string
          page_access_token: string | null
          page_id: string
          page_name: string
          status: string
          status_message: string | null
          token_expires_at: string | null
          updated_at: string
          user_access_token: string | null
          user_token_expires_at: string | null
          verify_token: string
        }
        Insert: {
          connected_via?: string
          created_at?: string
          created_by?: string | null
          deauthorized_at?: string | null
          id?: string
          last_event_at?: string | null
          last_health_check_at?: string | null
          last_health_check_result?: Json | null
          oauth_user_id?: string | null
          oauth_user_name?: string | null
          organization_id: string
          page_access_token?: string | null
          page_id: string
          page_name: string
          status?: string
          status_message?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_access_token?: string | null
          user_token_expires_at?: string | null
          verify_token: string
        }
        Update: {
          connected_via?: string
          created_at?: string
          created_by?: string | null
          deauthorized_at?: string | null
          id?: string
          last_event_at?: string | null
          last_health_check_at?: string | null
          last_health_check_result?: Json | null
          oauth_user_id?: string | null
          oauth_user_name?: string | null
          organization_id?: string
          page_access_token?: string | null
          page_id?: string
          page_name?: string
          status?: string
          status_message?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_access_token?: string | null
          user_token_expires_at?: string | null
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_meta_integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_meta_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_meta_oauth_states: {
        Row: {
          consumed_at: string | null
          created_at: string
          existing_integration_id: string | null
          expires_at: string
          id: string
          long_lived_user_token: string | null
          mode: string
          nonce: string
          oauth_user_id: string | null
          oauth_user_name: string | null
          organization_id: string
          origin: string
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          existing_integration_id?: string | null
          expires_at: string
          id?: string
          long_lived_user_token?: string | null
          mode?: string
          nonce: string
          oauth_user_id?: string | null
          oauth_user_name?: string | null
          organization_id: string
          origin: string
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          existing_integration_id?: string | null
          expires_at?: string
          id?: string
          long_lived_user_token?: string | null
          mode?: string
          nonce?: string
          oauth_user_id?: string | null
          oauth_user_name?: string | null
          organization_id?: string
          origin?: string
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_meta_oauth_states_existing_integration_id_fkey"
            columns: ["existing_integration_id"]
            isOneToOne: false
            referencedRelation: "recruitment_meta_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_meta_oauth_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          stages: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          stages: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_settings: {
        Row: {
          auto_delete_on_retention: boolean
          created_at: string
          default_applicant_source: string
          default_pipeline_id: string | null
          default_retention_months: number
          id: string
          organization_id: string
          reply_to_email: string | null
          require_gdpr_consent: boolean
          sender_email: string | null
          sender_name: string | null
          sms_from_number: string | null
          updated_at: string
        }
        Insert: {
          auto_delete_on_retention?: boolean
          created_at?: string
          default_applicant_source?: string
          default_pipeline_id?: string | null
          default_retention_months?: number
          id?: string
          organization_id: string
          reply_to_email?: string | null
          require_gdpr_consent?: boolean
          sender_email?: string | null
          sender_name?: string | null
          sms_from_number?: string | null
          updated_at?: string
        }
        Update: {
          auto_delete_on_retention?: boolean
          created_at?: string
          default_applicant_source?: string
          default_pipeline_id?: string | null
          default_retention_months?: number
          id?: string
          organization_id?: string
          reply_to_email?: string | null
          require_gdpr_consent?: boolean
          sender_email?: string | null
          sender_name?: string | null
          sms_from_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_settings_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "recruitment_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_settings_audit: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_settings_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_settings_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      response_outcomes: {
        Row: {
          conversation_id: string
          conversation_resolved: boolean | null
          created_at: string
          customer_replied: boolean | null
          customer_satisfaction_score: number | null
          id: string
          organization_id: string
          outcome_score: number | null
          reply_time_seconds: number | null
          required_followup: boolean | null
          response_tracking_id: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          conversation_resolved?: boolean | null
          created_at?: string
          customer_replied?: boolean | null
          customer_satisfaction_score?: number | null
          id?: string
          organization_id: string
          outcome_score?: number | null
          reply_time_seconds?: number | null
          required_followup?: boolean | null
          response_tracking_id: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          conversation_resolved?: boolean | null
          created_at?: string
          customer_replied?: boolean | null
          customer_satisfaction_score?: number | null
          id?: string
          organization_id?: string
          outcome_score?: number | null
          reply_time_seconds?: number | null
          required_followup?: boolean | null
          response_tracking_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_outcomes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_outcomes_response_tracking_id_fkey"
            columns: ["response_tracking_id"]
            isOneToOne: false
            referencedRelation: "response_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      response_templates: {
        Row: {
          content: string
          created_at: string
          created_by_id: string
          department_id: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          title: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by_id: string
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          title: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by_id?: string
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          title?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "response_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      response_tracking: {
        Row: {
          agent_id: string
          agent_response: string
          ai_suggestion_id: string | null
          conversation_id: string
          created_at: string
          customer_message: string | null
          feedback_comment: string | null
          feedback_rating: number | null
          feedback_submitted_at: string | null
          id: string
          knowledge_entry_id: string | null
          message_id: string
          organization_id: string
          original_ai_suggestion: string | null
          refinement_instructions: string | null
          response_source: string
          was_refined: boolean | null
        }
        Insert: {
          agent_id: string
          agent_response: string
          ai_suggestion_id?: string | null
          conversation_id: string
          created_at?: string
          customer_message?: string | null
          feedback_comment?: string | null
          feedback_rating?: number | null
          feedback_submitted_at?: string | null
          id?: string
          knowledge_entry_id?: string | null
          message_id: string
          organization_id: string
          original_ai_suggestion?: string | null
          refinement_instructions?: string | null
          response_source: string
          was_refined?: boolean | null
        }
        Update: {
          agent_id?: string
          agent_response?: string
          ai_suggestion_id?: string | null
          conversation_id?: string
          created_at?: string
          customer_message?: string | null
          feedback_comment?: string | null
          feedback_rating?: number | null
          feedback_submitted_at?: string | null
          id?: string
          knowledge_entry_id?: string | null
          message_id?: string
          organization_id?: string
          original_ai_suggestion?: string | null
          refinement_instructions?: string | null
          response_source?: string
          was_refined?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "response_tracking_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_tracking_knowledge_entry_id_fkey"
            columns: ["knowledge_entry_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_tracking_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          conversation_id: string
          created_at: string | null
          details: string | null
          id: string
          organization_id: string
          priority: number | null
          reason: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          details?: string | null
          id?: string
          organization_id: string
          priority?: number | null
          reason: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          details?: string | null
          id?: string
          organization_id?: string
          priority?: number | null
          reason?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "widget_ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      service_ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          ticket_id: string
          uploaded_by_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          ticket_id: string
          uploaded_by_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          ticket_id?: string
          uploaded_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ticket_comments: {
        Row: {
          content: string
          created_at: string
          created_by_id: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_id?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_id?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_comments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ticket_events: {
        Row: {
          comment: string | null
          created_at: string
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          triggered_by_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          triggered_by_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          triggered_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_events_triggered_by_id_fkey"
            columns: ["triggered_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tickets: {
        Row: {
          actual_cost: number | null
          assigned_to_id: string | null
          call_id: string | null
          category: Database["public"]["Enums"]["service_ticket_category"]
          completed_date: string | null
          conversation_id: string | null
          created_at: string
          created_by_id: string | null
          custom_fields: Json | null
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          department_id: string | null
          description: string | null
          estimated_cost: number | null
          first_response_at: string | null
          id: string
          metadata: Json | null
          noddi_booking_id: number | null
          noddi_user_group_id: number | null
          noddi_user_id: number | null
          organization_id: string
          priority: Database["public"]["Enums"]["service_ticket_priority"]
          resolution_time_minutes: number | null
          scheduled_date: string | null
          service_location: string | null
          service_type: string | null
          sla_due_date: string | null
          status: Database["public"]["Enums"]["service_ticket_status"]
          tags: string[] | null
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to_id?: string | null
          call_id?: string | null
          category?: Database["public"]["Enums"]["service_ticket_category"]
          completed_date?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by_id?: string | null
          custom_fields?: Json | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          department_id?: string | null
          description?: string | null
          estimated_cost?: number | null
          first_response_at?: string | null
          id?: string
          metadata?: Json | null
          noddi_booking_id?: number | null
          noddi_user_group_id?: number | null
          noddi_user_id?: number | null
          organization_id: string
          priority?: Database["public"]["Enums"]["service_ticket_priority"]
          resolution_time_minutes?: number | null
          scheduled_date?: string | null
          service_location?: string | null
          service_type?: string | null
          sla_due_date?: string | null
          status?: Database["public"]["Enums"]["service_ticket_status"]
          tags?: string[] | null
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to_id?: string | null
          call_id?: string | null
          category?: Database["public"]["Enums"]["service_ticket_category"]
          completed_date?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by_id?: string | null
          custom_fields?: Json | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          department_id?: string | null
          description?: string | null
          estimated_cost?: number | null
          first_response_at?: string | null
          id?: string
          metadata?: Json | null
          noddi_booking_id?: number | null
          noddi_user_group_id?: number | null
          noddi_user_id?: number | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["service_ticket_priority"]
          resolution_time_minutes?: number | null
          scheduled_date?: string | null
          service_location?: string | null
          service_type?: string | null
          sla_due_date?: string | null
          status?: Database["public"]["Enums"]["service_ticket_status"]
          tags?: string[] | null
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tickets_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_integrations: {
        Row: {
          access_token: string | null
          bot_user_id: string | null
          client_id: string | null
          client_secret: string | null
          configuration: Json | null
          created_at: string | null
          critical_ai_severity_thresholds: Json
          critical_category_routing: Json
          critical_channel_id: string | null
          critical_channel_name: string | null
          critical_keyword_overrides: Json
          critical_ops_mention_mode: string | null
          critical_ops_subteam_handle: string | null
          critical_ops_subteam_id: string | null
          critical_ops_user_id: string | null
          critical_tech_mention_mode: string | null
          critical_tech_subteam_handle: string | null
          critical_tech_subteam_id: string | null
          critical_tech_user_id: string | null
          default_channel_id: string | null
          default_channel_name: string | null
          digest_channel_id: string | null
          digest_channel_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          secondary_access_token: string | null
          secondary_team_id: string | null
          secondary_team_name: string | null
          setup_completed: boolean | null
          team_id: string | null
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          bot_user_id?: string | null
          client_id?: string | null
          client_secret?: string | null
          configuration?: Json | null
          created_at?: string | null
          critical_ai_severity_thresholds?: Json
          critical_category_routing?: Json
          critical_channel_id?: string | null
          critical_channel_name?: string | null
          critical_keyword_overrides?: Json
          critical_ops_mention_mode?: string | null
          critical_ops_subteam_handle?: string | null
          critical_ops_subteam_id?: string | null
          critical_ops_user_id?: string | null
          critical_tech_mention_mode?: string | null
          critical_tech_subteam_handle?: string | null
          critical_tech_subteam_id?: string | null
          critical_tech_user_id?: string | null
          default_channel_id?: string | null
          default_channel_name?: string | null
          digest_channel_id?: string | null
          digest_channel_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          secondary_access_token?: string | null
          secondary_team_id?: string | null
          secondary_team_name?: string | null
          setup_completed?: boolean | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          bot_user_id?: string | null
          client_id?: string | null
          client_secret?: string | null
          configuration?: Json | null
          created_at?: string | null
          critical_ai_severity_thresholds?: Json
          critical_category_routing?: Json
          critical_channel_id?: string | null
          critical_channel_name?: string | null
          critical_keyword_overrides?: Json
          critical_ops_mention_mode?: string | null
          critical_ops_subteam_handle?: string | null
          critical_ops_subteam_id?: string | null
          critical_ops_user_id?: string | null
          critical_tech_mention_mode?: string | null
          critical_tech_subteam_handle?: string | null
          critical_tech_subteam_id?: string | null
          critical_tech_user_id?: string | null
          default_channel_id?: string | null
          default_channel_name?: string | null
          digest_channel_id?: string | null
          digest_channel_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          secondary_access_token?: string | null
          secondary_team_id?: string | null
          secondary_team_name?: string | null
          setup_completed?: boolean | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_email_templates: {
        Row: {
          created_at: string
          created_by_id: string | null
          html_content: string
          id: string
          is_active: boolean
          subject: string
          template_type: string
          text_content: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          subject: string
          template_type: string
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          subject?: string
          template_type?: string
          text_content?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_events_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_source: string
          event_type: string
          id: string
          organization_id: string
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_source: string
          event_type: string
          id?: string
          organization_id: string
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_source?: string
          event_type?: string
          id?: string
          organization_id?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_autonomy_levels: {
        Row: {
          acceptance_rate: number | null
          avg_confidence: number | null
          avg_eval_score: number | null
          created_at: string | null
          current_level: number | null
          id: string
          intent_category: string
          last_evaluated_at: string | null
          last_negative_feedback_at: string | null
          organization_id: string
          override_max_level: number | null
          total_responses: number | null
          updated_at: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          avg_confidence?: number | null
          avg_eval_score?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          intent_category: string
          last_evaluated_at?: string | null
          last_negative_feedback_at?: string | null
          organization_id: string
          override_max_level?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          avg_confidence?: number | null
          avg_eval_score?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          intent_category?: string
          last_evaluated_at?: string | null
          last_negative_feedback_at?: string | null
          organization_id?: string
          override_max_level?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_autonomy_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          context: string | null
          created_at: string
          id: string
          organization_id: string
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          organization_id: string
          source_language?: string
          source_text: string
          target_language: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          source_language?: string
          source_text?: string
          target_language?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      triage_pattern_proposals: {
        Row: {
          category: string | null
          created_at: string
          evidence_conversation_ids: string[]
          evidence_count: number
          id: string
          organization_id: string
          proposal_type: string
          reason: string
          reviewed_at: string | null
          reviewed_by_id: string | null
          status: string
          threshold_value: number | null
          value: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          evidence_conversation_ids?: string[]
          evidence_count?: number
          id?: string
          organization_id: string
          proposal_type: string
          reason: string
          reviewed_at?: string | null
          reviewed_by_id?: string | null
          status?: string
          threshold_value?: number | null
          value: string
        }
        Update: {
          category?: string | null
          created_at?: string
          evidence_conversation_ids?: string[]
          evidence_count?: number
          id?: string
          organization_id?: string
          proposal_type?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by_id?: string | null
          status?: string
          threshold_value?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_pattern_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_pattern_proposals_reviewed_by_id_fkey"
            columns: ["reviewed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_events: {
        Row: {
          created_at: string
          email: string
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          organization_id: string | null
          page_path: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          organization_id?: string | null
          page_path?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          organization_id?: string | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          email: string
          end_reason: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_active_at: string
          organization_id: string | null
          session_type: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          email: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_active_at?: string
          organization_id?: string | null
          session_type?: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          email?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_active_at?: string
          organization_id?: string | null
          session_type?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_integrations: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          provider: string
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          provider: string
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          provider?: string
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_event_mappings: {
        Row: {
          condition_rules: Json | null
          created_at: string | null
          data_mapping: Json | null
          external_event: string
          id: string
          internal_event_type: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          condition_rules?: Json | null
          created_at?: string | null
          data_mapping?: Json | null
          external_event: string
          id?: string
          internal_event_type: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          condition_rules?: Json | null
          created_at?: string | null
          data_mapping?: Json | null
          external_event?: string
          id?: string
          internal_event_type?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_event_mappings_internal_event_type_fkey"
            columns: ["internal_event_type"]
            isOneToOne: false
            referencedRelation: "internal_event_types"
            referencedColumns: ["name"]
          },
        ]
      }
      webhook_retry_queue: {
        Row: {
          attempt_count: number | null
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string
          organization_id: string
          payload: Json
          status: string
          target_url: string | null
          updated_at: string
          webhook_type: string
        }
        Insert: {
          attempt_count?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string
          organization_id: string
          payload: Json
          status?: string
          target_url?: string | null
          updated_at?: string
          webhook_type: string
        }
        Update: {
          attempt_count?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string
          organization_id?: string
          payload?: Json
          status?: string
          target_url?: string | null
          updated_at?: string
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_retry_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_ai_conversations: {
        Row: {
          created_at: string
          ended_at: string | null
          error_details: string | null
          escalated_at: string | null
          id: string
          memories_extracted_at: string | null
          message_count: number
          metadata: Json | null
          organization_id: string
          phone_verified: boolean | null
          primary_intent: string | null
          resolved_by: string | null
          resolved_by_ai: boolean | null
          status: string
          summary: string | null
          tools_used: string[] | null
          updated_at: string
          visitor_email: string | null
          visitor_id: string | null
          visitor_phone: string | null
          widget_config_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          error_details?: string | null
          escalated_at?: string | null
          id?: string
          memories_extracted_at?: string | null
          message_count?: number
          metadata?: Json | null
          organization_id: string
          phone_verified?: boolean | null
          primary_intent?: string | null
          resolved_by?: string | null
          resolved_by_ai?: boolean | null
          status?: string
          summary?: string | null
          tools_used?: string[] | null
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_phone?: string | null
          widget_config_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          error_details?: string | null
          escalated_at?: string | null
          id?: string
          memories_extracted_at?: string | null
          message_count?: number
          metadata?: Json | null
          organization_id?: string
          phone_verified?: boolean | null
          primary_intent?: string | null
          resolved_by?: string | null
          resolved_by_ai?: boolean | null
          status?: string
          summary?: string | null
          tools_used?: string[] | null
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_phone?: string | null
          widget_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_ai_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_ai_conversations_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_ai_feedback: {
        Row: {
          conversation_id: string
          created_at: string
          feedback_text: string | null
          id: string
          message_id: string
          organization_id: string
          rating: string
          source: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id: string
          organization_id: string
          rating: string
          source?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id?: string
          organization_id?: string
          rating?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_ai_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "widget_ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_ai_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "widget_ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_ai_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_ai_messages: {
        Row: {
          confidence_breakdown: Json | null
          confidence_score: number | null
          content: string
          conversation_id: string
          created_at: string
          feedback_rating: string | null
          id: string
          intent_detected: string | null
          quality_check_passed: boolean | null
          quality_flag: string | null
          role: string
          tools_used: string[] | null
        }
        Insert: {
          confidence_breakdown?: Json | null
          confidence_score?: number | null
          content: string
          conversation_id: string
          created_at?: string
          feedback_rating?: string | null
          id?: string
          intent_detected?: string | null
          quality_check_passed?: boolean | null
          quality_flag?: string | null
          role: string
          tools_used?: string[] | null
        }
        Update: {
          confidence_breakdown?: Json | null
          confidence_score?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          feedback_rating?: string | null
          id?: string
          intent_detected?: string | null
          quality_check_passed?: boolean | null
          quality_flag?: string | null
          role?: string
          tools_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "widget_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_block_configs: {
        Row: {
          api_endpoints: Json
          closing_marker: string | null
          created_at: string
          created_by_id: string | null
          description: string | null
          field_type: string | null
          icon: string
          id: string
          label: string
          marker: string
          organization_id: string
          requires_api: boolean
          type_key: string
          ui_component: string | null
          updated_at: string
        }
        Insert: {
          api_endpoints?: Json
          closing_marker?: string | null
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          field_type?: string | null
          icon?: string
          id?: string
          label: string
          marker: string
          organization_id: string
          requires_api?: boolean
          type_key: string
          ui_component?: string | null
          updated_at?: string
        }
        Update: {
          api_endpoints?: Json
          closing_marker?: string | null
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          field_type?: string | null
          icon?: string
          id?: string
          label?: string
          marker?: string
          organization_id?: string
          requires_api?: boolean
          type_key?: string
          ui_component?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_block_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_chat_sessions: {
        Row: {
          assigned_agent_id: string | null
          conversation_id: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          last_message_at: string | null
          last_seen_at: string | null
          metadata: Json | null
          started_at: string | null
          status: string
          updated_at: string | null
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          widget_config_id: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          visitor_email?: string | null
          visitor_id: string
          visitor_name?: string | null
          widget_config_id?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          visitor_email?: string | null
          visitor_id?: string
          visitor_name?: string | null
          widget_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_chat_sessions_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_chat_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_chat_sessions_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_configs: {
        Row: {
          ai_flow_config: Json | null
          ai_general_config: Json | null
          auto_send_transcript: boolean | null
          company_name: string | null
          created_at: string | null
          dismissal_message_text: string | null
          dismissal_message_translations: Json | null
          enable_chat: boolean | null
          enable_contact_form: boolean | null
          enable_knowledge_search: boolean | null
          greeting_text: string | null
          greeting_translations: Json | null
          id: string
          inbox_id: string | null
          is_active: boolean | null
          language: string | null
          logo_url: string | null
          organization_id: string
          position: string | null
          primary_color: string | null
          response_time_text: string | null
          response_time_translations: Json | null
          updated_at: string | null
          widget_key: string
        }
        Insert: {
          ai_flow_config?: Json | null
          ai_general_config?: Json | null
          auto_send_transcript?: boolean | null
          company_name?: string | null
          created_at?: string | null
          dismissal_message_text?: string | null
          dismissal_message_translations?: Json | null
          enable_chat?: boolean | null
          enable_contact_form?: boolean | null
          enable_knowledge_search?: boolean | null
          greeting_text?: string | null
          greeting_translations?: Json | null
          id?: string
          inbox_id?: string | null
          is_active?: boolean | null
          language?: string | null
          logo_url?: string | null
          organization_id: string
          position?: string | null
          primary_color?: string | null
          response_time_text?: string | null
          response_time_translations?: Json | null
          updated_at?: string | null
          widget_key?: string
        }
        Update: {
          ai_flow_config?: Json | null
          ai_general_config?: Json | null
          auto_send_transcript?: boolean | null
          company_name?: string | null
          created_at?: string | null
          dismissal_message_text?: string | null
          dismissal_message_translations?: Json | null
          enable_chat?: boolean | null
          enable_contact_form?: boolean | null
          enable_knowledge_search?: boolean | null
          greeting_text?: string | null
          greeting_translations?: Json | null
          id?: string
          inbox_id?: string | null
          is_active?: boolean | null
          language?: string | null
          logo_url?: string | null
          organization_id?: string
          position?: string | null
          primary_color?: string | null
          response_time_text?: string | null
          response_time_translations?: Json | null
          updated_at?: string | null
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_configs_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: true
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_sessions: {
        Row: {
          browser_info: Json | null
          conversation_id: string | null
          created_at: string | null
          id: string
          page_url: string | null
          updated_at: string | null
          visitor_email: string | null
          visitor_id: string | null
          visitor_name: string | null
          widget_config_id: string | null
        }
        Insert: {
          browser_info?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          page_url?: string | null
          updated_at?: string | null
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_name?: string | null
          widget_config_id?: string | null
        }
        Update: {
          browser_info?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          page_url?: string | null
          updated_at?: string | null
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_name?: string | null
          widget_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_sessions_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_execution: {
        Args: { p_execution_id: string }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_results: Json | null
          applicant_id: string | null
          application_id: string | null
          created_at: string
          duration_ms: number | null
          id: string
          is_dry_run: boolean
          organization_id: string
          overall_status: string
          rule_id: string | null
          rule_name: string
          skip_reason: string | null
          trigger_context: Json
          triggered_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "recruitment_automation_executions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auto_abandon_inactive_chat_sessions: {
        Args: never
        Returns: {
          abandoned_count: number
        }[]
      }
      auto_close_inactive_conversations: {
        Args: never
        Returns: {
          closed_count: number
        }[]
      }
      calculate_sla_breach: { Args: never; Returns: undefined }
      claim_queue_row: { Args: { p_queue_id: string }; Returns: Json }
      cleanup_expired_audit_events: { Args: never; Returns: number }
      cleanup_old_email_ingestion_logs: { Args: never; Returns: undefined }
      count_old_audit_logs:
        | { Args: { days_old?: number }; Returns: number }
        | { Args: { p_age?: string }; Returns: number }
      create_test_notification: { Args: never; Returns: undefined }
      current_profile_id: { Args: never; Returns: string }
      delete_email_account: { Args: { account_id: string }; Returns: undefined }
      detect_suspicious_audit_activity:
        | {
            Args: { p_threshold?: number; p_time_window?: string }
            Returns: {
              action_count: number
              actor_email: string
              actor_id: string
              first_action: string
              last_action: string
            }[]
          }
        | {
            Args: { action_threshold?: number; time_window_minutes?: number }
            Returns: {
              action_count: number
              actor_email: string
              actor_id: string
              first_action: string
              last_action: string
            }[]
          }
      dispatch_action: {
        Args: {
          p_action_config: Json
          p_action_type: string
          p_actor_profile_id: string
          p_dry_run: boolean
          p_trigger_context: Json
        }
        Returns: Json
      }
      execute_automation_rules: {
        Args: {
          p_dry_run?: boolean
          p_only_rule_ids?: string[]
          p_skip_external?: boolean
          p_skip_reason?: string
          p_trigger_context: Json
          p_trigger_type: string
        }
        Returns: {
          action_results: Json
          duration_ms: number
          execution_id: string
          overall_status: string
          rule_id: string
          rule_name: string
        }[]
      }
      extract_email_date: { Args: { email_headers: Json }; Returns: string }
      finalize_queue_row: {
        Args: {
          p_action_results: Json
          p_duration_ms: number
          p_execution_id: string
          p_final_status: string
          p_queue_id: string
        }
        Returns: Json
      }
      find_large_conversations: {
        Args: { message_threshold?: number }
        Returns: {
          conversation_id: string
          created_at: string
          inbox_name: string
          message_count: number
          subject: string
        }[]
      }
      find_similar_memory: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          target_identifier: string
          target_org_id: string
        }
        Returns: {
          confidence: number
          id: string
          similarity: number
        }[]
      }
      find_similar_responses: {
        Args: {
          match_count?: number
          match_threshold?: number
          org_id: string
          query_embedding: string
        }
        Returns: {
          agent_response: string
          customer_context: string
          id: string
          quality_score: number
          usage_count: number
          was_refined: boolean
        }[]
      }
      generate_ticket_number: { Args: { org_id: string }; Returns: string }
      get_all_counts: {
        Args: never
        Returns: {
          channels_email: number
          channels_facebook: number
          channels_instagram: number
          channels_whatsapp: number
          conversations_all: number
          conversations_archived: number
          conversations_assigned: number
          conversations_closed: number
          conversations_deleted: number
          conversations_open: number
          conversations_pending: number
          conversations_unread: number
          inboxes_data: Json
          notifications_unread: number
        }[]
      }
      get_conversations: {
        Args: {
          p_inbox_id?: string
          p_page?: number
          p_page_size?: number
          p_search_query?: string
          p_status_filter?: string
        }
        Returns: {
          assigned_to_id: string
          assigned_to_name: string
          channel: string
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          first_response_at: string
          id: string
          inbox_id: string
          inbox_name: string
          is_archived: boolean
          is_read: boolean
          preview_text: string
          priority: string
          received_at: string
          sla_breach_at: string
          status: string
          subject: string
          updated_at: string
        }[]
      }
      get_conversations_monitored: {
        Args: {
          inbox_filter?: string
          page_limit?: number
          page_offset?: number
          status_filter?: string
        }
        Returns: {
          assigned_to: Json
          channel: string
          customer: Json
          email_account: Json
          first_response_at: string
          id: string
          inbox_id: string
          is_archived: boolean
          is_read: boolean
          preview_text: string
          priority: string
          received_at: string
          sla_breach_at: string
          sla_status: string
          snooze_until: string
          status: string
          subject: string
          total_count: number
          updated_at: string
        }[]
      }
      get_conversations_with_session_recovery:
        | {
            Args: { inbox_uuid?: string }
            Returns: {
              assigned_to: Json
              channel: string
              customer: Json
              id: string
              inbox_id: string
              is_archived: boolean
              is_read: boolean
              organization_id: string
              priority: string
              received_at: string
              session_uid: string
              snooze_until: string
              status: string
              subject: string
              updated_at: string
            }[]
          }
        | {
            Args: { inbox_uuid?: string; include_deleted?: boolean }
            Returns: {
              assigned_to: Json
              channel: string
              customer: Json
              first_response_at: string
              id: string
              inbox_id: string
              is_archived: boolean
              is_deleted: boolean
              is_read: boolean
              last_message_is_internal: boolean
              last_message_sender_type: string
              metadata: Json
              organization_id: string
              preview_text: string
              priority: string
              received_at: string
              session_uid: string
              sla_breach_at: string
              snooze_until: string
              status: string
              subject: string
              updated_at: string
            }[]
          }
      get_critical_alert_count: {
        Args: { _organization_id: string; _since: string }
        Returns: number
      }
      get_email_accounts: {
        Args: never
        Returns: {
          auto_sync_enabled: boolean
          created_at: string
          email_address: string
          forwarding_address: string
          id: string
          inbox_id: string
          is_active: boolean
          last_sync_at: string
          provider: string
          sync_interval_minutes: number
        }[]
      }
      get_inbox_counts: {
        Args: { inbox_uuid: string }
        Returns: {
          channels_email: number
          channels_facebook: number
          channels_instagram: number
          channels_whatsapp: number
          conversations_all: number
          conversations_archived: number
          conversations_assigned: number
          conversations_closed: number
          conversations_deleted: number
          conversations_open: number
          conversations_pending: number
          conversations_unread: number
        }[]
      }
      get_inbox_for_email: {
        Args: { org_id: string; recipient_email: string }
        Returns: string
      }
      get_inboxes: {
        Args: never
        Returns: {
          auto_assignment_rules: Json
          color: string
          conversation_count: number
          created_at: string
          department_id: string
          description: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sender_display_name: string
          updated_at: string
        }[]
      }
      get_online_agent_count: { Args: { org_id: string }; Returns: number }
      get_organization_by_email_domain: {
        Args: { email_domain: string }
        Returns: string
      }
      get_sla_status: {
        Args: {
          conv_status: string
          first_response: string
          sla_breach: string
        }
        Returns: string
      }
      get_user_department_id: { Args: never; Returns: string }
      get_user_org_cache: {
        Args: never
        Returns: {
          dept_id: string
          org_id: string
        }[]
      }
      get_user_organization_from_profile: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_organization_memberships: {
        Args: never
        Returns: {
          is_default: boolean
          membership_id: string
          organization_id: string
          organization_name: string
          organization_slug: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      get_user_profile_id: { Args: never; Returns: string }
      get_user_profile_roles: {
        Args: { _user_id: string }
        Returns: {
          primary_role: Database["public"]["Enums"]["app_role"]
          role: string
        }[]
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search_knowledge: {
        Args: {
          match_count?: number
          org_id: string
          query_embedding: string
          query_text: string
        }
        Returns: {
          agent_response: string
          category: string
          customer_context: string
          final_score: number
          freshness_boost: number
          id: string
          quality_score: number
          similarity: number
        }[]
      }
      is_external_action_type: {
        Args: { p_action_type: string }
        Returns: boolean
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_organization_member: { Args: { _org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_conversations_optimized: {
        Args: {
          p_assigned_to_id?: string
          p_channel?: string
          p_inbox_id?: string
          p_is_archived?: boolean
          p_is_deleted?: boolean
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_priority?: string
          p_search_query?: string
          p_status?: string
        }
        Returns: {
          assigned_to_avatar: string
          assigned_to_id: string
          assigned_to_name: string
          channel: string
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          first_response_at: string
          id: string
          inbox_id: string
          is_archived: boolean
          is_read: boolean
          last_message_is_internal: boolean
          last_message_sender_type: string
          preview_text: string
          priority: string
          sla_breach_at: string
          snooze_until: string
          status: string
          subject: string
          total_count: number
          updated_at: string
        }[]
      }
      log_audit_export: {
        Args: { p_applicant_id: string; p_context: Json; p_event_type: string }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      match_automation_rules: {
        Args: { p_trigger_context: Json; p_trigger_type: string }
        Returns: {
          action_config: Json
          action_type: string
          execution_order: number
          is_external: boolean
          rule_id: string
          rule_name: string
        }[]
      }
      move_application_stage: {
        Args: {
          p_application_id: string
          p_note?: string
          p_notify_preference?: string
          p_to_stage_id: string
        }
        Returns: {
          applicant_id: string
          applied_at: string
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          current_stage_id: string
          entered_stage_at: string | null
          id: string
          organization_id: string
          position_id: string
          rejection_reason: string | null
          score: number | null
          score_breakdown: Json | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reap_stuck_queue_rows: { Args: never; Returns: number }
      reassign_applications_to_stage: {
        Args: {
          p_from_stage_id: string
          p_new_stages: Json
          p_pipeline_id: string
          p_to_stage_id: string
        }
        Returns: Json
      }
      recruitment_applicant_in_user_org: {
        Args: { _applicant_id: string }
        Returns: boolean
      }
      recruitment_bulk_import_in_user_org: {
        Args: { _bulk_import_id: string }
        Returns: boolean
      }
      recruitment_form_mapping_in_user_org: {
        Args: { _form_mapping_id: string }
        Returns: boolean
      }
      recruitment_template_accessible: {
        Args: { _template_id: string }
        Returns: boolean
      }
      recruitment_template_writable: {
        Args: { _template_id: string }
        Returns: boolean
      }
      relink_calls_to_customers: {
        Args: never
        Returns: {
          calls_linked: number
          calls_updated: number
          execution_time_ms: number
        }[]
      }
      render_email_template: {
        Args: { p_application_id: string; p_template_id: string }
        Returns: {
          rendered_html: string
          rendered_subject: string
        }[]
      }
      rule_matches_context: {
        Args: {
          p_trigger_config: Json
          p_trigger_context: Json
          p_trigger_type: string
        }
        Returns: boolean
      }
      sanitize_debug_data: { Args: { data: Json }; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      strip_html_tags: { Args: { input_text: string }; Returns: string }
      update_pipeline_stages: {
        Args: { p_new_stages: Json; p_pipeline_id: string }
        Returns: Json
      }
      user_has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      validate_session_context: {
        Args: never
        Returns: {
          auth_uid: string
          has_memberships: boolean
          organization_id: string
          profile_exists: boolean
          session_valid: boolean
        }[]
      }
    }
    Enums: {
      app_permission:
        | "manage_users"
        | "manage_departments"
        | "manage_inboxes"
        | "manage_settings"
        | "view_all_conversations"
        | "send_emails"
        | "receive_emails"
        | "view_all_organizations"
        | "manage_organizations"
        | "view_system_logs"
        | "manage_system_settings"
      app_role: "admin" | "user" | "super_admin" | "agent"
      call_direction: "inbound" | "outbound"
      call_event_type:
        | "call_started"
        | "call_answered"
        | "call_ended"
        | "call_missed"
        | "call_transferred"
        | "call_on_hold"
        | "call_resumed"
        | "voicemail_left"
        | "dtmf_pressed"
        | "callback_requested"
        | "agent_assigned"
      call_status:
        | "ringing"
        | "answered"
        | "missed"
        | "busy"
        | "failed"
        | "completed"
        | "transferred"
        | "on_hold"
        | "voicemail"
      communication_channel:
        | "email"
        | "facebook"
        | "instagram"
        | "whatsapp"
        | "other"
        | "widget"
      service_ticket_category:
        | "tire_issue"
        | "service_complaint"
        | "delivery_issue"
        | "installation_problem"
        | "warranty_claim"
        | "technical_support"
        | "other"
      service_ticket_priority: "low" | "normal" | "high" | "urgent"
      service_ticket_status:
        | "open"
        | "in_progress"
        | "pending_customer"
        | "pending_parts"
        | "completed"
        | "cancelled"
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
  public: {
    Enums: {
      app_permission: [
        "manage_users",
        "manage_departments",
        "manage_inboxes",
        "manage_settings",
        "view_all_conversations",
        "send_emails",
        "receive_emails",
        "view_all_organizations",
        "manage_organizations",
        "view_system_logs",
        "manage_system_settings",
      ],
      app_role: ["admin", "user", "super_admin", "agent"],
      call_direction: ["inbound", "outbound"],
      call_event_type: [
        "call_started",
        "call_answered",
        "call_ended",
        "call_missed",
        "call_transferred",
        "call_on_hold",
        "call_resumed",
        "voicemail_left",
        "dtmf_pressed",
        "callback_requested",
        "agent_assigned",
      ],
      call_status: [
        "ringing",
        "answered",
        "missed",
        "busy",
        "failed",
        "completed",
        "transferred",
        "on_hold",
        "voicemail",
      ],
      communication_channel: [
        "email",
        "facebook",
        "instagram",
        "whatsapp",
        "other",
        "widget",
      ],
      service_ticket_category: [
        "tire_issue",
        "service_complaint",
        "delivery_issue",
        "installation_problem",
        "warranty_claim",
        "technical_support",
        "other",
      ],
      service_ticket_priority: ["low", "normal", "high", "urgent"],
      service_ticket_status: [
        "open",
        "in_progress",
        "pending_customer",
        "pending_parts",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
