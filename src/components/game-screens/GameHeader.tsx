import { GameRoom, WordCategory } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface GameHeaderProps {
  room: GameRoom;
  category: WordCategory;
  isPlayerChameleon: boolean;
}

export default function GameHeader({ room, category, isPlayerChameleon }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{category}</Badge>
        {isPlayerChameleon && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Chameleon
          </Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        Round {room.round}
      </div>
    </div>
  );
} 