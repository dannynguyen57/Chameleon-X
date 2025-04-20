import { useParams } from "react-router-dom";
import { useGame } from "@/context/GameContext";
import GameRoom from "@/components/GameRoom";
import { useEffect } from "react";

const Room = () => {
  const { roomId } = useParams();
  const { room, joinRoom, playerName } = useGame();

  useEffect(() => {
    if (roomId && !room) {
      // If we have a room ID but no room data, try to join the room
      joinRoom(roomId, playerName);
    }
  }, [roomId, room, joinRoom, playerName]);

  if (!roomId) {
    return null;
  }

  return <GameRoom />;
};

export default Room;
