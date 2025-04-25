-- Add voted_out_player column to game_rooms table
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS voted_out_player VARCHAR REFERENCES public.players(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_voted_out_player ON public.game_rooms(voted_out_player);

-- Add trigger to update last_updated when voted_out_player changes
CREATE OR REPLACE FUNCTION update_game_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_room_timestamp
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_game_room_timestamp(); 