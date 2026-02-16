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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cameras: {
        Row: {
          assigned_operator_id: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          rtsp_url: string | null
          status: Database["public"]["Enums"]["camera_status"]
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          rtsp_url?: string | null
          status?: Database["public"]["Enums"]["camera_status"]
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          rtsp_url?: string | null
          status?: Database["public"]["Enums"]["camera_status"]
          updated_at?: string
        }
        Relationships: []
      }
      challan_payments: {
        Row: {
          amount: number
          challan_id: string
          created_at: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          id: string
          metadata: Json | null
          payer_email: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_gateway: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          challan_id: string
          created_at?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          metadata?: Json | null
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          challan_id?: string
          created_at?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          metadata?: Json | null
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challan_payments_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "challans"
            referencedColumns: ["id"]
          },
        ]
      }
      challans: {
        Row: {
          ai_detection_data: Json | null
          challan_number: string
          created_at: string
          description: string | null
          due_date: string | null
          evidence_urls: string[] | null
          fine_amount: number
          id: string
          image_url: string | null
          issued_at: string
          issued_by: string | null
          owner_address: string | null
          owner_name: string | null
          owner_phone: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          plate_number: string
          public_token: string
          resolved_at: string | null
          rto_office: string | null
          severity: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          state: string
          status: string
          updated_at: string
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_lookup_data: Json | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string | null
          video_url: string | null
          violation_id: string | null
          violation_label: string
          violation_type: string
        }
        Insert: {
          ai_detection_data?: Json | null
          challan_number: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_urls?: string[] | null
          fine_amount?: number
          id?: string
          image_url?: string | null
          issued_at?: string
          issued_by?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          plate_number: string
          public_token?: string
          resolved_at?: string | null
          rto_office?: string | null
          severity?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          state: string
          status?: string
          updated_at?: string
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_lookup_data?: Json | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          video_url?: string | null
          violation_id?: string | null
          violation_label: string
          violation_type: string
        }
        Update: {
          ai_detection_data?: Json | null
          challan_number?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_urls?: string[] | null
          fine_amount?: number
          id?: string
          image_url?: string | null
          issued_at?: string
          issued_by?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          plate_number?: string
          public_token?: string
          resolved_at?: string | null
          rto_office?: string | null
          severity?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          state?: string
          status?: string
          updated_at?: string
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_lookup_data?: Json | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          video_url?: string | null
          violation_id?: string | null
          violation_label?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "challans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challans_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violations"
            referencedColumns: ["id"]
          },
        ]
      }
      fines_master: {
        Row: {
          created_at: string
          description: string | null
          fine_amount: number
          id: string
          repeat_fine_amount: number | null
          section_reference: string | null
          state: string
          updated_at: string
          violation_label: string
          violation_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fine_amount?: number
          id?: string
          repeat_fine_amount?: number | null
          section_reference?: string | null
          state: string
          updated_at?: string
          violation_label: string
          violation_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fine_amount?: number
          id?: string
          repeat_fine_amount?: number | null
          section_reference?: string | null
          state?: string
          updated_at?: string
          violation_label?: string
          violation_type?: string
        }
        Relationships: []
      }
      gate_access_rules: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          end_time: string | null
          gate_id: string
          id: string
          is_enabled: boolean | null
          notes: string | null
          priority: number | null
          rule_type: Database["public"]["Enums"]["access_rule_type"]
          start_time: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          vehicle_group_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          end_time?: string | null
          gate_id: string
          id?: string
          is_enabled?: boolean | null
          notes?: string | null
          priority?: number | null
          rule_type: Database["public"]["Enums"]["access_rule_type"]
          start_time?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          vehicle_group_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          end_time?: string | null
          gate_id?: string
          id?: string
          is_enabled?: boolean | null
          notes?: string | null
          priority?: number | null
          rule_type?: Database["public"]["Enums"]["access_rule_type"]
          start_time?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          vehicle_group_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_access_rules_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_access_rules_vehicle_group_id_fkey"
            columns: ["vehicle_group_id"]
            isOneToOne: false
            referencedRelation: "vehicle_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_access_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_entry_logs: {
        Row: {
          action: Database["public"]["Enums"]["gate_action"]
          created_at: string
          gate_id: string
          id: string
          image_url: string | null
          logged_at: string
          plate_number: string
          rule_applied: string | null
          vehicle_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["gate_action"]
          created_at?: string
          gate_id: string
          id?: string
          image_url?: string | null
          logged_at?: string
          plate_number: string
          rule_applied?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["gate_action"]
          created_at?: string
          gate_id?: string
          id?: string
          image_url?: string | null
          logged_at?: string
          plate_number?: string
          rule_applied?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_entry_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entry_logs_rule_applied_fkey"
            columns: ["rule_applied"]
            isOneToOne: false
            referencedRelation: "gate_access_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entry_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gates: {
        Row: {
          assigned_operator_id: string | null
          camera_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          camera_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          camera_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gates_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          file_type: string
          file_url: string
          id: string
          priority: number | null
          processing_started_at: string | null
          result: Json | null
          retry_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_type?: string
          file_url: string
          id?: string
          priority?: number | null
          processing_started_at?: string | null
          result?: Json | null
          retry_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_type?: string
          file_url?: string
          id?: string
          priority?: number | null
          processing_started_at?: string | null
          result?: Json | null
          retry_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_groups: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          first_seen_at: string
          group_id: string | null
          id: string
          is_blacklisted: boolean | null
          last_seen_at: string
          make: string | null
          model: string | null
          notes: string | null
          owner_contact: string | null
          owner_name: string | null
          plate_number: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          first_seen_at?: string
          group_id?: string | null
          id?: string
          is_blacklisted?: boolean | null
          last_seen_at?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          plate_number: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          first_seen_at?: string
          group_id?: string | null
          id?: string
          is_blacklisted?: boolean | null
          last_seen_at?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          plate_number?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vehicle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          camera_id: string | null
          created_at: string
          description: string | null
          detected_at: string
          fine_amount: number | null
          id: string
          image_url: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          updated_at: string
          vehicle_id: string
          video_url: string | null
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          fine_amount?: number | null
          id?: string
          image_url?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          updated_at?: string
          vehicle_id: string
          video_url?: string | null
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          fine_amount?: number | null
          id?: string
          image_url?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          updated_at?: string
          vehicle_id?: string
          video_url?: string | null
          violation_type?: Database["public"]["Enums"]["violation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "violations_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
      is_operator_for_camera: { Args: { _camera_id: string }; Returns: boolean }
      is_operator_for_gate: { Args: { _gate_id: string }; Returns: boolean }
      is_viewer: { Args: never; Returns: boolean }
    }
    Enums: {
      access_rule_type: "whitelist" | "blacklist" | "time_based" | "group"
      app_role: "admin" | "operator" | "viewer"
      camera_status: "online" | "offline" | "maintenance"
      gate_action: "entry" | "exit" | "denied"
      vehicle_type: "car" | "two_wheeler" | "commercial" | "other"
      violation_type:
        | "helmet"
        | "seatbelt"
        | "triple_riding"
        | "mobile_phone"
        | "wrong_way"
        | "red_light"
        | "illegal_parking"
        | "overloading"
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
      access_rule_type: ["whitelist", "blacklist", "time_based", "group"],
      app_role: ["admin", "operator", "viewer"],
      camera_status: ["online", "offline", "maintenance"],
      gate_action: ["entry", "exit", "denied"],
      vehicle_type: ["car", "two_wheeler", "commercial", "other"],
      violation_type: [
        "helmet",
        "seatbelt",
        "triple_riding",
        "mobile_phone",
        "wrong_way",
        "red_light",
        "illegal_parking",
        "overloading",
        "other",
      ],
    },
  },
} as const
