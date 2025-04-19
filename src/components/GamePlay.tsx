import { GameAnimations } from "./GameAnimations";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useMemo } from "react";

export const GamePlay = () => {
  const { room, isPlayerChameleon, remainingTime, playerId } = useGame();
  useGameSounds();

  // Memoize UI elements to prevent unnecessary re-renders
  const gameStatusCard = useMemo(() => {
    if (!room?.category) return null;
    
    return (
      <Card className="p-6 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {room.category}
            </h2>
            <p className="text-muted-foreground">
              {isPlayerChameleon ? "You are the Chameleon!" : "You are a regular player"}
            </p>
          </div>
          {remainingTime !== null && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-3xl font-bold text-primary"
            >
              {remainingTime}s
            </motion.div>
          )}
        </div>
      </Card>
    );
  }, [room?.category, isPlayerChameleon, remainingTime]);

  if (!room) return null;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-background/80">
      <GameAnimations />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Game Status */}
          {gameStatusCard}

          {/* Game Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="p-6 h-full bg-background/50 backdrop-blur-sm">
                {room.state === 'presenting' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">The Secret Word</h3>
                    {isPlayerChameleon ? (
                      <p className="text-lg font-medium text-muted-foreground">
                        You are the Chameleon! Try to figure out the secret word
                        by listening to the other players.
                      </p>
                    ) : (
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="text-2xl font-bold text-center text-primary">
                          {room.secret_word}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {room.state === 'voting' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Vote for the Chameleon</h3>
                    <p className="text-muted-foreground">
                      Who do you think is the Chameleon? Select a player to cast your vote.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {room.players.map(player => (
                        <Button
                          key={player.id}
                          variant="outline"
                          className="justify-start"
                          disabled={player.id === playerId}
                        >
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {room.state === 'results' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Round Results</h3>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-center">
                        The Chameleon was{" "}
                        <span className="font-bold text-primary">
                          {room.players.find(p => p.id === room.chameleon_id)?.name}
                        </span>
                      </p>
                      <p className="text-center mt-2">
                        The secret word was{" "}
                        <span className="font-bold text-primary">{room.secret_word}</span>
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Player List */}
            <div>
              <Card className="p-6 h-full bg-background/50 backdrop-blur-sm">
                <h3 className="text-xl font-semibold mb-4">Players</h3>
                <div className="space-y-2">
                  {room.players.map(player => (
                    <div 
                      key={player.id}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        player.id === playerId ? 'bg-primary/10' : 'bg-background/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      {player.isHost && (
                        <span className="text-xs text-muted-foreground">Host</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};