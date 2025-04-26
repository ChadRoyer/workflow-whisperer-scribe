
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Session {
  id: string;
  created_at: string;
  company_name: string;
  title: string | null;
}

export const useSessionManagement = (currentSessionId: string | null) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
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

      const sessionsWithMessages = await Promise.all(
        sessionsData.map(async (session) => {
          const { count, error } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id);
          
          return {
            ...session,
            hasMessages: !error && count !== null && count > 0
          };
        })
      );

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
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', id);

      if (messagesError) {
        console.error("Error deleting messages:", messagesError);
        throw messagesError;
      }

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
      
      setSessions(sessions => sessions.filter(session => session.id !== id));
      
      if (currentSessionId === id) {
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
  }, [currentSessionId]);

  return {
    sessions,
    isLoading,
    fetchSessions,
    deleteSession,
  };
};
