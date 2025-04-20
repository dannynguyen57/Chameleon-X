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
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_hint: boolean | null
          player_id: string | null
          player_name: string
          role: string | null
          room_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_hint?: boolean | null
          player_id?: string | null
          player_name: string
          role?: string | null
          room_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_hint?: boolean | null
          player_id?: string | null
          player_name?: string
          role?: string | null
          room_id?: string | null
        }
        Relationships: []
      }
      game_rooms: {
        Row: {
          category: string | null
          chameleon_id: string | null
          chaos_mode: boolean
          created_at: string | null
          current_turn: number | null
          discussion_time: number
          game_mode: string
          host_id: string
          id: string
          last_updated: string | null
          max_players: number
          max_rounds: number
          revealed_player_id: string | null
          revealed_role: string | null
          round: number | null
          round_outcome: string | null
          secret_word: string | null
          settings: Json
          state: string
          team_size: number
          time_per_round: number
          timer: number | null
          turn_order: string[] | null
          updated_at: string | null
          votes_tally: Json | null
          voting_time: number
        }
        Insert: {
          category?: string | null
          chameleon_id?: string | null
          chaos_mode: boolean
          created_at?: string | null
          current_turn?: number | null
          discussion_time: number
          game_mode: string
          host_id: string
          id: string
          last_updated?: string | null
          max_players: number
          max_rounds: number
          revealed_player_id?: string | null
          revealed_role?: string | null
          round?: number | null
          round_outcome?: string | null
          secret_word?: string | null
          settings: Json
          state: string
          team_size: number
          time_per_round: number
          timer?: number | null
          turn_order?: string[] | null
          updated_at?: string | null
          votes_tally?: Json | null
          voting_time: number
        }
        Update: {
          category?: string | null
          chameleon_id?: string | null
          chaos_mode?: boolean
          created_at?: string | null
          current_turn?: number | null
          discussion_time?: number
          game_mode?: string
          host_id?: string
          id?: string
          last_updated?: string | null
          max_players?: number
          max_rounds?: number
          revealed_player_id?: string | null
          revealed_role?: string | null
          round?: number | null
          round_outcome?: string | null
          secret_word?: string | null
          settings?: Json
          state?: string
          team_size?: number
          time_per_round?: number
          timer?: number | null
          turn_order?: string[] | null
          updated_at?: string | null
          votes_tally?: Json | null
          voting_time?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          is_host: boolean
          is_protected: boolean | null
          is_ready: boolean
          last_active: string | null
          last_updated: string | null
          name: string
          role: string | null
          room_id: string | null
          special_ability_used: boolean | null
          special_word: string | null
          turn_description: string | null
          vote: string | null
          vote_multiplier: number | null
        }
        Insert: {
          id: string
          is_host: boolean
          is_protected?: boolean | null
          is_ready: boolean
          last_active?: string | null
          last_updated?: string | null
          name: string
          role?: string | null
          room_id?: string | null
          special_ability_used?: boolean | null
          special_word?: string | null
          turn_description?: string | null
          vote?: string | null
          vote_multiplier?: number | null
        }
        Update: {
          id?: string
          is_host?: boolean
          is_protected?: boolean | null
          is_ready?: boolean
          last_active?: string | null
          last_updated?: string | null
          name?: string
          role?: string | null
          room_id?: string | null
          special_ability_used?: boolean | null
          special_word?: string | null
          turn_description?: string | null
          vote?: string | null
          vote_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_game_room: {
        Args:
          | {
              p_room_id: string
              p_host_id: string
              p_player_name: string
              p_settings: Json
            }
          | {
              p_room_id: string
              p_player_id: string
              p_player_name: string
              p_settings: Json
            }
        Returns: string
      }
      join_game_room: {
        Args:
          | { p_room_id: string; p_player_id: string; p_player_name: string }
          | { p_room_id: string; p_player_id: string; p_player_name: string }
        Returns: boolean
      }
      start_game: {
        Args: { room_id: string }
        Returns: undefined
      }
      update_room_settings: {
        Args: { room_id: string; new_settings: Json }
        Returns: undefined
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
