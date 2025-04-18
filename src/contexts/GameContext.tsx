
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings } from '@/lib/types';
import { categories } from '@/lib/word-categories';

// Default game settings
const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  discussionTime: 120, // 2 minutes
  maxRounds: 3
};

// Context types
type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => boolean;
  startGame: () => void;
  selectCategory: (categoryName: string) => void;
  submitVote: (targetPlayerId: string) => void;
  nextRound: () => void;
  leaveRoom: () => void;
  resetGame: () => void;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
};

// Actions
type GameAction = 
  | { type: 'CREATE_ROOM'; payload: { playerName: string } }
  | { type: 'JOIN_ROOM'; payload: { roomId: string; playerName: string } }
  | { type: 'START_GAME' }
  | { type: 'SELECT_CATEGORY'; payload: { categoryName: string } }
  | { type: 'SUBMIT_VOTE'; payload: { playerId: string; targetId: string } }
  | { type: 'TICK_TIMER' }
  | { type: 'NEXT_ROUND' }
  | { type: 'LEAVE_ROOM'; payload: { playerId: string } }
  | { type: 'RESET_GAME' };

// Default context
const defaultGameContext: GameContextType = {
  playerId: '',
  room: null,
  settings: DEFAULT_SETTINGS,
  createRoom: () => {},
  joinRoom: () => false,
  startGame: () => {},
  selectCategory: () => {},
  submitVote: () => {},
  nextRound: () => {},
  leaveRoom: () => {},
  resetGame: () => {},
  isPlayerChameleon: false,
  remainingTime: null,
  playerName: '',
  setPlayerName: () => {},
};

// Create context
const GameContext = createContext<GameContextType>(defaultGameContext);

// Reducer function
function gameReducer(state: GameRoom | null, action: GameAction): GameRoom | null {
  switch (action.type) {
    case 'CREATE_ROOM': {
      const playerId = uuidv4();
      return {
        id: uuidv4().substring(0, 6).toUpperCase(), // Shorter, user-friendly room ID
        hostId: playerId,
        players: [
          { id: playerId, name: action.payload.playerName, isHost: true }
        ],
        state: 'lobby',
        round: 0,
        maxRounds: DEFAULT_SETTINGS.maxRounds,
      };
    }
    
    case 'JOIN_ROOM': {
      if (!state) return null;
      
      // Check if player name already exists in the room
      const nameExists = state.players.some(p => p.name === action.payload.playerName);
      if (nameExists) return state; // Return current state if name exists
      
      const playerId = uuidv4();
      return {
        ...state,
        players: [...state.players, { 
          id: playerId, 
          name: action.payload.playerName, 
          isHost: false 
        }]
      };
    }
    
    case 'START_GAME': {
      if (!state || state.players.length < 3) return state;
      
      return {
        ...state,
        state: 'selecting',
        round: state.round + 1,
      };
    }
    
    case 'SELECT_CATEGORY': {
      if (!state) return null;
      
      const selectedCategory = categories.find(c => c.name === action.payload.categoryName);
      if (!selectedCategory) return state;
      
      // Choose random word from the category
      const randomWordIndex = Math.floor(Math.random() * selectedCategory.words.length);
      const secretWord = selectedCategory.words[randomWordIndex];
      
      // Choose a random player to be the chameleon
      const chameleonIndex = Math.floor(Math.random() * state.players.length);
      const chameleonId = state.players[chameleonIndex].id;
      
      return {
        ...state,
        state: 'presenting',
        category: selectedCategory.name,
        secretWord,
        chameleonId,
        timer: DEFAULT_SETTINGS.discussionTime
      };
    }
    
    case 'SUBMIT_VOTE': {
      if (!state) return null;
      
      const updatedPlayers = state.players.map(player => {
        if (player.id === action.payload.playerId) {
          return { ...player, vote: action.payload.targetId };
        }
        return player;
      });
      
      // Check if all players have voted
      const allVoted = updatedPlayers.every(player => player.vote);
      
      return {
        ...state,
        players: updatedPlayers,
        state: allVoted ? 'results' : state.state
      };
    }
    
    case 'TICK_TIMER': {
      if (!state || !state.timer) return state;
      
      const newTimer = state.timer - 1;
      
      // If timer reached zero, move to voting phase
      if (newTimer <= 0 && state.state === 'presenting') {
        return {
          ...state,
          state: 'voting',
          timer: 0
        };
      }
      
      return {
        ...state,
        timer: newTimer
      };
    }
    
    case 'NEXT_ROUND': {
      if (!state) return null;
      
      // Check if we've reached max rounds
      if (state.round >= state.maxRounds) {
        return {
          ...state,
          state: 'lobby',
          round: 0,
          category: undefined,
          secretWord: undefined,
          chameleonId: undefined,
          players: state.players.map(player => ({ ...player, vote: undefined }))
        };
      }
      
      // Set up for next round
      return {
        ...state,
        state: 'selecting',
        round: state.round + 1,
        category: undefined,
        secretWord: undefined,
        chameleonId: undefined,
        timer: undefined,
        players: state.players.map(player => ({ ...player, vote: undefined }))
      };
    }
    
    case 'LEAVE_ROOM': {
      if (!state) return null;
      
      const remainingPlayers = state.players.filter(p => p.id !== action.payload.playerId);
      
      // If no players left, return null
      if (remainingPlayers.length === 0) return null;
      
      // If the host left, assign a new host
      let newHostId = state.hostId;
      if (action.payload.playerId === state.hostId && remainingPlayers.length > 0) {
        newHostId = remainingPlayers[0].id;
        remainingPlayers[0] = { ...remainingPlayers[0], isHost: true };
      }
      
      return {
        ...state,
        hostId: newHostId,
        players: remainingPlayers
      };
    }
    
    case 'RESET_GAME': {
      if (!state) return null;
      
      return {
        ...state,
        state: 'lobby',
        round: 0,
        category: undefined,
        secretWord: undefined,
        chameleonId: undefined,
        timer: undefined,
        players: state.players.map(player => ({ ...player, vote: undefined }))
      };
    }
    
    default:
      return state;
  }
}

// Provider component
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerId, setPlayerId] = useState<string>('');
  const [room, dispatch] = useReducer(gameReducer, null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState<string>('');

  // Check if the current player is the chameleon
  const isPlayerChameleon = !!(room?.chameleonId && playerId === room.chameleonId);

  // Timer effect
  useEffect(() => {
    let timerId: number | undefined;
    
    if (room?.timer && room.timer > 0 && room.state === 'presenting') {
      setRemainingTime(room.timer);
      timerId = window.setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    } else {
      setRemainingTime(null);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [room?.timer, room?.state]);

  // Create a new room
  const createRoom = (playerName: string) => {
    const newPlayerId = uuidv4();
    setPlayerId(newPlayerId);
    setPlayerName(playerName);
    dispatch({ type: 'CREATE_ROOM', payload: { playerName } });
  };

  // Join an existing room
  const joinRoom = (roomId: string, playerName: string): boolean => {
    if (!roomId) return false;
    
    const newPlayerId = uuidv4();
    setPlayerId(newPlayerId);
    setPlayerName(playerName);
    dispatch({ type: 'JOIN_ROOM', payload: { roomId, playerName } });
    return true;
  };

  // Start the game
  const startGame = () => {
    if (room && room.hostId === playerId) {
      dispatch({ type: 'START_GAME' });
    }
  };

  // Select a category
  const selectCategory = (categoryName: string) => {
    dispatch({ type: 'SELECT_CATEGORY', payload: { categoryName } });
  };

  // Submit a vote
  const submitVote = (targetPlayerId: string) => {
    if (playerId) {
      dispatch({ type: 'SUBMIT_VOTE', payload: { playerId, targetId: targetPlayerId } });
    }
  };

  // Move to next round
  const nextRound = () => {
    dispatch({ type: 'NEXT_ROUND' });
  };

  // Leave the room
  const leaveRoom = () => {
    if (playerId) {
      dispatch({ type: 'LEAVE_ROOM', payload: { playerId } });
      setPlayerId('');
    }
  };

  // Reset the game
  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const value = {
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitVote,
    nextRound,
    leaveRoom,
    resetGame,
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Custom hook to use the game context
export const useGame = () => useContext(GameContext);
