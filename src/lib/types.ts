
export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  vote?: string;
};

export type GameState = 'lobby' | 'selecting' | 'presenting' | 'voting' | 'results';

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
};

export type GameSettings = {
  maxPlayers: number;
  discussionTime: number;
  maxRounds: number;
};
