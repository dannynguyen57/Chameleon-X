import { useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';

export const useGameSounds = () => {
  const { room } = useGame();
  const previousState = useRef(room?.state);
  const previousTurn = useRef(room?.current_turn);
  const soundsLoaded = useRef(false);
  const sounds = useRef<Record<string, HTMLAudioElement>>({});

  // Preload sounds
  useEffect(() => {
    if (soundsLoaded.current) return;

    const soundFiles = {
      'game-start': '/sounds/game-start.mp3',
      'category-reveal': '/sounds/category-reveal.mp3',
      'turn-change': '/sounds/turn-change.mp3',
      'vote-start': '/sounds/vote-start.mp3',
      'game-end': '/sounds/game-end.mp3'
    };

    // Load sounds silently
    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = 0.5;
      sounds.current[key] = audio;
    });

    soundsLoaded.current = true;

    // Cleanup
    return () => {
      Object.values(sounds.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      sounds.current = {};
      soundsLoaded.current = false;
    };
  }, []);

  // Handle state changes
  useEffect(() => {
    if (!room) return;

    const playSound = (soundName: string) => {
      const audio = sounds.current[soundName];
      if (!audio) return;

      // Reset and play
      audio.currentTime = 0;
      const playPromise = audio.play();
      
      if (playPromise) {
        playPromise.catch(error => {
          if (error.name !== 'NotSupportedError') {
            console.error(`Failed to play sound ${soundName}:`, error);
          }
        });
      }
    };

    // Only play sounds if the state has actually changed
    if (previousState.current !== room.state) {
      switch (room.state) {
        case 'selecting':
          playSound('game-start');
          break;
        case 'presenting':
          playSound('category-reveal');
          break;
        case 'voting':
          playSound('vote-start');
          break;
        case 'results':
          playSound('game-end');
          break;
      }
      previousState.current = room.state;
    }

    // Handle turn changes
    if (previousTurn.current !== room.current_turn && room.state === 'presenting') {
      playSound('turn-change');
      previousTurn.current = room.current_turn;
    }
  }, [room]);
}; 