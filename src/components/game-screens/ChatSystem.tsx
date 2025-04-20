import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContextProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, GameState } from '@/lib/types';

export default function ChatSystem() {
  const { room, playerId } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHint, setIsHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageQueue = useRef<ChatMessage[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout>();

  const processMessageQueue = useCallback(() => {
    if (messageQueue.current.length > 0) {
      setMessages(prev => [...prev, ...messageQueue.current]);
      messageQueue.current = [];
    }
  }, []);

  useEffect(() => {
    if (!room) return;

    // Subscribe to chat messages with optimized handling
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          messageQueue.current.push(payload.new as ChatMessage);
          
          // Clear existing timeout
          if (batchTimeout.current) {
            clearTimeout(batchTimeout.current);
          }
          
          // Set new timeout for batching
          batchTimeout.current = setTimeout(processMessageQueue, 100);
        }
      )
      .subscribe();

    // Load existing messages with pagination
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    };

    loadMessages();

    return () => {
      channel.unsubscribe();
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, [room, processMessageQueue]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!room || !newMessage.trim()) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: room.id,
        player_id: playerId,
        player_name: room.players.find(p => p.id === playerId)?.name || 'Unknown',
        content: newMessage,
        is_hint: isHint,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
    setIsHint(false);
  };

  const isChatDisabled = room?.state === GameState.Voting;

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.player_id === playerId ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.player_id === playerId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{message.player_name}</span>
                  {message.is_hint && (
                    <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                      Hint
                    </span>
                  )}
                </div>
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        {isChatDisabled ? (
          <div className="text-center text-muted-foreground">
            Chat is disabled during voting phase
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="is-hint"
                checked={isHint}
                onCheckedChange={(checked) => setIsHint(checked as boolean)}
              />
              <label htmlFor="is-hint" className="text-sm">
                Mark as hint
              </label>
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 