import { db } from '@/lib/db';

export async function getActivePlayersCount(): Promise<number> {
  try {
    // Get all active game rooms
    const rooms = await db.gameRoom.findMany({
      where: {
        status: 'active'
      },
      include: {
        players: true
      }
    });

    // Count total players in active rooms
    const totalPlayers = rooms.reduce((acc, room) => acc + room.players.length, 0);
    
    // Return the count, minimum 10 for display purposes
    return Math.max(10, totalPlayers);
  } catch (error) {
    console.error('Error getting active players count:', error);
    return 10; // Default value if there's an error
  }
} 