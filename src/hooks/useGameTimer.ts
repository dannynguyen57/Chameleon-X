import { useEffect, useState, useRef } from 'react';
import { GameContext } from '../contexts/gameContext';
import { useContext } from 'react';
import { supabase } from '../integrations/supabase/client';
import { GamePhase, GameRoom, Player, GameState } from '../lib/types';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function useGameTimer() {
  const { room, playerId } = useContext(GameContext);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timeLeftRef = useRef<number | null>(null);
  const isActiveRef = useRef<boolean>(false);

  // Update refs when state changes
  useEffect(() => {
    timeLeftRef.current = timeLeft;
    isActiveRef.current = isActive;
  }, [timeLeft, isActive]);

  // Handle presenting phase timer
  useEffect(() => {
    if (!room || !playerId || room.state !== GameState.Presenting) {
      return;
    }

    // Initialize turn timer if not set
    const initializeTurnTimer = async () => {
      if (!room.timer) {
        const turnTimer = room.settings.time_per_round;
        const turnStartedAt = new Date().toISOString();
        
        await supabase
          .from('players')
          .update({
            timer: turnTimer,
            turn_started_at: turnStartedAt,
          })
          .eq('id', playerId);

        setTimeLeft(turnTimer);
        setIsActive(true);
      } else {
        setTimeLeft(room.timer);
        setIsActive(room.timer > 0);
      }
    };

    initializeTurnTimer();

    const interval = setInterval(async () => {
      if (!isActiveRef.current || !timeLeftRef.current) return;

      const newTimeLeft = timeLeftRef.current - 1;
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        setIsActive(false);
        clearInterval(interval);

        await supabase
          .from('players')
          .update({
            timer: 0,
          })
          .eq('id', playerId);
      } else {
        await supabase
          .from('players')
          .update({
            timer: newTimeLeft,
          })
          .eq('id', playerId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room, playerId]);

  // Handle discussion phase timer
  useEffect(() => {
    if (!room || room.state !== GameState.Discussion) {
      return;
    }

    const initializeDiscussionTimer = async () => {
      if (!room.discussion_timer) {
        const discussionTimer = room.settings.discussion_time;
        
        await supabase
          .from('game_rooms')
          .update({
            discussion_timer: discussionTimer,
          })
          .eq('id', room.id);

        setTimeLeft(discussionTimer);
        setIsActive(true);
      } else {
        setTimeLeft(room.discussion_timer);
        setIsActive(room.discussion_timer > 0);
      }
    };

    initializeDiscussionTimer();

    const interval = setInterval(async () => {
      if (!isActiveRef.current || !timeLeftRef.current) return;

      const newTimeLeft = timeLeftRef.current - 1;
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        setIsActive(false);
        clearInterval(interval);

        await supabase
          .from('game_rooms')
          .update({
            discussion_timer: 0,
          })
          .eq('id', room.id);
      } else {
        await supabase
          .from('game_rooms')
          .update({
            discussion_timer: newTimeLeft,
          })
          .eq('id', room.id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  // Handle voting phase timer
  useEffect(() => {
    if (!room || room.state !== GameState.Voting) {
      return;
    }

    const initializeVotingTimer = async () => {
      if (!room.voting_timer) {
        const votingTimer = room.settings.voting_time;
        
        await supabase
          .from('game_rooms')
          .update({
            voting_timer: votingTimer,
          })
          .eq('id', room.id);

        setTimeLeft(votingTimer);
        setIsActive(true);
      } else {
        setTimeLeft(room.voting_timer);
        setIsActive(room.voting_timer > 0);
      }
    };

    initializeVotingTimer();

    const interval = setInterval(async () => {
      if (!isActiveRef.current || !timeLeftRef.current) return;

      const newTimeLeft = timeLeftRef.current - 1;
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        setIsActive(false);
        clearInterval(interval);

        await supabase
          .from('game_rooms')
          .update({
            voting_timer: 0,
          })
          .eq('id', room.id);
      } else {
        await supabase
          .from('game_rooms')
          .update({
            voting_timer: newTimeLeft,
          })
          .eq('id', room.id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  return {
    timeLeft: timeLeft || 0,
    isActive,
    formattedTime: timeLeft ? formatTime(timeLeft) : '0:00',
    startTimer: (duration: number) => {
      setTimeLeft(duration);
      setIsActive(true);
    },
    stopTimer: () => {
      setIsActive(false);
    },
    resetTimer: (duration: number) => {
      setTimeLeft(duration);
      setIsActive(false);
    },
    formatTime
  };
}
