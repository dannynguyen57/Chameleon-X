import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

export const GameAnimations = () => {
  const { room } = useGame();

  if (!room) return null;

  return (
    <div className="relative">
      {room.state === 'selecting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-primary/10 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">Selecting Category</h2>
            <p className="text-muted-foreground">Host is choosing a category...</p>
          </div>
        </motion.div>
      )}

      {room.state === 'voting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-primary/10 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">Voting Time!</h2>
            <p className="text-muted-foreground">Vote for who you think is the Chameleon</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}; 