import { GameMode, PlayerRole, GameSettings } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  max_players: Number(import.meta.env.VITE_MAX_PLAYERS) || 10,
  discussion_time: 30,
  max_rounds: Number(import.meta.env.VITE_DEFAULT_MAX_ROUNDS) || 3,
  game_mode: GameMode.Classic,
  team_size: 2,
  chaos_mode: false,
  time_per_round: 30,
  voting_time: 30,
  roles: {
    [GameMode.Classic]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Mimic],
    [GameMode.Teams]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Detective, PlayerRole.Guardian],
    [GameMode.Chaos]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Mimic, PlayerRole.Jester, PlayerRole.Spy, PlayerRole.Mirror],
    [GameMode.Timed]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Timekeeper]
  },
  special_abilities: false
}; 