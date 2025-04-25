-- Remove old voting-related columns from game_rooms
ALTER TABLE public.game_rooms
DROP COLUMN IF EXISTS votes_tally,
DROP COLUMN IF EXISTS votes,
DROP COLUMN IF EXISTS voted_out_player,
DROP COLUMN IF EXISTS revealed_player_id,
DROP COLUMN IF EXISTS revealed_role,
DROP COLUMN IF EXISTS round_outcome;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_game_room_timestamp ON public.game_rooms;
DROP FUNCTION IF EXISTS update_game_room_timestamp(); 