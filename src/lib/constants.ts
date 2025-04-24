import { GameMode, PlayerRole, GameSettings } from './types';
import { DEFAULT_ROLES as DEFAULT_ROLES_FROM_TYPES } from './types';

// Re-export DEFAULT_ROLES
export const DEFAULT_ROLES = DEFAULT_ROLES_FROM_TYPES;

// Helper function to get default roles based on game mode and special abilities
const getDefaultRoles = (gameMode: GameMode, specialAbilities: boolean) => {
  const roles = { ...DEFAULT_ROLES };
  
  // If special abilities are off, filter out special roles
  if (!specialAbilities) {
    Object.keys(roles).forEach(mode => {
      roles[mode as GameMode] = roles[mode as GameMode].filter(role => 
        role === PlayerRole.Regular || role === PlayerRole.Chameleon
      );
    });
  }
  
  return roles;
};

export const DEFAULT_SETTINGS: GameSettings = {
  max_players: Number(import.meta.env.VITE_MAX_PLAYERS) || 10,
  discussion_time: Number(import.meta.env.VITE_DISCUSSION_TIME) || 120,
  max_rounds: Number(import.meta.env.VITE_DEFAULT_MAX_ROUNDS) || 3,
  game_mode: GameMode.Classic,
  team_size: Number(import.meta.env.VITE_TEAM_SIZE) || 2,
  chaos_mode: false,
  presenting_time: Number(import.meta.env.VITE_PRESENTING_TIME) || 60,
  voting_time: Number(import.meta.env.VITE_VOTING_TIME) || 30,
  roles: getDefaultRoles(GameMode.Classic, false), // Start with special abilities off
  special_abilities: false
}; 