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
      supabase.from('sync_events').insert({
        room_id: room.id,
        event_type: 'new_chat_session',
        payload: {
          sessionId: newSession.id,
          roomId: room.id,
          round: room.round
        },
        created_at: new Date().toISOString()
      }).then(result => {
        if (result.error) {
          console.error('Error creating sync event:', result.error);
        } else {
          console.log('Created sync event for new chat session');
        }
      });
      
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
    
    // Subscribe to various broadcast channels for maximum coverage
    // 1. Room-specific channel
    const roomChannel = supabase
      .channel(`room:${currentRoomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (!isMounted) return;
        
        // Handle new chat messages broadcast via room channel
        if (payload.payload?.action === 'new_chat_message' && 
            payload.payload.sessionId && 
            payload.payload.message &&
            payload.payload.roomId === currentRoomId) {
          console.log('Room channel received new message broadcast:', payload.payload.message);
          handleNewMessage(payload.payload.message as ChatMessage, payload.payload.sessionId);
        }
      });
      
    // 2. Direct broadcast channel (for direct broadcasts)
    const directBroadcastChannel = supabase
      .channel(`direct:${currentRoomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (!isMounted) return;
        
        // Handle new chat messages from broadcast channel
        if (payload.payload?.action === 'new_chat_message' && 
            payload.payload.sessionId && 
            payload.payload.message &&
            payload.payload.roomId === currentRoomId) {
          console.log('Direct broadcast channel received new message:', payload.payload.message);
          handleNewMessage(payload.payload.message as ChatMessage, payload.payload.sessionId);
        }
      });

    // 3. General broadcast channel 
    const broadcastChannel = supabase
      .channel(`broadcast:${currentRoomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (!isMounted) return;
        
        // Handle new chat messages from broadcast channel
        if (payload.payload?.action === 'new_chat_message' && 
            payload.payload.sessionId && 
            payload.payload.message &&
            payload.payload.roomId === currentRoomId) {
          console.log('Broadcast channel received new message:', payload.payload.message);
          handleNewMessage(payload.payload.message as ChatMessage, payload.payload.sessionId);
        }
      });

    // Subscribe to all channels
    roomChannel.subscribe((status) => {
      if (!isMounted) return;
      console.log('Room channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        roomChannelRef.current = roomChannel;
      }
    });

    directBroadcastChannel.subscribe((status) => {
      if (!isMounted) return;
      console.log('Direct broadcast channel subscription status:', status);
    });

    broadcastChannel.subscribe((status) => {
      if (!isMounted) return;
      console.log('General broadcast channel subscription status:', status);
    });

    // Helper function to handle new messages
    const handleNewMessage = (message: ChatMessage, sessionId: string) => {
      // Prevent adding duplicate messages
      if (messages.some(msg => msg.id === message.id)) {
        console.log('Ignoring duplicate message:', message.id);
        return;
      }

      // Check timestamp to prevent processing stale messages
      const lastCurrentTimestamp = messages[messages.length - 1]?.created_at;
      if (lastCurrentTimestamp && new Date(message.created_at) <= new Date(lastCurrentTimestamp)) {
        console.log('Ignoring stale message:', message.created_at);
        return;
      }

      console.log(`Appending message: ${message.id}`);
      setMessages(prevMessages => [...prevMessages, message]);

      // Update chatSessionRef
      if (chatSessionRef.current && sessionId === chatSessionRef.current.id) {
        chatSessionRef.current.messages = [...chatSessionRef.current.messages, message];
        chatSessionRef.current.updated_at = message.created_at;
      }

      // Scroll to bottom
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    };

    // Helper function to handle new chat sessions
    const handleNewChatSession = async (sessionId: string) => {
      if (!chatSessionRef.current || 
          chatSessionRef.current.room_id !== currentRoomId || 
          chatSessionRef.current.round !== currentRoomRound) {
        console.log('Fetching new chat session:', sessionId);
        
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error) {
          console.error('Error fetching new chat session:', error);
          return;
        }

        if (data && isMounted) {
          console.log('Fetched new chat session:', data);
          if (!chatSessionRef.current || chatSessionRef.current.id !== data.id) {
            chatSessionRef.current = data;
            setSessionId(data.id);
            setMessages(data.messages || []);
            lastMessageCountRef.current = data.messages?.length || 0;
            requestAnimationFrame(() => {
              scrollToBottom();
            });
          }
        }
      }
    };

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
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (roomChannelRef.current) {
        roomChannelRef.current.unsubscribe();
        roomChannelRef.current = null;
      }
      directBroadcastChannel.unsubscribe();
      broadcastChannel.unsubscribe();
    };
  }, [room, initChatSession, scrollToBottom, subscriptionStatus, messages]);

  // Move polling-related code to a separate useEffect to avoid circular dependencies
  useEffect(() => {
    let isMounted = true;
    const messagesSeenByPolling = new Set<string>(); // Track message IDs seen by polling
    
    // More efficient polling function
    const pollForMessages = async () => {
      if (!chatSessionRef.current?.id || !sessionId) return;
      
      try {
        // 1. Check for chat session updates
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
          
        if (!isMounted) return;
        
        if (error) {
          console.error('Error polling chat session:', error);
          return;
        }
        
        if (!data || !data.messages || !Array.isArray(data.messages)) {
          console.warn('Invalid data format in polling response:', data);
          return;
        }
        
        // Check for new messages using message IDs
        const currentMessageIds = new Set(messages.map(msg => msg.id));
        const newMessages = data.messages.filter((msg: ChatMessage) => !currentMessageIds.has(msg.id));
        
        if (newMessages.length > 0) {
          console.log(`Polling found ${newMessages.length} new messages in chat session`);
          
          // Track these messages as seen by polling
          newMessages.forEach((msg: ChatMessage) => messagesSeenByPolling.add(msg.id));
          
          // Don't replace the entire array, just append new messages
          setMessages(prevMessages => [...prevMessages, ...newMessages]);
          
          // Update the chat session reference
          chatSessionRef.current = data;
          
          // Scroll to bottom
          requestAnimationFrame(() => scrollToBottom());
        }

        // 2. Also check sync_events table for events
        if (room?.id) {
          const { data: syncEvents, error: syncError } = await supabase
            .from('sync_events')
            .select('*')
            .eq('room_id', room.id)
            .eq('event_type', 'new_message')
            .gte('created_at', new Date(Date.now() - 10000).toISOString()) // Last 10 seconds
            .order('created_at', { ascending: false });

          if (syncError) {
            console.error('Error checking sync events:', syncError);
            return;
          }

          if (syncEvents && syncEvents.length > 0) {
            console.log(`Found ${syncEvents.length} recent sync events`);
            
            // Process each event
            for (const event of syncEvents) {
              const message = event.payload?.message;
              
              if (message && !currentMessageIds.has(message.id) && !messagesSeenByPolling.has(message.id)) {
                console.log(`Adding message from sync event: ${message.id}`);
                
                // Add to seen messages
                messagesSeenByPolling.add(message.id);
                
                // Add to messages
                setMessages(prevMessages => [...prevMessages, message]);
                
                // Scroll to bottom
                requestAnimationFrame(() => scrollToBottom());
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in polling function:', error);
      }
    };
    
    // Start very frequent polling if connected
    if (subscriptionStatus === 'CONNECTED' && sessionId) {
      console.log('Setting up message polling at 1.5-second intervals');
      // Poll immediately
      pollForMessages();
      // Then poll every 1.5 seconds
      pollingIntervalRef.current = setInterval(pollForMessages, 1500);
    }
    
    return () => {
      isMounted = false;
      if (pollingIntervalRef.current) {
        console.log('Cleaning up polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [subscriptionStatus, sessionId, scrollToBottom, room?.id, room?.round, messages, scrollRef]);

  // Set up database sync event listener
  useEffect(() => {
    const currentRoomId = room?.id;
    if (!currentRoomId) return;
    
    let isMounted = true;
    
    // Create a channel for sync events
    const syncChannel = supabase
      .channel(`sync:${currentRoomId}`, {
        config: { broadcast: { self: true } }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_events',
          filter: `room_id=eq.${currentRoomId}`
        },
        (payload) => {
          if (!isMounted) return;
          
          console.log('Sync event detected:', payload);
          
          // If this is a new message event, handle it
          if (payload.new.event_type === 'new_message') {
            const message = payload.new.payload?.message;
            const sessionId = payload.new.payload?.sessionId;
            
            if (message && sessionId) {
              // Check if we already have this message
              const messageExists = messages.some(msg => msg.id === message.id);
              
              if (!messageExists) {
                console.log(`Adding message from sync event: ${message.id}`);
                setMessages(prevMessages => [...prevMessages, message]);
                
                // Scroll to bottom
                requestAnimationFrame(() => scrollToBottom());
              }
            }
          }
        }
      );
    
    // Subscribe to the channel
    syncChannel.subscribe(status => {
      console.log(`Sync channel subscription status: ${status}`);
    });
    
    return () => {
      isMounted = false;
      syncChannel.unsubscribe();
    };
  }, [room?.id, messages, scrollToBottom]);

  // Optimized message sending
  const handleSendMessage = useCallback(async () => {
    if (!room || !newMessage.trim() || !chatSessionRef.current) return;

    const currentPlayer = room.players.find((p: Player) => p.id === playerId);
    if (!currentPlayer) return;

    try {
      const now = new Date().toISOString();
      const messageId = `msg-${playerId}-${Date.now()}`;
      const newChatMessage: ChatMessage = {
        id: messageId,
        room_id: room.id,
        player_id: playerId,
        player_name: currentPlayer.name,
        content: newMessage,
        is_hint: isHint,
        created_at: now
      };

      // Optimistic update with immediate scroll
      console.log('Adding optimistic message:', newChatMessage);
      const updatedMessages = [...messages, newChatMessage];
      setMessages(updatedMessages);
      setNewMessage('');
      setIsHint(false);
      scrollToBottom();

      // Broadcast message FIRST, then update database
      if (!chatSessionRef.current?.id) {
        console.error('No valid chat session ID for sending message');
        return;
      }

      // Force other clients to refresh their chat by broadcasting
      console.log(`Broadcasting new message to other clients for session ${chatSessionRef.current.id}`);
      
      // 1. Update chat session in the database
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

      // 2. Create a sync event in the database to force synchronization
      await supabase.from('sync_events').insert({
        room_id: room.id,
        event_type: 'new_message',
        payload: {
          message: newChatMessage,
          sessionId: chatSessionRef.current?.id || '',
          timestamp: now,
          messageId: messageId,
          roomId: room.id 
        },
        created_at: now
      });

      // 3. Broadcast via multiple channels
      try {
        // Create a direct broadcast channel for this message
        const directChannel = supabase.channel(`direct:${room.id}:${messageId}`);
        await directChannel.subscribe();
        await directChannel.send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            action: 'new_chat_message',
            sessionId: chatSessionRef.current?.id || '',
            timestamp: now,
            message: newChatMessage,
            messageId: messageId,
            roomId: room.id 
          }
        });
        await directChannel.unsubscribe();
        
        console.log('Message send operation complete');
      } catch (error) {
        console.error('Error in message broadcasting:', error);
        // Database update already succeeded, so we'll rely on polling
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