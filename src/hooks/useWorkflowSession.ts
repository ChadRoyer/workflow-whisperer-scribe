
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

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('workflowSleuthSessionId', sessionId);
      validateAndLoadSession();
    } else if (!hasInitialized.current && userInfo) {
      initializeSession();
      hasInitialized.current = true;
    }
  }, [sessionId, userInfo]);

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
        console.log("No messages found for this session, sending initial message");
        setMessages([]);
        initialMessageSent.current = false;
      }
    } catch (error) {
      console.error("Error in validateAndLoadSession:", error);
      setInitializationError("Failed to validate session");
    }
  };

  const loadMessages = async () => {
    if (!sessionId) return;

    try {
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
        console.log("Loaded messages:", loadedMessages);
      } else {
        setMessages([]);
        initialMessageSent.current = false;
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
        setInitializationError("No user information available");
        return;
      }
      
      console.log("Initializing session with company name:", userInfo.companyName);

      // Create a guest session without needing RLS policies
      const sessionData = {
        facilitator: 'WorkflowSleuth', 
        company_name: userInfo.companyName,
        finished: false
      };

      // First try to use the existing sessions if any exist for this company
      const { data: existingSessions, error: existingError } = await supabase
        .from('sessions')
        .select('id')
        .eq('company_name', userInfo.companyName)
        .limit(1);
      
      if (!existingError && existingSessions && existingSessions.length > 0) {
        console.log("Found existing session for company:", existingSessions[0].id);
        setSessionId(existingSessions[0].id);
        setMessages([]);
        initialMessageSent.current = false;
        return;
      }

      // If no existing sessions, create a new one
      const { data, error } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select();

      if (error) {
        console.error("Error creating session:", error);
        
        // Show a more user-friendly error message
        if (error.code === '42501') {
          setInitializationError("Permission denied when creating session. This may be due to database security settings.");
          toast({
            title: "Session Creation Failed",
            description: "We couldn't create a new chat session. You can still view existing chats.",
            variant: "destructive",
          });
        } else {
          setInitializationError("Failed to initialize session");
          toast({
            title: "Error",
            description: "Failed to initialize session. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data && data.length > 0) {
        const newSessionId = data[0].id;
        console.log("Created new session with ID:", newSessionId);
        setSessionId(newSessionId);
        setMessages([]);
        initialMessageSent.current = false;
      }
    } catch (error) {
      console.error("Error in initializeSession:", error);
      setInitializationError("Failed to initialize session");
    }
  };

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
