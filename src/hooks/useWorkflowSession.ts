
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
  const { userInfo } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('workflowSleuthSessionId');
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const initialMessageSent = useRef(false);
  const lastLoadedSessionId = useRef<string | null>(null);

  const validateAndLoadSession = async () => {
    if (!sessionId) return;

    try {
      setInitializationError(null);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError || !sessionData) {
        console.log("Session not found, creating a new one");
        localStorage.removeItem('workflowSleuthSessionId');
        setSessionId(null);
        setMessages([]);
        hasInitialized.current = false;
        initialMessageSent.current = false;
        return;
      }
      
      await loadMessages();
    } catch (error) {
      console.error("Error in validateAndLoadSession:", error);
      setInitializationError("Failed to validate session");
    }
  };

  const loadMessages = async () => {
    if (!sessionId) return;

    // If we've already loaded this session and have messages, don't reload
    if (lastLoadedSessionId.current === sessionId && messages.length > 0) {
      console.log("Session already loaded with messages, skipping reload");
      return;
    }

    try {
      console.log("Loading messages for session:", sessionId);
      setInitializationError(null);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        setInitializationError("Failed to load messages");
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
        lastLoadedSessionId.current = sessionId;
        console.log("Loaded messages:", loadedMessages.length);
      } else {
        setMessages([]);
        initialMessageSent.current = false;
        console.log("No messages found for session:", sessionId);
      }
    } catch (error) {
      console.error("Error in loadMessages:", error);
      setInitializationError("Failed to load messages");
    }
  };

  const initializeSession = async () => {
    try {
      setInitializationError(null);
      if (!userInfo) {
        console.log("No user info available");
        return;
      }
      
      console.log("Initializing session with company name:", userInfo.companyName);

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
        console.error("Error creating session:", error);
        setInitializationError("Failed to initialize session");
        toast({
          title: "Error",
          description: "Failed to create a new session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const newSessionId = data.id;
        console.log("Created new session with ID:", newSessionId);
        localStorage.setItem('workflowSleuthSessionId', newSessionId);
        setSessionId(newSessionId);
        setMessages([]);
        initialMessageSent.current = false;
        lastLoadedSessionId.current = newSessionId;
      }
    } catch (error) {
      console.error("Error in initializeSession:", error);
      setInitializationError("Failed to initialize session");
    }
  };

  // Effect to handle session initialization or validation
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('workflowSleuthSessionId', sessionId);
      if (!hasInitialized.current || lastLoadedSessionId.current !== sessionId) {
        validateAndLoadSession();
        hasInitialized.current = true;
      }
    } else if (!hasInitialized.current && userInfo) {
      initializeSession();
      hasInitialized.current = true;
    }
  }, [sessionId, userInfo]);

  return {
    sessionId,
    messages,
    isLoading,
    initializationError,
    setSessionId,
    setMessages,
    setIsLoading,
    initialMessageSent,
    loadMessages,
  };
};
