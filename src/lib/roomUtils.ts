import { GameRoom as BaseGameRoom, PlayerRole } from '@/lib/types';
import { ExtendedGameRoom } from '@/contexts/GameContextProvider';

export const convertToExtendedRoom = (baseRoom: BaseGameRoom): ExtendedGameRoom => {
  // Initialize all timers to 0 by default
  const timers = {
    presenting_timer: 0,
    discussion_timer: 0,
    voting_timer: 0,
    turn_timer: 0
  };

  // Only set timers if we're in an active game state
  if (baseRoom.state !== 'lobby') {
    switch (baseRoom.state) {
      case 'presenting':
        // In presenting state, each player gets their individual time
        timers.turn_timer = baseRoom.settings.presenting_time;
        // Total presenting time is managed by the game logic
        timers.presenting_timer = baseRoom.presenting_timer || 0;
        break;
      case 'discussion':
        timers.discussion_timer = baseRoom.settings.discussion_time;
        break;
      case 'voting':
        timers.voting_timer = baseRoom.settings.voting_time;
        break;
    }
  }

  return {
    ...baseRoom,
    ...timers,
    chameleon_count: baseRoom.players.filter(p => p.role === PlayerRole.Chameleon).length,
    player_count: baseRoom.players.length,
    last_updated: baseRoom.updated_at
  };
}; 