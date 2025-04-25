import { PlayerRole, GameState, GameSettings, GameResultType, VotingPhase, VotingOutcome } from '@/lib/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      game_rooms: {
        Row: GameRoomsRow;
        Insert: {
          created_at?: string;
          current_player_id?: string | null;
          current_voting_round_id?: string | null;
          discussion_time?: number;
          discussion_timer?: number;
          game_end_countdown?: number | null;
          game_mode?: string;
          game_result?: GameResultType | null;
          game_secret?: string | null;
          game_settings?: GameSettings;
          game_state?: GameState;
          game_type?: string;
          host_id: string;
          id?: string;
          max_players?: number;
          max_rounds?: number;
          presenting_time?: number;
          presenting_timer?: number;
          round?: number;
          secret_word?: string | null;
          team_size?: number;
          turn_order?: string[];
          turn_started_at?: string | null;
          turn_timer?: number;
          updated_at?: string;
          voting_time?: number;
          voting_timer?: number;
          chaos_mode?: boolean;
          last_updated?: string;
          voted_out_player?: string | null;
        };
        Update: {
          created_at?: string;
          current_player_id?: string | null;
          current_voting_round_id?: string | null;
          discussion_time?: number;
          discussion_timer?: number;
          game_end_countdown?: number | null;
          game_mode?: string;
          game_result?: GameResultType | null;
          game_secret?: string | null;
          game_settings?: GameSettings;
          game_state?: GameState;
          game_type?: string;
          host_id?: string;
          id?: string;
          max_players?: number;
          max_rounds?: number;
          presenting_time?: number;
          presenting_timer?: number;
          round?: number;
          secret_word?: string | null;
          team_size?: number;
          turn_order?: string[];
          turn_started_at?: string | null;
          turn_timer?: number;
          updated_at?: string;
          voting_time?: number;
          voting_timer?: number;
          chaos_mode?: boolean;
          last_updated?: string;
          voted_out_player?: string | null;
        };
        Relationships: []
      },
      players: {
        Row: {
          created_at: string | null
          id: string
          is_host: boolean
          name: string
          room_id: string
          vote: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_host?: boolean
          name: string
          room_id: string
          vote?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_host?: boolean
          name?: string
          room_id?: string
          vote?: string | null
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
      },
      voting_rounds: {
        Row: {
          id: string;
          room_id: string;
          round_number: number;
          phase: VotingPhase;
          start_time: string;
          end_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          round_number: number;
          phase: VotingPhase;
          start_time?: string;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          round_number?: number;
          phase?: VotingPhase;
          start_time?: string;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voting_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          }
        ]
      },
      votes: {
        Row: {
          id: string;
          round_id: string;
          voter_id: string;
          target_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          voter_id: string;
          target_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          voter_id?: string;
          target_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "voting_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      },
      round_results: {
        Row: {
          id: string;
          round_id: string;
          voted_out_player_id: string | null;
          revealed_role: string | null;
          outcome: VotingOutcome;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          voted_out_player_id?: string | null;
          revealed_role?: string | null;
          outcome: VotingOutcome;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          voted_out_player_id?: string | null;
          revealed_role?: string | null;
          outcome?: VotingOutcome;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "round_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "voting_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_results_voted_out_player_id_fkey"
            columns: ["voted_out_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      active_voting_rounds: {
        Row: {
          id: string;
          room_id: string;
          round_number: number;
          phase: VotingPhase;
          start_time: string;
          end_time: string | null;
          created_at: string;
          updated_at: string;
          votes_count: number;
          votes: Database['public']['Tables']['votes']['Row'][];
          round_result: Database['public']['Tables']['round_results']['Row'] | null;
        }
        Relationships: [
          {
            foreignKeyName: "voting_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          }
        ]
      }
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

export interface Player {
  id: string;
  name: string;
  room_id: string;
  role?: PlayerRole;
  vote?: string;
  turn_description?: string;
  last_active: string;
  created_at: string;
}

type GameRoomsRow = {
  created_at: string;
  current_player_id: string | null;
  current_voting_round_id: string | null;
  discussion_time: number;
  discussion_timer: number;
  game_end_countdown: number | null;
  game_mode: string;
  game_result: GameResultType | null;
  game_secret: string | null;
  game_settings: GameSettings;
  game_state: GameState;
  game_type: string;
  host_id: string;
  id: string;
  max_players: number;
  max_rounds: number;
  presenting_time: number;
  presenting_timer: number;
  round: number;
  secret_word: string | null;
  team_size: number;
  turn_order: string[];
  turn_started_at: string | null;
  turn_timer: number;
  updated_at: string;
  voting_time: number;
  voting_timer: number;
  chaos_mode: boolean;
  last_updated: string;
  voted_out_player: string | null;
}
