
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatHistoryProps {
  sessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

interface Session {
  id: string;
  created_at: string;
  company_name: string;
}

export const ChatHistory = ({ sessionId, onSelectSession }: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        });
        return;
      }

      // Filter out sessions with no messages
      const filteredSessions = await filterSessionsWithMessages(data || []);
      setSessions(filteredSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show sessions that have messages
  const filterSessionsWithMessages = async (sessions: Session[]) => {
    const sessionsWithMessages = [];
    
    for (const session of sessions) {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id);
      
      if (!error && count && count > 0) {
        sessionsWithMessages.push(session);
      }
    }
    
    return sessionsWithMessages;
  };

  const deleteSession = async (id: string) => {
    try {
      // First delete all messages associated with this session
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', id);

      if (messagesError) {
        throw messagesError;
      }

      // Then delete the session
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
      
      // Update local state
      setSessions(sessions.filter(session => session.id !== id));
      
      // If current session is deleted, force a refresh
      if (sessionId === id) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-muted-foreground">Loading chats...</p>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground p-4">No chat history</p>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.id}
              className={cn(
                "flex justify-between items-center p-2 rounded-md hover:bg-accent cursor-pointer group",
                sessionId === session.id && "bg-accent"
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{session.company_name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(session.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
