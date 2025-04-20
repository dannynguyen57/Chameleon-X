
import { useEffect, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LobbyScreen from "./game-screens/LobbyScreen";
import CategorySelection from "./game-screens/CategorySelection";
import GamePlay from "./game-screens/GamePlay";
import VotingScreen from "./game-screens/VotingScreen";
import ResultsScreen from "./game-screens/ResultsScreen";
import ChatPanel from "./game-screens/ChatPanel";
import { Copy, Check, LogOut, Loader2 } from "lucide-react";

export default function GameRoom() {
  const { room, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not in a room
  useEffect(() => {
    if (!room) {
      navigate("/");
    }
  }, [room, navigate]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Loading game room...</p>
        </div>
      </div>
    );
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = async () => {
    setIsLoading(true);
    await leaveRoom();
    navigate("/");
  };

  // Determine the game phase title
  const getPhaseTitle = () => {
    switch (room.state) {
      case "lobby":
        return "Waiting Room";
      case "selecting":
        return "Category Selection";
      case "presenting":
        return "Description Phase";
      case "discussion":
        return "Discussion Phase";
      case "voting":
        return "Voting Phase";
      case "results":
        return "Round Results";
      default:
        return "Chameleon X";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 pb-24">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card border rounded-lg shadow-lg p-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Chameleon X
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold">Room:</span>
              <code className="bg-black/10 px-3 py-1 rounded font-mono text-lg">
                {room.id}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomId}
                className="flex items-center gap-1 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="text-right mr-2">
              <div className="text-sm font-medium">{getPhaseTitle()}</div>
              <div className="text-xs text-muted-foreground">
                Round {room.round} of {room.maxRounds}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLeaveRoom}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Leaving...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Leave</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Game Screens */}
        {room.state === "lobby" && <LobbyScreen />}
        {room.state === "selecting" && <CategorySelection />}
        {(room.state === "presenting" || room.state === "discussion") && <GamePlay />}
        {room.state === "voting" && <VotingScreen />}
        {room.state === "results" && <ResultsScreen />}
        
        {/* Chat Panel - shown in all states */}
        <ChatPanel />
      </div>
    </div>
  );
}
