import { GameRoom as BaseGameRoom, PlayerRole } from '@/lib/types';
import { ExtendedGameRoom } from '@/contexts/GameContextProvider';

export const convertToExtendedRoom = (baseRoom: BaseGameRoom): ExtendedGameRoom => {
  return {
    ...baseRoom,
    presenting_timer: baseRoom.settings.presenting_time,
    discussion_timer: baseRoom.settings.discussion_time,
    voting_timer: baseRoom.settings.voting_time,
    turn_timer: baseRoom.settings.presenting_time,
    chameleon_count: baseRoom.players.filter(p => p.role === PlayerRole.Chameleon).length,
    player_count: baseRoom.players.length
  };
}; 