-- Create voting_rounds table
CREATE TABLE IF NOT EXISTS public.voting_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    phase VARCHAR NOT NULL CHECK (phase IN ('discussion', 'voting', 'results')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, round_number)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.voting_rounds(id) ON DELETE CASCADE,
    voter_id VARCHAR NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    target_id VARCHAR NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(round_id, voter_id)
);

-- Create round_results table
CREATE TABLE IF NOT EXISTS public.round_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.voting_rounds(id) ON DELETE CASCADE,
    voted_out_player_id VARCHAR REFERENCES public.players(id) ON DELETE SET NULL,
    revealed_role VARCHAR,
    outcome VARCHAR NOT NULL CHECK (outcome IN ('chameleon_found', 'chameleon_survived', 'tie')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voting_rounds_room_id ON public.voting_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_votes_round_id ON public.votes(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON public.votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_target_id ON public.votes(target_id);
CREATE INDEX IF NOT EXISTS idx_round_results_round_id ON public.round_results(round_id);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voting_rounds_timestamp
    BEFORE UPDATE ON public.voting_rounds
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_round_results_timestamp
    BEFORE UPDATE ON public.round_results
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp(); 