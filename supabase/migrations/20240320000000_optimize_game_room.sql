-- Function to create a game room with proper locking
CREATE OR REPLACE FUNCTION create_game_room(
  p_room_id TEXT,
  p_host_id TEXT,
  p_player_name TEXT,
  p_settings JSONB
) RETURNS TEXT AS $$
DECLARE
  v_room_id TEXT;
BEGIN
  -- Create room with proper settings
  INSERT INTO game_rooms (
    id,
    host_id,
    state,
    max_rounds,
    discussion_time,
    game_mode,
    max_players,
    team_size,
    chaos_mode,
    time_per_round,
    voting_time,
    settings,
    last_updated
  ) VALUES (
    p_room_id,
    p_host_id,
    'lobby',
    (p_settings->>'max_rounds')::INTEGER,
    (p_settings->>'discussion_time')::INTEGER,
    p_settings->>'game_mode',
    (p_settings->>'max_players')::INTEGER,
    COALESCE((p_settings->>'team_size')::INTEGER, 2),
    COALESCE((p_settings->>'chaos_mode')::BOOLEAN, false),
    COALESCE((p_settings->>'time_per_round')::INTEGER, 60),
    COALESCE((p_settings->>'voting_time')::INTEGER, 30),
    p_settings,
    NOW()
  )
  RETURNING id INTO v_room_id;

  -- Add host as first player
  INSERT INTO players (
    id,
    room_id,
    name,
    is_host,
    last_active
  ) VALUES (
    p_host_id,
    v_room_id,
    p_player_name,
    true,
    NOW()
  );

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a game room with proper locking
CREATE OR REPLACE FUNCTION join_game_room(
  p_room_id TEXT,
  p_player_id TEXT,
  p_player_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_room_exists BOOLEAN;
  v_player_exists BOOLEAN;
  v_room_full BOOLEAN;
  v_max_players INTEGER;
  v_current_players INTEGER;
BEGIN
  -- Check if room exists and is in lobby state
  SELECT EXISTS (
    SELECT 1 FROM game_rooms 
    WHERE id = p_room_id AND state = 'lobby'
  ) INTO v_room_exists;

  IF NOT v_room_exists THEN
    RAISE EXCEPTION 'Room not found or not in lobby state';
  END IF;

  -- Check if player already exists
  SELECT EXISTS (
    SELECT 1 FROM players 
    WHERE room_id = p_room_id AND name = p_player_name
  ) INTO v_player_exists;

  IF v_player_exists THEN
    RAISE EXCEPTION 'Player name already taken';
  END IF;

  -- Check if room is full
  SELECT max_players INTO v_max_players
  FROM game_rooms
  WHERE id = p_room_id;

  SELECT COUNT(*) INTO v_current_players
  FROM players
  WHERE room_id = p_room_id;

  IF v_current_players >= v_max_players THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  -- Add player to room
  INSERT INTO players (
    id,
    room_id,
    name,
    is_host,
    last_active
  ) VALUES (
    p_player_id,
    p_room_id,
    p_player_name,
    false,
    NOW()
  );

  -- Update room's last_updated timestamp
  UPDATE game_rooms
  SET last_updated = NOW()
  WHERE id = p_room_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster room lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_state ON game_rooms(state);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_last_active ON players(last_active);

-- Add trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_rooms_last_updated
BEFORE UPDATE ON game_rooms
FOR EACH ROW
EXECUTE FUNCTION update_last_updated();

CREATE TRIGGER update_players_last_updated
BEFORE UPDATE ON players
FOR EACH ROW
EXECUTE FUNCTION update_last_updated(); 