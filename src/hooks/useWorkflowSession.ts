
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

export const useWorkflowSession = () => {
  const { userInfo } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const initializeSession = async () => {
    try {
      const storedSessionId = localStorage.getItem('workflowSleuthSessionId');
      
      // Validate existing session ID if present
      if (storedSessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id, company_name')
          .eq('id', storedSessionId)
          .single();

        if (!sessionError && sessionData) {
          // Valid existing session found
          setSessionId(storedSessionId);
          await loadMessagesForSession(storedSessionId);
          setIsLoading(false);
          return;
        }
      }

      // Create new session if no valid session exists
      if (userInfo) {
        const newSession = await createNewSession();
        if (newSession) {
          setSessionId(newSession.id);
          localStorage.setItem('workflowSleuthSessionId', newSession.id);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Session initialization error:", error);
      toast({
        title: "Error",
        description: "Failed to initialize session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessagesForSession = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Message loading error:", error);
        return [];
      }

      return data ? data.map(msg => ({
        id: msg.id,
        text: msg.content,
        isBot: msg.role === 'assistant',
        sessionId: msg.session_id
      })) : [];
    } catch (error) {
      console.error("Unexpected error loading messages:", error);
      return [];
    }
  };

  const createNewSession = async () => {
    if (!userInfo) return null;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          facilitator: 'WorkflowSleuth',
          company_name: userInfo.companyName,
          finished: false
        })
        .select()
        .single();

      if (error) {
        console.error("Session creation error:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error creating session:", error);
      return null;
    }
  };

  // Initialize session on mount and when user info changes
  useEffect(() => {
    if (userInfo) {
      initializeSession();
    }
  }, [userInfo]);

  return {
    sessionId,
    messages,
    isLoading,
    setSessionId,
    setMessages,
    loadMessagesForSession,
    createNewSession,
    initializeSession
  };
};
