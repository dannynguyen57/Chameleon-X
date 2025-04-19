import { GamePhase } from '@/types/GamePhase';
import { Room } from '@/types/Room';

const gameService = {
  async updatePlayerTurn(roomId: string, playerId: string, turnDescription: string): Promise<Room> {
    const response = await fetch(`/api/rooms/${roomId}/players/${playerId}/turn`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ turnDescription }),
    });
    if (!response.ok) {
      throw new Error('Failed to update player turn');
    }
    return response.json();
  },

  async updateGamePhase(roomId: string, phase: GamePhase): Promise<void> {
    const response = await fetch(`/api/rooms/${roomId}/phase`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phase }),
    });
    if (!response.ok) {
      throw new Error('Failed to update game phase');
    }
  },

  async updateCurrentTurn(roomId: string, playerId: string): Promise<void> {
    const response = await fetch(`/api/rooms/${roomId}/current-turn`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });
    if (!response.ok) {
      throw new Error('Failed to update current turn');
    }
  }
};

export default gameService; 