
export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  vote?: string;
  isReady?: boolean;
  isProtected?: boolean;
  voteMultiplier?: number;
  specialWord?: string;
  specialAbilityUsed?: boolean;
  role?: string;
  turnDescription?: string;
};

export type GameState = 'lobby' | 'selecting' | 'presenting' | 'discussion' | 'voting' | 'results';

export type GameMode = 'classic' | 'team' | 'chaos';

export type ChatMessage = {
  id: string;
  playerId?: string;
  playerName: string;
  content: string;
  createdAt: string;
  role?: string;
  isHint?: boolean;
};

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
  gameMode: GameMode;
  teamSize: number;
  chaosMode: boolean;
  maxPlayers: number;
  discussionTime: number;
  timePerRound: number;
  votingTime: number;
  settings: GameSettings;
  currentTurn?: number;
  turnOrder?: string[];
  revealedPlayerId?: string;
  revealedRole?: string;
  roundOutcome?: string;
  votesTally?: Record<string, number>;
};

export type GameSettings = {
  maxPlayers: number;
  discussionTime: number;
  maxRounds: number;
  gameMode: GameMode;
  teamSize: number;
  chaosMode: boolean;
  timePerRound: number;
  votingTime: number;
};

export type PlayerRole = 'chameleon' | 'detective' | 'protector' | 'deceiver' | 'standard';

export type RoleDescription = {
  name: string;
  description: string;
  ability: string;
  icon: string;
};
