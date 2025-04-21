import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, LogOut, Settings } from "lucide-react";
import LobbyScreen from "./game-screens/LobbyScreen";
import CategorySelection from "./game-screens/CategorySelection";
import GamePlay from "./game-screens/GamePlay";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  const isHost = room.host_id === room.players.find(p => p.id === room.host_id)?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Room Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto p-4">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="p-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Room {room.id}</CardTitle>
                  <CardDescription>
                    {room.players.length} player{room.players.length !== 1 ? 's' : ''} in the room
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={copyRoomId}
                    className={cn(
                      "transition-all duration-200",
                      copied && "bg-primary/10 text-primary"
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isHost && (
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={handleLeaveRoom}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Game Content */}
      <div className="container mx-auto p-4">
        {room.state === 'lobby' && <LobbyScreen />}
        {room.state === 'selecting' && <CategorySelection />}
        {(room.state === 'presenting' || room.state === 'discussion' || room.state === 'voting' || room.state === 'results') && (
          <GamePlay />
        )}
      </div>
    </div>
  );
}
