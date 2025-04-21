import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';

interface GameTimerProps {
  remainingTime: number;
}

const GameTimer: React.FC<GameTimerProps> = React.memo(({ remainingTime }) => {
  const debouncedTime = useDebounce(remainingTime, 100);
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = timerRef.current;
    if (!timer) return;

    // Add animation class when time is running low
    if (debouncedTime <= 10) {
      timer.classList.add('animate-pulse');
    } else {
      timer.classList.remove('animate-pulse');
    }

    return () => {
      timer.classList.remove('animate-pulse');
    };
  }, [debouncedTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={timerRef} className="fixed top-4 right-4 z-50">
      <Badge 
        variant={debouncedTime <= 10 ? "destructive" : "default"}
        className="text-lg px-4 py-2"
      >
        {formatTime(debouncedTime)}
      </Badge>
    </div>
  );
});

GameTimer.displayName = 'GameTimer';

export default GameTimer; 