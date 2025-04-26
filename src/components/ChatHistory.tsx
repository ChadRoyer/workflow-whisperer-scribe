
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
  title: string | null;
}

export const ChatHistory = ({ sessionId, onSelectSession }: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sessions on component mount and when sessionId changes
  useEffect(() => {
    fetchSessions();
  }, [sessionId]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // First, clean up any empty sessions before fetching the list
      await cleanupEmptySessions();

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      // For each session, check if it has any messages
      const sessionsWithMessages = await Promise.all(
        sessionsData.map(async (session) => {
          const { count, error } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id);
          
          // Return session with a hasMessages flag
          return {
            ...session,
            hasMessages: !error && count !== null && count > 0
          };
        })
      );

      // Filter out sessions without messages
      const filteredSessions = sessionsWithMessages.filter(session => session.hasMessages);
      
      setSessions(filteredSessions);
    } catch (error) {
      console.error("Error in fetchSessions:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clean up abandoned empty sessions
  const cleanupEmptySessions = async () => {
    try {
      // First get all session IDs
      const { data: allSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id');
      
      if (sessionsError) {
        console.error("Error getting all sessions:", sessionsError);
        return;
      }
      
      if (!allSessions || allSessions.length === 0) {
        return; // No sessions to clean up
      }
      
      // Get all session IDs that have messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('session_id')
        .not('session_id', 'is', null);
      
      if (messagesError) {
        console.error("Error getting sessions with messages:", messagesError);
        return;
      }
      
      // Extract unique session IDs from messages
      const sessionIdsWithMessages = messagesData 
        ? [...new Set(messagesData.map(msg => msg.session_id))]
        : [];
      
      // Find sessions without messages
      const emptySessionIds = allSessions
        .map(session => session.id)
        .filter(id => !sessionIdsWithMessages.includes(id));
      
      if (emptySessionIds.length === 0) {
        return; // No empty sessions to delete
      }
      
      // Delete empty sessions
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .in('id', emptySessionIds);
      
      if (deleteError) {
        console.error("Error deleting empty sessions:", deleteError);
      } else {
        console.log(`Cleaned up ${emptySessionIds.length} empty sessions`);
      }
    } catch (error) {
      console.error("Error in cleanupEmptySessions:", error);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      // First delete all messages associated with this session
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', id);

      if (messagesError) {
        console.error("Error deleting messages:", messagesError);
        throw messagesError;
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        throw sessionError;
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
      console.error("Error in deleteSession:", error);
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
                <span className="font-medium">{session.title || session.company_name}</span>
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
