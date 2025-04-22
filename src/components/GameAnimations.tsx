import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";  

export const GameAnimations = () => {
  const { room } = useGame();
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [showCategoryAnimation, setShowCategoryAnimation] = useState(false);
  const [showVotingAnimation, setShowVotingAnimation] = useState(false);
  const [showResultsAnimation, setShowResultsAnimation] = useState(false);

  useEffect(() => {
    if (room?.state === 'presenting') {
      setShowStartAnimation(true);
      setTimeout(() => setShowStartAnimation(false), 3000);
    }
  }, [room?.state]);

  useEffect(() => {
    if (room?.category) {
      setShowCategoryAnimation(true);
    }
  }, [room?.category]);

  useEffect(() => {
    if (room?.state === 'voting') {
      setShowVotingAnimation(true);
      setTimeout(() => setShowVotingAnimation(false), 2000);
    }
  }, [room?.state]);

  useEffect(() => {
    if (room?.state === 'results') {
      setShowResultsAnimation(true);
      setTimeout(() => setShowResultsAnimation(false), 3000);
    }
  }, [room?.state]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {showStartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-6xl font-bold text-primary bg-blue-50/80 p-8 rounded-lg shadow-lg"
            >
              Game Started!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCategoryAnimation && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-4 left-1/2 -translate-x-1/2"
          >
            <motion.div
              className="text-4xl font-bold text-primary bg-blue-50/80 p-4 rounded-lg shadow-lg"
            >
              Category: {room?.category?.name}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVotingAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="text-4xl font-bold text-primary bg-blue-50/80 p-6 rounded-lg shadow-lg"
            >
              Time to Vote!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResultsAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="text-4xl font-bold text-primary bg-blue-50/80 p-6 rounded-lg shadow-lg"
            >
              Results Time!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {room?.state === 'presenting' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 right-4"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="text-2xl font-bold text-primary bg-blue-50/80 p-4 rounded-lg shadow-lg"
          >
            Time Remaining: {room?.timer}s
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}; 