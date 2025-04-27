-- Create stored procedure for submitting votes
CREATE OR REPLACE FUNCTION submit_vote(
    p_round_id UUID,
    p_voter_id VARCHAR,
    p_target_id VARCHAR,
    p_room_id VARCHAR
) RETURNS void AS $$
BEGIN
    -- Insert vote
    INSERT INTO votes (
        round_id,
        voter_id,
        target_id,
        created_at
    ) VALUES (
        p_round_id,
        p_voter_id,
        p_target_id,
        now()
    );

    -- Update player's vote status
    UPDATE players
    SET vote = p_target_id,
        last_updated = now()
    WHERE id = p_voter_id
    AND room_id = p_room_id;
END;
$$ LANGUAGE plpgsql;

-- Create stored procedure for processing voting results
CREATE OR REPLACE FUNCTION process_voting_results(
    p_room_id VARCHAR,
    p_voting_round_id UUID
) RETURNS void AS $$
DECLARE
    v_max_votes INTEGER;
    v_voted_out_player VARCHAR;
    v_revealed_role VARCHAR;
    v_is_chameleon BOOLEAN;
    v_is_jester BOOLEAN;
    v_is_last_round BOOLEAN;
    v_outcome VARCHAR;
    v_next_state VARCHAR;
    v_round_number INTEGER;
BEGIN
    -- Get current round number
    SELECT round INTO v_round_number
    FROM game_rooms
    WHERE id = p_room_id;

    -- Calculate vote counts and find player with most votes
    WITH vote_counts AS (
        SELECT target_id, COUNT(*) as vote_count
        FROM votes
        WHERE round_id = p_voting_round_id
        GROUP BY target_id
    ),
    max_votes AS (
        SELECT MAX(vote_count) as max_count
        FROM vote_counts
    )
    SELECT vc.target_id INTO v_voted_out_player
    FROM vote_counts vc, max_votes mv
    WHERE vc.vote_count = mv.max_count
    LIMIT 1;

    -- Get voted player's role
    SELECT role INTO v_revealed_role
    FROM players
    WHERE id = v_voted_out_player;

    -- Determine outcome
    v_is_chameleon := (v_revealed_role = 'chameleon');
    v_is_jester := (v_revealed_role = 'jester');
    
    -- Check if last round
    SELECT (round >= max_rounds) INTO v_is_last_round
    FROM game_rooms
    WHERE id = p_room_id;

    -- Set outcome
    IF v_voted_out_player IS NULL THEN
        v_outcome := 'tie';
    ELSIF v_is_chameleon THEN
        v_outcome := 'chameleon_found';
    ELSE
        v_outcome := 'chameleon_survived';
    END IF;

    -- Create round result
    INSERT INTO round_results (
        round_id,
        voted_out_player_id,
        revealed_role,
        outcome,
        created_at,
        updated_at
    ) VALUES (
        p_voting_round_id,
        v_voted_out_player,
        v_revealed_role,
        v_outcome,
        now(),
        now()
    );

    -- Update voting round
    UPDATE voting_rounds
    SET phase = 'results',
        end_time = now(),
        updated_at = now()
    WHERE id = p_voting_round_id;

    -- Mark voted out player as spectator
    IF v_voted_out_player IS NOT NULL THEN
        UPDATE players
        SET is_spectator = true,
            last_updated = now()
        WHERE id = v_voted_out_player;
    END IF;

    -- Determine next state and update room
    IF v_is_chameleon OR v_is_jester OR v_is_last_round THEN
        v_next_state := 'results';
    ELSE
        v_next_state := 'presenting';
        v_round_number := v_round_number + 1;
    END IF;

    -- Update game room
    UPDATE game_rooms
    SET state = v_next_state,
        round = v_round_number,
        voted_out_player = v_voted_out_player,
        revealed_role = v_revealed_role,
        last_updated = now(),
        updated_at = now()
    WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql; 