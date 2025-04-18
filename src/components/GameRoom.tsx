
import { useEffect, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/word-categories";
import LobbyScreen from "./game-screens/LobbyScreen";
import CategorySelection from "./game-screens/CategorySelection";
import GamePlay from "./game-screens/GamePlay";
import VotingScreen from "./game-screens/VotingScreen";
import ResultsScreen from "./game-screens/ResultsScreen";

export default function GameRoom() {
  const { room, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Redirect if not in a room
  useEffect(() => {
    if (!room) {
      navigate("/");
    }
  }, [room, navigate]);

  if (!room) {
    return null;
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Chameleon Undercover
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold">Room Code:</span>
              <code className="bg-black/10 px-3 py-1 rounded font-mono text-lg">
                {room.id}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomId}
                className="text-xs"
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
        </div>

        {/* Game Screens */}
        {room.state === "lobby" && <LobbyScreen />}
        {room.state === "selecting" && <CategorySelection />}
        {room.state === "presenting" && <GamePlay />}
        {room.state === "voting" && <VotingScreen />}
        {room.state === "results" && <ResultsScreen />}
      </div>
    </div>
  );
}
