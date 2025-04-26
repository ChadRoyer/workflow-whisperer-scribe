
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const useSessionCleanup = () => {
  const cleanupEmptySessions = useCallback(async () => {
    try {
      const { data: allSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id');
      
      if (sessionsError) {
        console.error("Error getting all sessions:", sessionsError);
        return;
      }
      
      if (!allSessions || allSessions.length === 0) {
        return;
      }
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('session_id')
        .not('session_id', 'is', null);
      
      if (messagesError) {
        console.error("Error getting sessions with messages:", messagesError);
        return;
      }
      
      const sessionIdsWithMessages = messagesData 
        ? [...new Set(messagesData.map(msg => msg.session_id))]
        : [];
      
      const emptySessionIds = allSessions
        .map(session => session.id)
        .filter(id => !sessionIdsWithMessages.includes(id));
      
      if (emptySessionIds.length === 0) {
        return;
      }
      
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
  }, []);

  return { cleanupEmptySessions };
};
