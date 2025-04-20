import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Users, MessageSquare, Lightbulb, Vote } from "lucide-react";

export const GameTutorial = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  if (!visible) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
    >
      <Card className="max-w-2xl w-full bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white flex items-center justify-center gap-2">
            <span className="text-primary">Chameleon X</span>
            <span className="text-sm font-normal bg-gray-700/70 px-2 py-0.5 rounded-full">
              Game Guide
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="bg-blue-500/20 p-2 rounded-full">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              Game Objective
            </h3>
            <p className="text-white/80">
              In Chameleon X, players try to identify the Chameleon among them. The Chameleon must blend in without knowing the secret word.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="bg-green-500/20 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-green-400" />
              </div>
              Game Flow
            </h3>
            <div className="grid gap-2 text-white/80">
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                Everyone except the Chameleon sees the secret word
              </p>
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                Players take turns describing the word without saying it directly
              </p>
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                Discussion phase: analyze descriptions to find the Chameleon
              </p>
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                Vote for who you think is the Chameleon
              </p>
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">5</span>
                The Chameleon gets one chance to guess the word if caught
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="bg-amber-500/20 p-2 rounded-full">
                <Lightbulb className="h-5 w-5 text-amber-400" />
              </div>
              Special Roles
            </h3>
            <div className="grid grid-cols-2 gap-3 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🦎</span>
                <span><strong>Chameleon:</strong> Blend in without knowing the word</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎭</span>
                <span><strong>Mimic:</strong> Knows a similar but not exact word</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔮</span>
                <span><strong>Oracle:</strong> Can see the Chameleon's identity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <span><strong>Guardian:</strong> Can protect one player from votes</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="bg-red-500/20 p-2 rounded-full">
                <Vote className="h-5 w-5 text-red-400" />
              </div>
              Winning the Game
            </h3>
            <div className="grid gap-2 text-white/80">
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">•</span>
                <strong>Regular Players:</strong> Win by correctly identifying the Chameleon
              </p>
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">•</span>
                <strong>Chameleon:</strong> Wins by avoiding detection or correctly guessing the word if caught
              </p>
              <p className="flex items-center gap-2">
                <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">•</span>
                <strong>Jester:</strong> Wins by getting voted out instead of the Chameleon
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-primary to-purple-600 text-white">
            Got it!
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}; 