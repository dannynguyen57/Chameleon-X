import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, GameState, Player } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowDown } from "lucide-react";

export default function ChatSystem() {
  const { room, playerId } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHint, setIsHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastMessageRef = useRef<ChatMessage | null>(null);

  const truncateName = useCallback((name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  }, []);

  // Optimized scroll handling with debounce
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Memoized scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Optimized message sending
  const handleSendMessage = useCallback(async () => {
    if (!room || !newMessage.trim()) return;

    const currentPlayer = room.players.find((p: Player) => p.id === playerId);
    if (!currentPlayer) return;

    try {
      const messageData = {
        room_id: room.id,
        player_id: playerId,
        player_name: currentPlayer.name,
        content: newMessage,
        is_hint: isHint,
        created_at: new Date().toISOString()
      };

      // Optimistic update
      const optimisticMessage = {
        ...messageData,
        id: Date.now().toString(), // Temporary ID for optimistic update
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setIsHint(false);
      scrollToBottom();

      // Send to server
      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (error) {
        // Revert optimistic update on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        throw error;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [room, playerId, newMessage, isHint, scrollToBottom]);

  // Optimized message loading with pagination
  useEffect(() => {
    if (!room) return;

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
      setTimeout(scrollToBottom, 100);
    };

    loadMessages();

    // Optimized subscription with message deduplication
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
          const newMessage = payload.new as ChatMessage;
          
          // Deduplicate messages
          if (lastMessageRef.current?.id === newMessage.id) return;
          lastMessageRef.current = newMessage;

          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          if (!showScrollButton) {
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [room, scrollToBottom, showScrollButton]);

  const isChatDisabled = room?.state === GameState.Voting;

  // Memoized message list to prevent unnecessary re-renders
  const messageList = useMemo(() => (
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
            <div className="flex items-start gap-3">
              <Avatar className="flex-shrink-0">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.player_name}`} />
                <AvatarFallback>{message.player_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate" title={message.player_name}>
                    {truncateName(message.player_name)}
                  </span>
                  {message.is_hint && (
                    <Badge variant="outline" className="flex-shrink-0">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Hint
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{message.content}</p>
              </div>
              <span className="text-xs text-muted-foreground self-end">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  ), [messages, playerId, truncateName]);

  return (
    <div className="flex flex-col h-[600px] relative">
      <ScrollArea 
        ref={scrollRef} 
        className="flex-1 p-4"
        onScroll={handleScroll}
      >
        {messageList}
      </ScrollArea>

      {showScrollButton && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-20 right-4 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

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