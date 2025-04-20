
import { useState, useRef, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";

export default function ChatPanel() {
  const { chatMessages, sendChatMessage, playerId, room } = useGame();
  const [message, setMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  if (!room) return null;
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && !isMinimized) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [chatMessages, isMinimized]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendChatMessage(message);
    setMessage("");
  };
  
  if (isMinimized) {
    return (
      <Button
        variant="outline"
        className="fixed right-4 bottom-4 p-4"
        onClick={() => setIsMinimized(false)}
      >
        <MessageSquare className="h-5 w-5" />
        {chatMessages.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 absolute -top-2 -right-2 text-xs flex items-center justify-center">
            {chatMessages.length > 99 ? '99+' : chatMessages.length}
          </span>
        )}
      </Button>
    );
  }
  
  return (
    <Card className="fixed right-4 bottom-4 w-80 h-96 flex flex-col shadow-lg border-2">
      <CardHeader className="p-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Chat</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)}>
            −
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full p-3" ref={scrollAreaRef}>
          <div className="space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm p-4">
                No messages yet. Start the conversation!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-2 rounded-lg max-w-[90%] ${
                    msg.playerId === playerId 
                      ? 'ml-auto bg-primary/10' 
                      : msg.role === 'system'
                        ? 'mx-auto bg-muted/50 text-center' 
                        : 'bg-secondary/10'
                  }`}
                >
                  {msg.role !== 'system' && (
                    <div className="text-xs font-medium mb-1">
                      {msg.playerId === playerId ? 'You' : msg.playerName}
                    </div>
                  )}
                  <p className={`text-sm ${msg.isHint ? 'font-medium text-accent-foreground' : ''}`}>
                    {msg.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-2 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full gap-1">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
