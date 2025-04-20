import { useEffect, useState } from "react";
import { useGame } from "@/contexts/GameContextProvider";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/word-categories";
import LobbyScreen from "./game-screens/LobbyScreen";
import CategorySelection from "./game-screens/CategorySelection";
import GamePlay from "./game-screens/GamePlay";
import VotingScreen from "./game-screens/VotingScreen";
import ResultsScreen from "./game-screens/ResultsScreen";
import { toast } from "@/components/ui/use-toast";

export default function GameRoom() {
  const { room, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Redirect if not in a room
  useEffect(() => {
    if (!room) {
      // Try to get the room from the URL
      const pathParts = window.location.pathname.split('/');
      const roomId = pathParts[pathParts.length - 1];
      
      if (roomId && roomId !== 'room') {
        // If we have a room ID in the URL but no room in context,
        // it means we need to wait for the room data to load
        return;
      }
      
      // If no room ID in URL and no room in context, redirect to home
      navigate("/");
    }
  }, [room, navigate]);

  if (!room) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Room code copied!",
      description: "Share this code with your friends to join the game.",
    });
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    navigate("/");
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Room {room.id}</CardTitle>
              <CardDescription>
                {room.players.length} player{room.players.length !== 1 ? 's' : ''} in the room
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyRoomId}>
                {copied ? 'Copied!' : 'Copy Room Code'}
              </Button>
              <Button variant="destructive" onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {room.state === 'lobby' && <LobbyScreen />}
      {room.state === 'selecting' && <CategorySelection />}
      {room.state === 'presenting' && <GamePlay />}
      {room.state === 'voting' && <VotingScreen />}
      {room.state === 'results' && <ResultsScreen />}
    </div>
  );
}
