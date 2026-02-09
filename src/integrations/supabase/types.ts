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
          include_agent_name?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          scope?: string
          signature_content?: string | null
          template_type?: string
          updated_at?: string
        }
        Relationships: []
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
          organization_id: string
          quality_score: number | null
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
          organization_id: string
          quality_score?: number | null
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
          organization_id?: string
          quality_score?: number | null
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
          agent_response: string
          ai_quality_score: number | null
          created_at: string
          customer_context: string
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
          agent_response: string
          ai_quality_score?: number | null
          created_at?: string
          customer_context: string
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
          agent_response?: string
          ai_quality_score?: number | null
          created_at?: string
          customer_context?: string
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
          sender_display_name?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
          default_channel_id: string | null
          default_channel_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string
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
          default_channel_id?: string | null
          default_channel_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
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
          default_channel_id?: string | null
          default_channel_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
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
      cleanup_old_email_ingestion_logs: { Args: never; Returns: undefined }
      count_old_audit_logs:
        | { Args: { days_old?: number }; Returns: number }
        | { Args: { p_age?: unknown }; Returns: number }
      create_test_notification: { Args: never; Returns: undefined }
      delete_email_account: { Args: { account_id: string }; Returns: undefined }
      detect_suspicious_audit_activity:
        | {
            Args: { p_threshold?: number; p_time_window?: unknown }
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
      extract_email_date: { Args: { email_headers: Json }; Returns: string }
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
      is_organization_member: { Args: { _org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      relink_calls_to_customers: {
        Args: never
        Returns: {
          calls_linked: number
          calls_updated: number
          execution_time_ms: number
        }[]
      }
      sanitize_debug_data: { Args: { data: Json }; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      strip_html_tags: { Args: { input_text: string }; Returns: string }
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
