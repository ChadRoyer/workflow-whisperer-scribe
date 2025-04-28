
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

export const saveMessageToDatabase = async (message: Message, sessionId: string | null) => {
  if (!sessionId) {
    console.error("No session ID available");
    return null;
  }

  try {
    // First check if the session exists before attempting to save
    const { count, error: sessionCheckError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('id', sessionId);
    
    if (sessionCheckError) {
      console.error("Error checking session:", sessionCheckError);
      return null;
    }
    
    if (!count || count === 0) {
      console.error("Session does not exist:", sessionId);
      toast({
        title: "Session Error",
        description: "The session no longer exists. You may need to start a new chat.",
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: message.isBot ? 'assistant' : 'user',
        content: message.text
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving message:", error);
      toast({
        title: "Error",
        description: "Failed to save message.",
        variant: "destructive",
      });
      return null;
    }

    console.log("Saved message:", data);
    return data;
  } catch (error) {
    console.error("Error in saveMessage:", error);
    return null;
  }
};

export const checkSessionHasMessages = async (sessionId: string | null) => {
  if (!sessionId) return false;
  
  try {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    
    if (error) {
      console.error("Error checking for messages:", error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error("Error in checkSessionHasMessages:", error);
    return false;
  }
};
