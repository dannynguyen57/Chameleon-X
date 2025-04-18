
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
    
    if (timer && timer > 0 && gameState === 'presenting') {
      setRemainingTime(timer);
      timerId = window.setInterval(async () => {
        const { error } = await supabase
          .from('game_rooms')
          .update({ timer: timer - 1 })
          .eq('id', roomId);

        if (error) {
          console.error('Error updating timer:', error);
        }
      }, 1000);
    } else {
      setRemainingTime(null);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [timer, gameState, roomId]);

  return remainingTime;
};
