export type GameMode = 'classic' | 'timed' | 'chaos' | 'team';

export type GameSettings = {
  maxPlayers: number;
  discussionTime: number;
  maxRounds: number;
  gameMode: GameMode;
  teamSize?: number;
  chaosMode?: boolean;
  timePerRound?: number;
  votingTime?: number;
};

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  vote: string | null;
  team?: number;
  role?: string;
};

export enum GameState {
  Lobby = 'lobby',
  CategorySelection = 'category_selection',
  GamePlay = 'game_play',
  Voting = 'voting',
  Results = 'results'
}

export type GameRoom = {
  id: string;
  hostId: string;
  players: Player[];
  state: GameState;
  category?: string;
  secretWord?: string;
  chameleonId?: string;
  timer?: number;
  round: number;
  maxRounds: number;
  settings: GameSettings;
};
