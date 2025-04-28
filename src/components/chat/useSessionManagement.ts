import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Session {
  id: string;
  created_at: string;
  company_name: string;
  title: string | null;
  empty?: boolean;
}

export const useSessionManagement = (currentSessionId: string | null) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          created_at,
          company_name,
          title,
          message_count:chat_messages(count)
        `)
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

      // Show everything; grey-out ones with 0 msgs so the user still sees the new room
      setSessions(
        sessionsData?.map(({ message_count, ...session }) => ({
          ...session,
          empty: !message_count?.[0]?.count
        })) || []
      );
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

  useEffect(() => {
    // Create a channel for listening to session title updates
    const channel = supabase
      .channel('session-titles')
      .on(
        'postgres_changes', 
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: 'title=eq.UPDATED'
        },
        (payload) => {
          setSessions(currentSessions =>
            currentSessions.map(session => 
              session.id === payload.new.id 
                ? { ...session, title: payload.new.title } 
                : session
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    sessions,
    isLoading,
    fetchSessions,
    deleteSession,
  };
};
