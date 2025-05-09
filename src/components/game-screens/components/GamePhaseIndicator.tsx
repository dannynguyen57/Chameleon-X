import { GameRoom, GameState } from "@/lib/types";

interface GamePhaseIndicatorProps {
  room: GameRoom;
}

const GamePhaseIndicator: React.FC<GamePhaseIndicatorProps> = ({ room }) => {
  const getPhaseColor = (state: GameState) => {
    switch (state) {
      case GameState.Presenting:
        return "bg-blue-500";
      case GameState.Discussion:
        return "bg-yellow-500";
      case GameState.Voting:
        return "bg-purple-500";
      case GameState.Results:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPhaseText = (state: GameState) => {
    switch (state) {
      case GameState.Presenting:
        return "Presenting Phase";
      case GameState.Discussion:
        return "Discussion Phase";
      case GameState.Voting:
        return "Voting Phase";
      case GameState.Results:
        return "Results Phase";
      default:
        return "Unknown Phase";
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getPhaseColor(room.state)}`} />
      <span className="text-sm font-medium">{getPhaseText(room.state)}</span>
    </div>
  );
};

export default GamePhaseIndicator; 