export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          assigned_to_id: string | null
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
          primary_role: Database["public"]["Enums"]["app_role"] | null
          role: string
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
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          role?: string
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
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          role?: string
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
      get_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          subject: string
          status: string
          priority: string
          is_read: boolean
          is_archived: boolean
          channel: string
          updated_at: string
          received_at: string
          inbox_id: string
          customer: Json
          assigned_to: Json
          snooze_until: string
        }[]
      }
      get_email_accounts: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email_address: string
          provider: string
          is_active: boolean
          last_sync_at: string
          created_at: string
          forwarding_address: string
          inbox_id: string
          auto_sync_enabled: boolean
          sync_interval_minutes: number
        }[]
      }
      get_inboxes: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
          department_id: string
          is_default: boolean
          auto_assignment_rules: Json
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
          conversation_count: number
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
          _user_id: string
          _permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
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
