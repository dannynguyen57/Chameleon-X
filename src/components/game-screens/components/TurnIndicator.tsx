import { motion } from "framer-motion";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface TurnIndicatorProps {
  isCurrentTurn: boolean;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({ isCurrentTurn }) => (
  <motion.div
    className={cn(
      "absolute top-0 right-0 p-1 rounded-bl-lg",
      isCurrentTurn ? "bg-primary" : "bg-muted"
    )}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.2 }}
  >
    <Timer className="w-4 h-4 text-primary-foreground" />
  </motion.div>
);

export default TurnIndicator; 