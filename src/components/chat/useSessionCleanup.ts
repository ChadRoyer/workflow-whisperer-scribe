
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSessionCleanup = () => {
  const cleanupEmptySessions = useCallback(async () => {
    try {
      // Find sessions with no messages except sessions created in the last 2 minutes
      const twoMinutesAgo = new Date();
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
      
      // First, find sessions with no messages
      const { data: emptySessions, error: findError } = await supabase
        .from('sessions')
        .select('id, created_at')
        .not('created_at', 'gt', twoMinutesAgo.toISOString()) // Exclude recently created sessions
        .not('id', 'in', (
          supabase
            .from('chat_messages')
            .select('session_id')
            .then(({ data }) => data?.map(m => m.session_id) || [])
        ));
        
      if (findError) {
        console.error("Error finding empty sessions:", findError);
        return;
      }
      
      if (!emptySessions || emptySessions.length === 0) {
        return;
      }
      
      // Delete the empty sessions
      const { error: deleteError, count } = await supabase
        .from('sessions')
        .delete()
        .in('id', emptySessions.map(s => s.id))
        .select();
        
      if (deleteError) {
        console.error("Error deleting empty sessions:", deleteError);
      } else {
        console.log(`Cleaned up ${count} empty sessions`);
      }
      
      return count;
    } catch (error) {
      console.error("Error in cleanupEmptySessions:", error);
      return 0;
    }
  }, []);
  
  return {
    cleanupEmptySessions
  };
};
