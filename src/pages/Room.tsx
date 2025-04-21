import { useParams } from "react-router-dom";
import { useGame } from "@/hooks/useGame";
import GameRoom from "@/components/GameRoom";
import { useEffect } from "react";

const Room = () => {
  const { roomId } = useParams();
  const { room, joinRoom } = useGame();

  useEffect(() => {
    if (roomId && !room) {
      // If we have a room ID but no room data, try to join the room
      const playerName = localStorage.getItem('playerName') || 'Anonymous';
      joinRoom(roomId, playerName);
    }
  }, [roomId, room, joinRoom]);

  if (!roomId) {
    return null;
  }

  return <GameRoom />;
};

export default Room;
