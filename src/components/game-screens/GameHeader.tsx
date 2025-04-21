import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GameRoom } from "@/lib/types";
import { WordCategory } from "@/lib/word-categories";
import { RoleTheme } from "@/lib/roleThemes";
import { motion } from "framer-motion";
import { Gamepad2, Crown, Shield, Timer } from "lucide-react";

interface GameHeaderProps {
  room: GameRoom;
  category: WordCategory | null;
  roleTheme: RoleTheme;
  isPlayerChameleon: boolean;
}

export default function GameHeader({ room, category, roleTheme, isPlayerChameleon }: GameHeaderProps) {
  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  {category?.name || "Not selected"}
                </span>
                {category?.emoji && (
                  <span className="text-2xl sm:text-3xl">{category.emoji}</span>
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground text-center sm:text-left">
                {category?.description || "Select a category to begin"}
              </p>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-medium">
                  {room.secret_word}
                </span>
                <Badge 
                  variant={isPlayerChameleon ? "destructive" : "default"}
                  className="text-xs sm:text-sm"
                >
                  {isPlayerChameleon ? "You are the Chameleon!" : "Regular Player"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                {isPlayerChameleon 
                  ? "Try to blend in with other players' descriptions" 
                  : "Describe the word without saying it directly"}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
} 