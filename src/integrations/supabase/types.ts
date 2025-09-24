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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
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
          customer_phone: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          enriched_details: Json | null
          external_id: string
          hangup_cause: string | null
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
          customer_phone?: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          enriched_details?: Json | null
          external_id: string
          hangup_cause?: string | null
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
          customer_phone?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          enriched_details?: Json | null
          external_id?: string
          hangup_cause?: string | null
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
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to_id: string | null
          call_id: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          customer_id: string | null
          department_id: string | null
          email_account_id: string | null
          external_id: string | null
          id: string
          inbox_id: string | null
          is_archived: boolean | null
          is_read: boolean | null
          metadata: Json | null
          organization_id: string
          priority: string
          received_at: string | null
          snooze_until: string | null
          snoozed_by_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          call_id?: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          customer_id?: string | null
          department_id?: string | null
          email_account_id?: string | null
          external_id?: string | null
          id?: string
          inbox_id?: string | null
          is_archived?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          organization_id: string
          priority?: string
          received_at?: string | null
          snooze_until?: string | null
          snoozed_by_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          call_id?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          customer_id?: string | null
          department_id?: string | null
          email_account_id?: string | null
          external_id?: string | null
          id?: string
          inbox_id?: string | null
          is_archived?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          organization_id?: string
          priority?: string
          received_at?: string | null
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
        Relationships: []
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
          signature_content: string | null
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
          signature_content?: string | null
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
          signature_content?: string | null
          updated_at?: string
        }
        Relationships: []
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
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          primary_color: string | null
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
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string
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
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          organization_id: string
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
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_test_notification: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_email_account: {
        Args: { account_id: string }
        Returns: undefined
      }
      extract_email_date: {
        Args: { email_headers: Json }
        Returns: string
      }
      get_all_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          channels_email: number
          channels_facebook: number
          channels_instagram: number
          channels_whatsapp: number
          conversations_all: number
          conversations_archived: number
          conversations_assigned: number
          conversations_closed: number
          conversations_pending: number
          conversations_unread: number
          inboxes_data: Json
          notifications_unread: number
        }[]
      }
      get_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_to: Json
          channel: string
          customer: Json
          id: string
          inbox_id: string
          is_archived: boolean
          is_read: boolean
          priority: string
          received_at: string
          snooze_until: string
          status: string
          subject: string
          updated_at: string
        }[]
      }
      get_conversations_with_session_recovery: {
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
      get_email_accounts: {
        Args: Record<PropertyKey, never>
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
          conversations_pending: number
          conversations_unread: number
        }[]
      }
      get_inbox_for_email: {
        Args: { org_id: string; recipient_email: string }
        Returns: string
      }
      get_inboxes: {
        Args: Record<PropertyKey, never>
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
          updated_at: string
        }[]
      }
      get_organization_by_email_domain: {
        Args: { email_domain: string }
        Returns: string
      }
      get_user_department_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_org_cache: {
        Args: Record<PropertyKey, never>
        Returns: {
          dept_id: string
          org_id: string
        }[]
      }
      get_user_organization_from_profile: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      validate_session_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_uid: string
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
      app_role: "admin" | "user"
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
      ],
      app_role: ["admin", "user"],
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
      ],
    },
  },
} as const
