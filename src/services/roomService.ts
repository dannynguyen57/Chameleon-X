import { Room } from '@/types/Room';
import { PlayerRole } from '@/lib/types';

export const roomService = {
  async getRoom(roomId: string): Promise<Room> {
    const response = await fetch(`/api/rooms/${roomId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch room');
    }
    return response.json();
  },

  async updatePlayerRole(roomId: string, playerId: string, role: PlayerRole): Promise<void> {
    const response = await fetch(`/api/rooms/${roomId}/players/${playerId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      throw new Error('Failed to update player role');
    }
  },

  async updatePlayerWord(roomId: string, playerId: string, word: string): Promise<void> {
    const response = await fetch(`/api/rooms/${roomId}/players/${playerId}/word`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word }),
    });
    if (!response.ok) {
      throw new Error('Failed to update player word');
    }
  }
}; 