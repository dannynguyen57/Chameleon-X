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

// Chat session interface
interface ChatSession {
  id: string;
  room_id: string;
  round: number;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

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
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('CONNECTING');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent reconnection loops with a stabilizer
  const reconnectionCountRef = useRef(0);
  const lastCleanupTimeRef = useRef(0);
  const initializedRef = useRef(false);

  // Track last init time
  const lastInitTimeRef = useRef(0);

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

  // Find or create a chat session
  const initChatSession = useCallback(async () => {
    if (!room) return null;
    
    console.log('Initializing chat session for room:', room.id, 'round:', room.round);
    
    try {
      // Look for existing chat session
      const { data: existingSessions, error: findError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('room_id', room.id)
        .eq('round', room.round);
      
      if (findError) {
        console.error('Error finding chat session:', findError);
        return null;
      }
      
      // Take the first session found if multiple exist
      const existingSession = existingSessions && existingSessions.length > 0 ? existingSessions[0] : null;
      
      if (existingSession) {
        console.log('Found existing chat session:', existingSession.id);
        chatSessionRef.current = existingSession;
        setSessionId(existingSession.id);
        
        // Ensure we load the messages properly
        if (existingSession.messages && Array.isArray(existingSession.messages)) {
          console.log(`Setting ${existingSession.messages.length} messages from existing session`);
          setMessages(existingSession.messages);
          lastMessageCountRef.current = existingSession.messages.length;
          setTimeout(scrollToBottom, 100);
        } else {
          console.warn('Existing session has invalid messages format:', existingSession.messages);
          setMessages([]);
          lastMessageCountRef.current = 0;
        }
        
        // Mark as initialized for this room/round
        initializedRef.current = true;
        return existingSession;
      }
      
      // Check if we already have a session in progress (to avoid duplicates)
      if (chatSessionRef.current && chatSessionRef.current.room_id === room.id && chatSessionRef.current.round === room.round) {
        console.log('Using existing session reference:', chatSessionRef.current.id);
        initializedRef.current = true;
        return chatSessionRef.current;
      }
      
      // Create new chat session
      console.log('Creating new chat session');
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          room_id: room.id,
          round: room.round,
          messages: []
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating chat session:', createError);
        return null;
      }
      
      console.log('Created new chat session:', newSession.id);
      chatSessionRef.current = newSession;
      setSessionId(newSession.id);
      setMessages([]);
      lastMessageCountRef.current = 0;
      
      // Mark as initialized for this room/round
      initializedRef.current = true;
      
      // Broadcast to other clients that a new chat session was created
      if (roomChannelRef.current) {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            action: 'new_chat_session',
            sessionId: newSession.id,
            roomId: room.id,
            round: room.round
          }
        }).catch(err => console.error('Error broadcasting new chat session:', err));
      }
      
      return newSession;
    } catch (error) {
      console.error('Error initializing chat session:', error);
      return null;
    }
  }, [room, scrollToBottom]);

  // Subscribe to chat session changes with all dependencies properly listed
  useEffect(() => {
    // Derive stable values inside the effect
    const currentRoomId = room?.id;
    const currentRoomRound = room?.round;

    if (!currentRoomId || currentRoomRound === undefined) {
      console.log('ChatSystem: No room ID or round, skipping setup.');
      return; // Exit early if room ID or round is missing
    }
    
    // Prevent rapid reconnection cycles
    const now = Date.now();
    if (now - lastCleanupTimeRef.current < 1000) { // Less than 1 second since last cleanup
      reconnectionCountRef.current++;
      
      // If reconnecting too rapidly, delay the next attempt
      if (reconnectionCountRef.current > 3) {
        console.log(`Too many reconnection attempts (${reconnectionCountRef.current}), delaying...`);
        const delayTime = Math.min(reconnectionCountRef.current * 1000, 5000);
        
        // Force connection to avoid endless loading
        setTimeout(() => {
          console.log('Forced connection after delay');
          setSubscriptionStatus('CONNECTED');
          reconnectionCountRef.current = 0;
        }, delayTime);
        
        return;
      }
    } else {
      // Reset counter if enough time has passed
      reconnectionCountRef.current = 0;
    }
    
    // If already initialized for this room and round, don't reinitialize
    if (initializedRef.current && 
        chatSessionRef.current?.room_id === currentRoomId && 
        chatSessionRef.current?.round === currentRoomRound) {
      console.log('Chat already initialized for this room and round, skipping');
      return;
    }
    
    console.log('Setting up chat subscription for room:', currentRoomId, 'round:', currentRoomRound);
    setSubscriptionStatus('CONNECTING');
    
    // Clean up previous channels
    if (channelRef.current) {
      console.log('Cleaning up previous chat channel');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    if (roomChannelRef.current) {
      console.log('Cleaning up previous room channel');
      roomChannelRef.current.unsubscribe();
      roomChannelRef.current = null;
    }
    
    let isMounted = true;
    
    // Initialize room channel for cross-component communication
    const roomChannel = supabase
      .channel(`room:${currentRoomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (!isMounted) return;
        
        // Handle new chat messages
        if (payload.payload?.action === 'new_chat_message' && payload.payload.sessionId) {
          console.log('Room channel received chat message broadcast:', payload);
          
          // Fetch the latest messages from the database to ensure everyone sees the same data
          supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', payload.payload.sessionId)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching chat session after broadcast:', error);
                return;
              }
              
              if (data && isMounted) {
                console.log('Fetched updated chat session after broadcast:', data);
                chatSessionRef.current = data;
                setMessages(data.messages || []);
                setTimeout(scrollToBottom, 100);
              }
            });
        }
        
        // Handle new chat session created
        if (payload.payload?.action === 'new_chat_session' && 
            payload.payload.roomId === currentRoomId && 
            payload.payload.round === currentRoomRound) {
          console.log('New chat session created broadcast received:', payload);
          
          // Only update if we don't already have a session with the same details
          if (!chatSessionRef.current || 
              chatSessionRef.current.room_id !== currentRoomId || 
              chatSessionRef.current.round !== currentRoomRound) {
            console.log('Fetching new chat session with ID:', payload.payload.sessionId);
            
            supabase
              .from('chat_sessions')
              .select('*')
              .eq('id', payload.payload.sessionId)
              .single()
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error fetching new chat session:', error);
                  return;
                }
                
                if (data && isMounted) {
                  console.log('Fetched new chat session:', data);
                  
                  // Avoid setting the same session multiple times
                  if (!chatSessionRef.current || chatSessionRef.current.id !== data.id) {
                    chatSessionRef.current = data;
                    setSessionId(data.id);
                    setMessages(data.messages || []);
                    lastMessageCountRef.current = data.messages?.length || 0;
                    setTimeout(scrollToBottom, 100);
                  }
                }
              });
          } else {
            console.log('Ignoring new chat session broadcast - already have a session for this room/round');
          }
        }
      });
    
    roomChannel.subscribe((status) => {
      if (!isMounted) return;
      console.log('Room channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        roomChannelRef.current = roomChannel;
      }
    });
    
    // Initialize chat session
    initChatSession().then(session => {
      if (!session || !isMounted) return;
      
      // Add debounce to initialization
      const now = Date.now();
      if (now - lastInitTimeRef.current < 2000) {
        console.log('Debouncing chat session initialization');
        return;
      }
      lastInitTimeRef.current = now;
      
      // Use derived stable values for channel setup
      const sessionIdForChannel = session.id;
      console.log('Setting up realtime subscription for chat session:', sessionIdForChannel);
      
      // Create a new channel for chat session updates
      const channel = supabase
        .channel(`chat_session:${sessionIdForChannel}`, {
          config: {
            broadcast: { self: true },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
            filter: `id=eq.${sessionIdForChannel}`
          },
          (payload) => {
            if (!isMounted) return;
            console.log('Chat session updated:', payload);
            const updatedSession = payload.new as ChatSession;
            
            // Check if this is a newer update than what we have
            const currentTimestamp = chatSessionRef.current?.updated_at;
            const newTimestamp = updatedSession.updated_at;
            
            if (currentTimestamp && newTimestamp && new Date(currentTimestamp) >= new Date(newTimestamp)) {
              console.log('Ignoring older update:', { currentTimestamp, newTimestamp });
              return;
            }
            
            chatSessionRef.current = updatedSession;
            
            // Update messages
            if (updatedSession.messages) {
              console.log('Updating messages from session:', updatedSession.messages.length);
              setMessages(updatedSession.messages);
              setTimeout(scrollToBottom, 100);
            }
          }
        )
        .on('broadcast', { event: 'sync' }, (payload) => {
          if (!isMounted) return;
          if (payload.payload?.action === 'new_chat_message') {
            console.log('Broadcast new chat message received:', payload);
            const updatedMessages = payload.payload.messages as ChatMessage[];
            setMessages(updatedMessages);
            setTimeout(scrollToBottom, 100);
          }
        })
        .subscribe((status) => {
          if (!isMounted) return;
          console.log('Chat subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to chat session');
            setSubscriptionStatus('CONNECTED');
            
            // Fetch latest messages on successful subscription
            if (sessionIdForChannel) {
              supabase
                .from('chat_sessions')
                .select('*')
                .eq('id', sessionIdForChannel)
                .single()
                .then(({ data }) => {
                  if (data && isMounted) {
                    chatSessionRef.current = data as ChatSession;
                    setMessages(data.messages || []);
                    setTimeout(scrollToBottom, 100);
                  }
                });
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Chat subscription error');
            setSubscriptionStatus('DISCONNECTED');
          }
        });
      
      channelRef.current = channel;
    }).catch(error => {
      console.error('Error setting up chat session:', error);
      setSubscriptionStatus('DISCONNECTED');
    });
    
    return () => {
      console.log('Cleaning up chat subscription');
      lastCleanupTimeRef.current = Date.now();
      isMounted = false;
      // Don't change subscriptionStatus here, let the next run handle it if needed
      // setSubscriptionStatus('DISCONNECTED'); 
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (roomChannelRef.current) {
        roomChannelRef.current.unsubscribe();
        roomChannelRef.current = null;
      }
    };
  }, [room, initChatSession, scrollToBottom, subscriptionStatus]);

  // Move polling-related code to a separate useEffect to avoid circular dependencies
  useEffect(() => {
    let isMounted = true;
    
    // Polling function defined locally within this effect to avoid dependency issues
    const pollForMessages = () => {
      if (!chatSessionRef.current?.id || !sessionId) return;
      
      console.log('Polling for new messages...');
      supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
        .then(({ data, error }) => {
          if (!isMounted) return;
          
          if (error) {
            console.error('Error polling chat session:', error);
            return;
          }
          
          if (data && data.messages) {
            const newCount = data.messages.length;
            // Only update if we have new messages
            if (newCount > lastMessageCountRef.current) {
              console.log(`Polling found ${newCount - lastMessageCountRef.current} new messages`);
              chatSessionRef.current = data;
              setMessages(data.messages);
              lastMessageCountRef.current = newCount;
              setTimeout(scrollToBottom, 100);
            }
          }
        });
    };
    
    // Start polling if connected
    if (subscriptionStatus === 'CONNECTED' && sessionId) {
      console.log('Setting up message polling');
      pollingIntervalRef.current = setInterval(pollForMessages, 5000);
    }
    
    return () => {
      isMounted = false;
      if (pollingIntervalRef.current) {
        console.log('Cleaning up polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [subscriptionStatus, sessionId, scrollToBottom, room?.id, room?.round]);

  // Optimized message sending
  const handleSendMessage = useCallback(async () => {
    if (!room || !newMessage.trim() || !chatSessionRef.current) return;

    const currentPlayer = room.players.find((p: Player) => p.id === playerId);
    if (!currentPlayer) return;

    try {
      const now = new Date().toISOString();
      const newChatMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        room_id: room.id,
        player_id: playerId,
        player_name: currentPlayer.name,
        content: newMessage,
        is_hint: isHint,
        created_at: now
      };

      // Optimistic update
      console.log('Adding optimistic message:', newChatMessage);
      const updatedMessages = [...messages, newChatMessage];
      setMessages(updatedMessages);
      setNewMessage('');
      setIsHint(false);
      scrollToBottom();

      // Update chat session with new message
      console.log('Updating chat session with new message');
      const { data: updatedSession, error: updateError } = await supabase
        .from('chat_sessions')
        .update({ 
          messages: updatedMessages,
          updated_at: now
        })
        .eq('id', chatSessionRef.current.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating chat session:', updateError);
        // Revert optimistic update on error
        setMessages(messages);
        throw updateError;
      }

      // Update local reference
      if (updatedSession) {
        chatSessionRef.current = updatedSession;
      }

      // Force other clients to refresh their chat by broadcasting on the room channel
      console.log('Broadcasting message update to all clients');
      // Always broadcast through the room channel to ensure all clients receive it
      const broadcastPayload = {
        action: 'new_chat_message',
        sessionId: chatSessionRef.current?.id || '',
        timestamp: now,
        messages: updatedMessages
      };
        
      // Use both channels to maximize delivery chances
      try {
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'sync',
            payload: broadcastPayload
          });
        }
          
        // Always use the room channel as the primary broadcast method
        if (roomChannelRef.current) {
          await roomChannelRef.current.send({
            type: 'broadcast',
            event: 'sync',
            payload: broadcastPayload
          });
        } else {
          // Fallback to creating a temporary channel
          console.warn('Creating temporary room channel for broadcast');
          await supabase.channel(`room:${room.id}`).send({
            type: 'broadcast',
            event: 'sync',
            payload: broadcastPayload
          });
        }
          
        console.log('Message broadcast complete');
      } catch (broadcastError) {
        console.error('Error broadcasting message:', broadcastError);
        // If broadcasting fails, the database update still happened
        // Other clients will get the update on their next poll
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
    }
  }, [room, playerId, newMessage, isHint, messages, scrollToBottom]);

  const isChatDisabled = room?.state === GameState.Voting;

  // Debugging output
  useEffect(() => {
    console.log('Current messages in state:', messages.length);
  }, [messages]);

  // Track message count for polling
  useEffect(() => {
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Add a timeout to prevent endless connecting state
  useEffect(() => {
    // If we're connecting, set a timeout to force connected state after 5 seconds
    if (subscriptionStatus === 'CONNECTING') {
      connectionTimeoutRef.current = setTimeout(() => {
        console.log('Connection timeout, forcing CONNECTED state');
        setSubscriptionStatus('CONNECTED');
      }, 5000);
    }
    
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [subscriptionStatus]);

  // Clean up all resources when component unmounts
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (roomChannelRef.current) {
        roomChannelRef.current.unsubscribe();
        roomChannelRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-[600px] relative">
      {subscriptionStatus === 'DISCONNECTED' && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Disconnected from chat
            </p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={async () => {
                // Reset connection state
                reconnectionCountRef.current = 0;
                initializedRef.current = false;
                
                // Clean up all channels first
                if (channelRef.current) {
                  await channelRef.current.unsubscribe();
                  channelRef.current = null;
                }
                if (roomChannelRef.current) {
                  await roomChannelRef.current.unsubscribe();
                  roomChannelRef.current = null;
                }
                
                // Clear any existing intervals/timeouts
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                if (connectionTimeoutRef.current) {
                  clearTimeout(connectionTimeoutRef.current);
                  connectionTimeoutRef.current = null;
                }
                
                // Reset message state
                setMessages([]);
                setSessionId(null);
                
                // Force reconnect by triggering effect
                setSubscriptionStatus('CONNECTING');
                
                // Re-initialize after a short delay to ensure cleanup is complete
                setTimeout(() => {
                  initChatSession();
                }, 100);
              }}
            >
              Reconnect
            </Button>
          </div>
        </div>
      )}
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