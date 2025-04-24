-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_room_id ON public.chat_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_room_round ON public.chat_sessions(room_id, round);

-- Enable realtime on the table
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;

-- Set up permissions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon users
CREATE POLICY "Allow anyone to select chat_sessions" 
  ON public.chat_sessions 
  FOR SELECT USING (true);

CREATE POLICY "Allow anyone to insert chat_sessions" 
  ON public.chat_sessions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anyone to update chat_sessions" 
  ON public.chat_sessions 
  FOR UPDATE USING (true);

-- Set up triggers to update the updated_at field
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_session_timestamp
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_updated_at(); 