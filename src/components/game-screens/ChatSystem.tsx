import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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

// Memoized Message UI component
const ChatMessageItem = memo(({ message, playerId, truncateName }: { message: ChatMessage, playerId: string | null, truncateName: (name: string, maxLength?: number) => string }) => {
  const isOwnMessage = message.player_id === playerId;

  return (
    <div
      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
          isOwnMessage
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
  );
});
ChatMessageItem.displayName = 'ChatMessageItem';

export default function ChatSystem() {
  const { room, playerId } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHint, setIsHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isAtBottomRef = useRef(true);
  const messageIdsRef = useRef(new Set<string>());

  // Simple name truncation helper
  const truncateName = useCallback((name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  }, []);

  // Scroll to bottom function - scrolls the container directly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    try {
      // Get the viewport element (the actual scrollable element in ScrollArea)
      const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: behavior
        });
      } else {
        // Fallback to the container itself
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: behavior
        });
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }, []);

  // Handle scroll events - Check if near bottom
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    try {
      // Get the viewport element
      const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]');
      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const threshold = 100; // Pixels from bottom to consider "at bottom"
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // For debugging
      console.log(`Scroll: ${distanceFromBottom.toFixed(0)}px from bottom`);

      isAtBottomRef.current = distanceFromBottom <= threshold;
      setShowScrollButton(distanceFromBottom > threshold);
    } catch (error) {
      console.error('Error handling scroll:', error);
    }
  }, []);

  // Find or create a chat session
  const initChatSession = useCallback(async () => {
    if (!room) {
      console.log('No room provided');
      return null;
    }

    console.log('Initializing chat for room:', room.id, 'round:', room.round);

    try {
      // Find existing session
      const { data: existingSessions, error: findError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('room_id', room.id)
        .eq('round', room.round);

      if (findError) {
        console.error('Error finding chat session:', findError);
        return null;
      }

      const existingSession = existingSessions && existingSessions.length > 0
        ? existingSessions[0]
        : null;

      // If session exists, use it
      if (existingSession) {
        console.log('Found existing chat session:', existingSession.id);

        // Check if messages exist and are valid
        if (existingSession.messages && Array.isArray(existingSession.messages)) {
          // Update local state
          chatSessionRef.current = existingSession;
          setSessionId(existingSession.id);

          // Update message IDs set for deduplication
          messageIdsRef.current.clear(); // Clear before repopulating
          existingSession.messages.forEach((msg: ChatMessage) => {
            messageIdsRef.current.add(msg.id);
          });

          // Set messages state
          setMessages(existingSession.messages);

          // Scroll to bottom after initial render (use 'auto' for instant scroll)
          requestAnimationFrame(() => scrollToBottom('auto'));
        } else {
          console.warn('Invalid messages format in session');
          chatSessionRef.current = {...existingSession, messages: []};
          setSessionId(existingSession.id);
          setMessages([]);
          messageIdsRef.current.clear();
        }

        return existingSession;
      }

      // If no session exists, create a new one
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

      console.log('New chat session created:', newSession.id);
      chatSessionRef.current = newSession;
      setSessionId(newSession.id);
      setMessages([]);
      messageIdsRef.current.clear();

      return newSession;
    } catch (error) {
      console.error('Error initializing chat session:', error);
      return null;
    }
  }, [room, scrollToBottom]);

  // Set up chat session and subscriptions
  useEffect(() => {
    if (!room || room.round === undefined) return;

    setStatus('loading');
    let isMounted = true;
    let currentChannel: RealtimeChannel | null = null;

    // Reset message IDs on new session setup
    messageIdsRef.current.clear();

    const setupChat = async () => {
      try {
        // Clear existing subscription
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Initialize or find chat session
        const session = await initChatSession();
        if (!session || !isMounted) {
            setStatus('error'); // Set error if session fails
            return;
        };

        // Use a stable room-based channel
        const channelName = `room:${room.id}`;
        console.log('Setting up subscription to channel:', channelName);
        const channel = supabase.channel(channelName);
        currentChannel = channel; // Store reference for cleanup

        // Listener for DATABASE updates (source of truth)
        channel.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_sessions',
              filter: `id=eq.${session.id}` // Ensure we filter by the correct session ID
            },
            (payload) => {
              if (!isMounted || !payload.new?.messages) return;

              const updatedSession = payload.new as ChatSession;
              if (!Array.isArray(updatedSession.messages)) return;

              console.log(`DB Update: Received ${updatedSession.messages.length} total messages`);

              // Use functional update to get the latest messages state
              setMessages(prevMessages => {
                  // Get IDs of messages currently in state
                  const currentIds = new Set(prevMessages.map(m => m.id));
                  // Filter messages from the update that are not already in state
                  const newMessages = updatedSession.messages.filter(msg => !currentIds.has(msg.id));

                  if (newMessages.length > 0) {
                      console.log(`DB Update: Adding ${newMessages.length} new messages`);
                      // Add new message IDs to our ref tracker
                      newMessages.forEach(msg => messageIdsRef.current.add(msg.id));
                      if (isAtBottomRef.current) {
                          // Schedule scroll after state update
                          setTimeout(() => scrollToBottom('smooth'), 100);
                      }
                      // Return the combined list
                      return [...prevMessages, ...newMessages];
                  }
                  // If no new messages, return the previous state to avoid re-render
                  return prevMessages;
              });
              chatSessionRef.current = updatedSession; // Update session ref
            }
          );

        // Listener for BROADCAST messages (faster notifications)
        channel.on(
          'broadcast',
          { event: 'new_chat_message' }, // Listen to our specific event
          (payload) => {
            if (!isMounted || !payload.payload?.message) return;

            const message = payload.payload.message as ChatMessage;
            console.log('Broadcast received:', message.id);

            // Add message only if it's new (check ref directly)
            if (!messageIdsRef.current.has(message.id)) {
              console.log('Broadcast: Adding new message', message.id);
              messageIdsRef.current.add(message.id);
              // Use functional update
              setMessages(prev => [...prev, message]);
              if (isAtBottomRef.current) {
                  setTimeout(() => scrollToBottom('smooth'), 100);
              }
            }
          }
        );

        // Subscribe to channel
        channel.subscribe((status, err) => { // Add error handling
          console.log(`Channel ${channelName} status:`, status);
          if (err) {
            console.error(`Subscription error on ${channelName}:`, err);
            if (isMounted) setStatus('error');
            return;
          }
          if (status === 'SUBSCRIBED' && isMounted) {
            channelRef.current = channel;
            setStatus('connected');
            // Fetch initial state again after subscribing to ensure consistency
             console.log('Subscription successful, re-validating chat session...');
             initChatSession(); // Re-run init to ensure we have the latest messages
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
             if (isMounted) setStatus('error');
          }
        });
      } catch (error) {
        console.error('Error setting up chat:', error);
        if (isMounted) setStatus('error');
      }
    };

    setupChat();

    // Cleanup function
    return () => {
      isMounted = false;
      if (currentChannel) {
        supabase.removeChannel(currentChannel).catch(err => {
          console.error('Error removing channel on cleanup:', err);
        });
        channelRef.current = null; // Clear the ref
      }
    };
  // Dependencies: Re-run when room ID or round changes. initChatSession and scrollToBottom are stable callbacks.
  }, [room, room?.id, room?.round, initChatSession, scrollToBottom]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const currentSessionId = chatSessionRef.current?.id; // Get session ID before async operations
    if (!room || !newMessage.trim() || !currentSessionId) {
      console.warn('Cannot send message. Missing room, message, or session ID.');
      return;
    }

    const currentPlayer = room.players.find((p: Player) => p.id === playerId);
    if (!currentPlayer) {
        console.error('Cannot send message. Current player not found.');
        return;
    }

    // Generate a unique ID for the message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const content = newMessage.trim();
    const timestamp = new Date().toISOString();
    const hintStatus = isHint; // Capture hint status before clearing

    // Clear input field immediately
    setNewMessage('');
    setIsHint(false);

    // Create message object
    const message: ChatMessage = {
      id: messageId,
      room_id: room.id,
      player_id: playerId,
      player_name: currentPlayer.name,
      content: content,
      is_hint: hintStatus,
      created_at: timestamp
    };

    // Add message to local state first (optimistic update)
    messageIdsRef.current.add(messageId);
    setMessages(prevMessages => [...prevMessages, message]);

    // Scroll to bottom immediately (smoothly)
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      // Prepare updated messages array for database
      // Get the *latest* messages array from the ref, or fallback to state if ref is somehow null
      const currentMessages = Array.isArray(chatSessionRef.current?.messages)
          ? chatSessionRef.current.messages
          : messages; // Fallback to current state 'messages'
      const updatedMessages = [...currentMessages, message]; // Append new message

      // Update database
      const { data: updatedSessionData, error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          messages: updatedMessages,
          updated_at: timestamp
        })
        .eq('id', currentSessionId) // Use the captured session ID
        .select()
        .single();

      if (updateError) {
        // If DB update fails, remove optimistic message
        console.error('Error sending message (DB update):', updateError);
        messageIdsRef.current.delete(messageId);
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send message"
        });
        return; // Stop here if DB update fails
      }

      // Update local session ref on successful DB update
       if (updatedSessionData) {
         // Ensure messages property is an array
         const safeMessages = Array.isArray(updatedSessionData.messages) ? updatedSessionData.messages : updatedMessages;
         chatSessionRef.current = { ...updatedSessionData, messages: safeMessages };
       }

      // Broadcast the new message to other clients via the room channel
      try {
        // Use a stable channel reference instead of creating a new one each time
        // This prevents "channel closed before response" errors
        const existingChannel = channelRef.current;
        
        if (existingChannel) {
          // Use the already subscribed channel
          await existingChannel.send({
            type: 'broadcast',
            event: 'new_chat_message',
            payload: { message }
          });
          console.log('Message broadcast via existing channel');
        } else {
          console.log('No active channel found for broadcasting, using DB updates only');
        }
      } catch (broadcastError) {
        console.error('Error broadcasting message:', broadcastError);
        // Don't rollback UI, rely on DB subscription as fallback
      }

    } catch (error) {
      console.error('Error in message handling:', error);
      // Remove optimistic message if something else went wrong
      messageIdsRef.current.delete(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  // Dependencies: `messages` removed. State setters are stable. `room` object needed for player lookup.
  }, [room, playerId, newMessage, isHint, scrollToBottom, messages]);

  // Check if chat is disabled in voting phase
  const isChatDisabled = room?.state === GameState.Voting;

  // Render loading state
  if (status === 'loading') {
    return (
      <div className="flex flex-col h-[600px] justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="flex flex-col h-[600px] justify-center items-center">
        <p className="text-destructive">Failed to load chat</p>
        <Button
          onClick={() => window.location.reload()} // Simple retry for now
          variant="outline"
          className="mt-4"
        >
          Retry
        </Button>
    </div>
    );
  }

  // Main chat UI
  return (
    <div className="flex flex-col h-[600px] relative bg-card shadow-md rounded-lg border overflow-hidden">
      <ScrollArea 
        ref={scrollRef} 
        className="flex-1 p-4"
        onScroll={handleScroll}
        style={{ overflowY: 'auto', height: 'calc(100% - 120px)' }}
      >
        <div className="space-y-3 pb-4">
          {messages.map((message) => (
            <ChatMessageItem key={message.id} message={message} playerId={playerId} truncateName={truncateName} />
          ))}
        </div>
      </ScrollArea>

      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-24 right-4 rounded-full shadow-lg h-10 w-10 z-10 bg-background/80 backdrop-blur-sm"
          onClick={() => scrollToBottom('smooth')}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}

      <div className="p-3 border-t bg-background">
        {isChatDisabled ? (
          <div className="text-center text-muted-foreground text-sm py-2">
            Chat is disabled during voting phase
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="is-hint"
                checked={isHint}
                onCheckedChange={(checked) => setIsHint(checked as boolean)}
                className="h-4 w-4"
              />
              <label htmlFor="is-hint" className="text-sm text-muted-foreground">
                Mark as hint
              </label>
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>Send</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 