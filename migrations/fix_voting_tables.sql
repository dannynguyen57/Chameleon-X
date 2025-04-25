-- Fix the incomplete trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure triggers are properly created
DROP TRIGGER IF EXISTS update_voting_rounds_timestamp ON public.voting_rounds;
CREATE TRIGGER update_voting_rounds_timestamp
    BEFORE UPDATE ON public.voting_rounds
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_round_results_timestamp ON public.round_results;
CREATE TRIGGER update_round_results_timestamp
    BEFORE UPDATE ON public.round_results
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Add foreign key columns to game_rooms
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS current_voting_round_id UUID REFERENCES public.voting_rounds(id) ON DELETE SET NULL;

-- Create view to make easier for queries
CREATE OR REPLACE VIEW public.active_voting_rounds AS
SELECT 
    vr.*,
    (SELECT COUNT(*) FROM public.votes v WHERE v.round_id = vr.id) as votes_count,
    (SELECT json_agg(row_to_json(v)) FROM public.votes v WHERE v.round_id = vr.id) as votes,
    (SELECT row_to_json(rr) FROM public.round_results rr WHERE rr.round_id = vr.id) as round_result
FROM 
    public.voting_rounds vr
WHERE 
    vr.end_time IS NULL OR vr.end_time > (NOW() - INTERVAL '1 hour');

-- Add RLS policies
ALTER TABLE public.voting_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view voting rounds" ON public.voting_rounds
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert voting rounds" ON public.voting_rounds
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update voting rounds" ON public.voting_rounds
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can view votes" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert votes" ON public.votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view round results" ON public.round_results
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert round results" ON public.round_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update round results" ON public.round_results
    FOR UPDATE USING (true); 