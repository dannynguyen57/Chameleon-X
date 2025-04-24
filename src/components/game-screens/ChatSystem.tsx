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
import { toast } from "@/components/ui/use-toast";
import { RealtimeChannel } from '@supabase/supabase-js';

export default function ChatSystem() {
  const { room, playerId } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHint, setIsHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastMessageRef = useRef<ChatMessage | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  // Handle chat message update
  const addMessage = useCallback((newMessage: ChatMessage) => {
    if (!newMessage || !newMessage.id) return;
    
    // Deduplicate messages
    if (lastMessageRef.current?.id === newMessage.id) {
      console.log('Duplicate message, ignoring:', newMessage.id);
      return;
    }
    
    lastMessageRef.current = newMessage;
    
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(m => m.id === newMessage.id)) {
        console.log('Message already exists, ignoring:', newMessage.id);
        return prev;
      }
      console.log('Adding new message to UI:', newMessage);
      return [...prev, newMessage];
    });
    
    // Auto-scroll to bottom for new messages
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  // Load chat messages
  useEffect(() => {
    if (!room) return;
    
    console.log('Loading messages for room:', room.id);
    
    // Clean up previous channel
    if (channelRef.current) {
      console.log('Cleaning up previous chat channel');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const loadMessages = async () => {
      console.log('Fetching existing chat messages...');
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

      console.log('Loaded messages from DB:', data?.length || 0);
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    };

    loadMessages();

    // Create a new channel for this room's chat
    const channel = supabase
      .channel(`chat:${room.id}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('New message received from postgres:', payload);
          const newMessage = payload.new as ChatMessage;
          addMessage(newMessage);
        }
      )
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (payload.payload?.action === 'chat_message') {
          console.log('Broadcast chat message received:', payload);
          const newMessage = payload.payload.message as ChatMessage;
          addMessage(newMessage);
        }
      })
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat messages');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up chat subscription');
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [room, addMessage]);

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
        id: 'temp-' + Date.now().toString(), // Temporary ID for optimistic update
      };
      
      // Add optimistic message
      console.log('Adding optimistic message:', optimisticMessage);
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setIsHint(false);
      scrollToBottom();

      // Send to server
      console.log('Sending message to server:', messageData);
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Revert optimistic update on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        throw error;
      }

      console.log('Message saved, received response:', data);
      
      // Update the optimistic message with the real one
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== optimisticMessage.id);
        return [...filtered, data];
      });

      // Broadcast the message
      console.log('Broadcasting message to all clients');
      await Promise.all([
        supabase.channel(`room:${room.id}`).send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            action: 'chat_message',
            message: data
          }
        }),
        supabase.channel(`chat:${room.id}`).send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            action: 'chat_message',
            message: data
          }
        }),
        supabase.channel('public_rooms').send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            action: 'chat_message',
            message: data
          }
        })
      ]);
      
      console.log('Message broadcast complete');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
    }
  }, [room, playerId, newMessage, isHint, scrollToBottom]);

  const isChatDisabled = room?.state === GameState.Voting;

  // Debugging output
  useEffect(() => {
    console.log('Current messages in state:', messages.length);
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] relative">
      <ScrollArea 
        ref={scrollRef} 
        className="flex-1 p-4"
        onScroll={handleScroll}
      >
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