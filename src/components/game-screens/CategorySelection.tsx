import { useState, useEffect } from "react";
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { categories } from "@/lib/word-categories";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, Loader2, Layers } from "lucide-react";

export default function CategorySelection() {
  const { selectCategory, room, playerId } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  
  useEffect(() => {
    // Removed console logs for cleaner output
  }, [room, playerId]);

  if (!room) {
    return null; // Or a loading indicator
  }
  
  const isHost = playerId === room.host_id;
  const canSelectCategory = isHost && !!selectedCategory;
  
  const handleCategorySelect = (categoryName: string) => {
    if (isHost) {
      setSelectedCategory(categoryName);
    }
  };
  
  const handleConfirm = async () => {
    if (selectedCategory && isHost) {
      setIsConfirming(true);
      const category = categories.find(c => c.name === selectedCategory);
      if (category) {
        try {
          await selectCategory(category);
          // Selection successful, component will likely unmount or state will change
        } catch (error) { 
          console.error('Error selecting category:', error);
          // Optionally show an error toast
          setIsConfirming(false); // Reset confirming state on error
        }
      } else {
        setIsConfirming(false); // Category not found
      }
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <Card className="border-2 border-purple-500/20 shadow-xl bg-green-950/70 backdrop-blur-lg overflow-hidden">
        <CardHeader className="p-4 sm:p-6 bg-gradient-to-b from-purple-900/30 to-transparent border-b border-purple-500/10">
          <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2 text-purple-200">
            <Layers className="h-6 w-6 text-purple-300" />
            {isHost ? "Choose the Topic" : "Waiting for Topic Selection"}
          </CardTitle>
          <CardDescription className="text-purple-300/80 pt-1">
            {isHost 
              ? "Select the category for this round's secret word."
              : `Waiting for ${room.players.find(p => p.id === room.host_id)?.name || 'the host'} to choose...`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isHost ? (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square"
                >
                  <Button
                    variant="outline"
                    className={cn(
                      `w-full h-full flex flex-col items-center justify-center p-2 transition-all duration-300 ease-in-out transform relative overflow-hidden rounded-lg`,
                      `border-2 bg-green-900/40 hover:bg-green-800/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-950 text-center`,
                      selectedCategory === category.name 
                      ? "border-purple-400 ring-2 ring-purple-400 ring-offset-2 ring-offset-green-950 scale-105 shadow-lg bg-gradient-to-br from-purple-600/30 to-purple-800/40"
                      : "border-green-700/50 hover:border-purple-500/70 hover:scale-[1.03]"
                    )}
                    onClick={() => handleCategorySelect(category.name)}
                  >
                    {/* Optional: Add a subtle background image/pattern per category */}
                    {/* <div className="absolute inset-0 bg-[url(...)] opacity-10 z-0"></div> */}
                    <span className="text-3xl xs:text-4xl sm:text-5xl mb-2 sm:mb-3 relative z-10">{category.emoji}</span>
                    <span className="text-sm xs:text-base sm:text-lg font-medium text-green-100 relative z-10 leading-tight">{category.name}</span>
                    {selectedCategory === category.name && (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-1.5 right-1.5 p-1 bg-purple-500 rounded-full shadow-md"
                      >
                        <CheckCircle className="h-3 w-3 sm:h-4 text-white" />
                      </motion.div>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 flex flex-col items-center justify-center bg-green-950/40 rounded-lg border border-green-800/30">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Layers className="h-16 w-16 text-purple-400/70 mb-4" />
              </motion.div>
              <p className="text-lg text-purple-200 font-medium">Topic selection in progress...</p>
              <p className="text-sm text-purple-300/80 mt-1">The host is deciding the fate of this round!</p>
              <Loader2 className="h-5 w-5 text-purple-300/70 animate-spin mt-4" />
            </div>
          )}
        </CardContent>
        {isHost && (
          <CardFooter className="p-4 sm:p-6 border-t border-purple-500/10 mt-4">
            <Button
              onClick={handleConfirm}
              disabled={!canSelectCategory || isConfirming}
              size="lg"
              className={cn(
                "w-full transition-all duration-300 ease-in-out transform",
                (!canSelectCategory || isConfirming)
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed shadow-inner"
                  : "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-bold shadow-lg hover:scale-105 active:scale-95"
              )}
            >
              {isConfirming ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              {isConfirming
                ? "Confirming..."
                : selectedCategory ? `Confirm: ${selectedCategory}` : "Select a Topic to Continue"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
