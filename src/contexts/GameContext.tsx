
import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Player, 
  GameRoom, 
  GameState, 
  GameSettings, 
  ChatMessage,
  GameMode
} from '@/lib/types';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  discussionTime: 120,
  maxRounds: 3,
  gameMode: 'classic' as GameMode,
  teamSize: 2,
  chaosMode: false,
  timePerRound: 60,
  votingTime: 30
};

type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  chatMessages: ChatMessage[];
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  sendChatMessage: (message: string, isHint?: boolean) => Promise<boolean>;
  togglePlayerReady: () => Promise<boolean>;
  startGame: () => Promise<void>;
  updateGameSettings: (settings: Partial<GameSettings>) => Promise<void>;
  selectCategory: (categoryName: string) => Promise<void>;
  submitTurnDescription: (description: string) => Promise<void>;
  moveToVotingPhase: () => Promise<void>;
  submitVote: (targetPlayerId: string) => Promise<void>;
  submitChameleonGuess: (secretWordGuess: string) => Promise<boolean>;
  nextRound: () => Promise<void>;
  useSpecialAbility: (targetPlayerId?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  isPlayerChameleon: boolean;
  isCurrentPlayerTurn: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
};

const GameContext = createContext<GameContextType>(null!);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');

  const isPlayerChameleon = !!(room?.chameleonId && playerId === room.chameleonId);
  const isCurrentPlayerTurn = !!(room?.turnOrder && 
                              room?.currentTurn !== undefined && 
                              room.turnOrder[room.currentTurn] === playerId);

  // Use our custom hooks
  const { chatMessages, setChatMessages } = useGameRealtime(room?.id, setRoom, playerId);
  const remainingTime = useGameTimer(room?.id, room?.timer, room?.state);
  const gameActions = useGameActions(playerId, room, settings);

  // Wrapper functions to match expected return types
  const createRoomWrapper = async (playerName: string): Promise<void> => {
    await gameActions.createRoom(playerName);
  };

  const startGameWrapper = async (): Promise<void> => {
    await gameActions.startGame();
  };

  const selectCategoryWrapper = async (categoryName: string): Promise<void> => {
    await gameActions.selectCategory(categoryName);
  };

  const submitTurnDescriptionWrapper = async (description: string): Promise<void> => {
    await gameActions.submitTurnDescription(description);
  };

  const moveToVotingPhaseWrapper = async (): Promise<void> => {
    await gameActions.moveToVotingPhase();
  };

  const submitVoteWrapper = async (targetPlayerId: string): Promise<void> => {
    await gameActions.submitVote(targetPlayerId);
  };

  const nextRoundWrapper = async (): Promise<void> => {
    await gameActions.nextRound();
  };

  const updateGameSettingsWrapper = async (newSettings: Partial<GameSettings>): Promise<void> => {
    await gameActions.updateGameSettings(newSettings);
  };

  const useSpecialAbilityWrapper = async (targetPlayerId?: string): Promise<void> => {
    await gameActions.useSpecialAbility(targetPlayerId);
  };

  const leaveRoomWrapper = async (): Promise<void> => {
    await gameActions.leaveRoom();
  };

  const resetGameWrapper = async (): Promise<void> => {
    await gameActions.resetGame();
  };

  const value = {
    playerId,
    room,
    settings,
    chatMessages,
    createRoom: createRoomWrapper,
    joinRoom: gameActions.joinRoom,
    sendChatMessage: gameActions.sendChatMessage,
    togglePlayerReady: gameActions.togglePlayerReady,
    startGame: startGameWrapper,
    updateGameSettings: updateGameSettingsWrapper,
    selectCategory: selectCategoryWrapper,
    submitTurnDescription: submitTurnDescriptionWrapper,
    moveToVotingPhase: moveToVotingPhaseWrapper,
    submitVote: submitVoteWrapper,
    submitChameleonGuess: gameActions.submitChameleonGuess,
    nextRound: nextRoundWrapper,
    useSpecialAbility: useSpecialAbilityWrapper,
    leaveRoom: leaveRoomWrapper,
    resetGame: resetGameWrapper,
    isPlayerChameleon,
    isCurrentPlayerTurn,
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

export const useGame = () => useContext(GameContext);
