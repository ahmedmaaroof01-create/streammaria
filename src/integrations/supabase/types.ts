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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocked_visitors: {
        Row: {
          blocked_at: string
          reason: string | null
          visitor_id: string
        }
        Insert: {
          blocked_at?: string
          reason?: string | null
          visitor_id: string
        }
        Update: {
          blocked_at?: string
          reason?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          visitor_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          visitor_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          content_type: string | null
          created_at: string
          drive_folder_id: string
          drive_url: string
          id: string
          last_synced_at: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          drive_folder_id: string
          drive_url: string
          id?: string
          last_synced_at?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          drive_folder_id?: string
          drive_url?: string
          id?: string
          last_synced_at?: string | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          created_at: string
          id: string
          type: string
          value: string | null
          video_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          type: string
          value?: string | null
          video_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
          value?: string | null
          video_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          created_at: string
          id: string
          image_data: string | null
          position_seconds: number
          video_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_data?: string | null
          position_seconds: number
          video_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_data?: string | null
          position_seconds?: number
          video_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      video_chapters: {
        Row: {
          created_at: string
          description: string | null
          end_seconds: number | null
          id: string
          start_seconds: number
          title: string
          video_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_seconds?: number | null
          id?: string
          start_seconds?: number
          title: string
          video_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_seconds?: number | null
          id?: string
          start_seconds?: number
          title?: string
          video_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          chapters_generated: boolean | null
          created_at: string
          drive_file_id: string
          duration: number | null
          duration_seconds: number | null
          folder_id: string
          id: string
          mime_type: string | null
          name: string
          size: number | null
          thumbnail_url: string | null
        }
        Insert: {
          chapters_generated?: boolean | null
          created_at?: string
          drive_file_id: string
          duration?: number | null
          duration_seconds?: number | null
          folder_id: string
          id?: string
          mime_type?: string | null
          name: string
          size?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          chapters_generated?: boolean | null
          created_at?: string
          drive_file_id?: string
          duration?: number | null
          duration_seconds?: number | null
          folder_id?: string
          id?: string
          mime_type?: string | null
          name?: string
          size?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          created_at: string
          id: string
          user_agent: string | null
          visitor_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_agent?: string | null
          visitor_key: string
        }
        Update: {
          created_at?: string
          id?: string
          user_agent?: string | null
          visitor_key?: string
        }
        Relationships: []
      }
      watch_sessions: {
        Row: {
          completed: boolean | null
          ended_at: string | null
          id: string
          last_position: number | null
          started_at: string
          video_id: string
          visitor_id: string | null
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          ended_at?: string | null
          id?: string
          last_position?: number | null
          started_at?: string
          video_id: string
          visitor_id?: string | null
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          ended_at?: string | null
          id?: string
          last_position?: number | null
          started_at?: string
          video_id?: string
          visitor_id?: string | null
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_sessions_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
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
    Enums: {},
  },
} as const
