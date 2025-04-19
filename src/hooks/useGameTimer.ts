import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useGameTimer = (
  roomId: string | undefined,
  timer: number | undefined,
  gameState: string | undefined
) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    let timerId: number | undefined;
    
    if (timer && timer > 0 && (gameState === 'presenting' || gameState === 'voting')) {
      setRemainingTime(timer);
      timerId = window.setInterval(async () => {
        const newTime = remainingTime ? remainingTime - 1 : timer - 1;
        setRemainingTime(newTime);
        
        if (newTime <= 0) {
          // Time's up, move to next phase
          if (gameState === 'presenting') {
            await supabase
              .from('game_rooms')
              .update({ state: 'voting', timer: 30 }) // Set voting time
              .eq('id', roomId);
          } else if (gameState === 'voting') {
            await supabase
              .from('game_rooms')
              .update({ state: 'results' })
              .eq('id', roomId);
          }
          clearInterval(timerId);
        } else {
          // Update timer in database
          const { error } = await supabase
            .from('game_rooms')
            .update({ timer: newTime })
            .eq('id', roomId);

          if (error) {
            console.error('Error updating timer:', error);
          }
        }
      }, 1000);
    } else {
      setRemainingTime(null);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [timer, gameState, roomId, remainingTime]);

  return remainingTime;
};
