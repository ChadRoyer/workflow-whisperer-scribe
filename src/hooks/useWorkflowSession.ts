
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
  const [isLoading, setIsLoading] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);

  // Initial setup - runs only once when component mounts
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Get session ID from localStorage
        const storedSessionId = localStorage.getItem('workflowSleuthSessionId');
        console.log("Initial load: checking for stored session ID:", storedSessionId);
        
        if (storedSessionId) {
          // Validate the stored session ID
          const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('id')
            .eq('id', storedSessionId)
            .single();
          
          if (!sessionError && sessionData) {
            console.log("Found valid session:", storedSessionId);
            setSessionId(storedSessionId);
            await loadMessagesForSession(storedSessionId);
            setIsInitialized(true);
            return;
          } else {
            console.log("Stored session ID is invalid, removing from localStorage");
            localStorage.removeItem('workflowSleuthSessionId');
          }
        }
        
        // If we reached here, we need to create a new session
        if (userInfo) {
          console.log("Creating new session for initial load");
          await createNewSession();
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error in session initialization:", error);
        setInitializationError("Failed to initialize session. Please refresh the page.");
        setIsInitialized(true);
      }
    };
    
    if (!isInitialized && userInfo) {
      initializeSession();
    }
  }, [userInfo, isInitialized]);

  // Load messages for a specific session
  const loadMessagesForSession = async (id: string) => {
    try {
      setIsLoading(true);
      setInitializationError(null);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        setInitializationError("Failed to load messages");
        setHasMessages(false);
        return false;
      }

      if (data && data.length > 0) {
        const loadedMessages = data.map(msg => ({
          id: msg.id,
          text: msg.content,
          isBot: msg.role === 'assistant',
          sessionId: msg.session_id
        }));
        
        setMessages(loadedMessages);
        setHasMessages(true);
        console.log(`Loaded ${loadedMessages.length} messages for session ${id}`);
        return true;
      } else {
        setMessages([]);
        setHasMessages(false);
        console.log(`No messages found for session ${id}`);
        return false;
      }
    } catch (error) {
      console.error("Error in loadMessagesForSession:", error);
      setInitializationError("Failed to load messages");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a brand new session
  const createNewSession = async () => {
    try {
      setIsLoading(true);
      setInitializationError(null);
      
      if (!userInfo) {
        console.log("No user info available, cannot create session");
        return null;
      }
      
      // Clear current state
      setMessages([]);
      setHasMessages(false);
      
      console.log("Creating new session with company name:", userInfo.companyName);

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
        setInitializationError("Failed to create new session");
        toast({
          title: "Error",
          description: "Failed to create a new session. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      if (data) {
        const newSessionId = data.id;
        console.log("Created new session with ID:", newSessionId);
        localStorage.setItem('workflowSleuthSessionId', newSessionId);
        setSessionId(newSessionId);
        return newSessionId;
      }
      
      return null;
    } catch (error) {
      console.error("Error in createNewSession:", error);
      setInitializationError("Failed to create new session");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for current session
  const loadMessages = async () => {
    if (!sessionId) return false;
    return loadMessagesForSession(sessionId);
  };

  return {
    sessionId,
    messages,
    isLoading,
    initializationError,
    hasMessages,
    isInitialized,
    setSessionId,
    setMessages,
    setIsLoading,
    loadMessages,
    loadMessagesForSession,
    createNewSession,
  };
};
