-- Add is_spectator column to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS is_spectator BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_is_spectator ON public.players(is_spectator);

-- Add trigger to update last_updated when is_spectator changes
CREATE OR REPLACE FUNCTION update_player_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_timestamp
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION update_player_timestamp(); 