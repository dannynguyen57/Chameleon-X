-- Create a function to start the game
CREATE OR REPLACE FUNCTION start_game(room_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update game room state
  UPDATE game_rooms
  SET 
    state = 'category_selection',
    round = 1,
    category = NULL,
    secret_word = NULL,
    chameleon_id = NULL,
    timer = NULL
  WHERE id = room_id;

  -- Reset all player votes
  UPDATE players
  SET vote = NULL
  WHERE room_id = room_id;
END;
$$; 