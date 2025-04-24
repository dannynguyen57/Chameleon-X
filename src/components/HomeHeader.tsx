import { motion } from "framer-motion";
import { Gamepad2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeHeaderProps {
  onSwitchTab?: (tab: string) => void;
}

export default function HomeHeader({ onSwitchTab }: HomeHeaderProps) {
  const scrollToHowToPlay = () => {
    const howToPlaySection = document.getElementById('how-to-play');
    if (howToPlaySection) {
      howToPlaySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      className="w-full bg-gradient-to-r from-green-900/50 to-teal-900/50 border-b border-green-500/20 shadow-lg sticky top-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
              <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">Chameleon X</h1>
          </div>
          
          <Button
            variant="ghost"
            className="text-green-200 hover:text-green-100 hover:bg-green-500/20 px-3 sm:px-4 py-2 h-auto"
            onClick={scrollToHowToPlay}
          >
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
            <span className="text-sm sm:text-base">How to Play</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
} 