import { useState, useRef, useEffect } from "react";
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
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('workflowSleuthSessionId');
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);
  const initialMessageSent = useRef(false);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('workflowSleuthSessionId', sessionId);
      validateAndLoadSession();
    } else if (!hasInitialized.current) {
      initializeSession();
      hasInitialized.current = true;
    }
  }, [sessionId]);

  const validateAndLoadSession = async () => {
    if (!sessionId) return;

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError || !sessionData) {
        localStorage.removeItem('workflowSleuthSessionId');
        setSessionId(null);
        setMessages([]);
        hasInitialized.current = false;
        return;
      }
      
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      
      if (countError) {
        console.error("Error checking messages count:", countError);
        return;
      }
      
      if (count && count > 0) {
        loadMessages();
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error in validateAndLoadSession:", error);
    }
  };

  const loadMessages = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data && data.length > 0) {
        const loadedMessages = data.map(msg => ({
          id: msg.id,
          text: msg.content,
          isBot: msg.role === 'assistant',
          sessionId: msg.session_id
        }));
        setMessages(loadedMessages);
        initialMessageSent.current = true;
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error in loadMessages:", error);
    }
  };

  const initializeSession = async () => {
    try {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "Could not find your company profile.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert([
          { 
            facilitator: 'WorkflowSleuth', 
            company_name: profile.company_name,
            finished: false
          }
        ])
        .select();

      if (error) {
        console.error("Error creating session:", error);
        toast({
          title: "Error",
          description: "Failed to initialize session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        const newSessionId = data[0].id;
        setSessionId(newSessionId);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error in initializeSession:", error);
    }
  };

  return {
    sessionId,
    messages,
    isLoading,
    setSessionId,
    setMessages,
    setIsLoading,
    initialMessageSent,
    loadMessages,
  };
};
