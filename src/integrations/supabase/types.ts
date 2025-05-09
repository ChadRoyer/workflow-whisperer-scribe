export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_solutions: {
        Row: {
          ai_tool: string | null
          complexity: string | null
          created_at: string | null
          id: string
          roi_score: number | null
          sources: Json | null
          step_label: string | null
          suggestion: string | null
          workflow_id: string | null
        }
        Insert: {
          ai_tool?: string | null
          complexity?: string | null
          created_at?: string | null
          id?: string
          roi_score?: number | null
          sources?: Json | null
          step_label?: string | null
          suggestion?: string | null
          workflow_id?: string | null
        }
        Update: {
          ai_tool?: string | null
          complexity?: string | null
          created_at?: string | null
          id?: string
          roi_score?: number | null
          sources?: Json | null
          step_label?: string | null
          suggestion?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_solutions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          company_name: string
          created_at: string
          facilitator: string
          finished: boolean | null
          id: string
          title: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          facilitator: string
          finished?: boolean | null
          id?: string
          title?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          facilitator?: string
          finished?: boolean | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      steps: {
        Row: {
          action: string
          actor: string
          id: string
          manual: boolean | null
          notes: string | null
          step_order: number
          system_used: string | null
          wait_minutes: number | null
          workflow_id: string
        }
        Insert: {
          action: string
          actor: string
          id?: string
          manual?: boolean | null
          notes?: string | null
          step_order: number
          system_used?: string | null
          wait_minutes?: number | null
          workflow_id: string
        }
        Update: {
          action?: string
          actor?: string
          id?: string
          manual?: boolean | null
          notes?: string | null
          step_order?: number
          system_used?: string | null
          wait_minutes?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          end_event: string | null
          id: string
          pain_point: string | null
          people: string[] | null
          score: number | null
          session_id: string | null
          start_event: string | null
          systems: string[] | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          end_event?: string | null
          id?: string
          pain_point?: string | null
          people?: string[] | null
          score?: number | null
          session_id?: string | null
          start_event?: string | null
          systems?: string[] | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          end_event?: string | null
          id?: string
          pain_point?: string | null
          people?: string[] | null
          score?: number | null
          session_id?: string | null
          start_event?: string | null
          systems?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
