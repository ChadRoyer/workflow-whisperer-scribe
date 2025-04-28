
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

interface WorkflowSessionReturn {
  sessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  hasMessages: boolean;
  isInitialized: boolean;
  initializationError: string | null;
  setSessionId: (id: string | null) => void;
  setMessages: (messages: Message[] | ((prevMessages: Message[]) => Message[])) => void;
  setIsLoading: (loading: boolean) => void;
  loadMessagesForSession: (id: string) => Promise<Message[]>;
  createNewSession: () => Promise<{ id: string } | null>;
  initializeSession: () => Promise<void>;
}

export const useWorkflowSession = (): WorkflowSessionReturn => {
  const { userInfo } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const initializeSession = async () => {
    try {
      const storedSessionId = localStorage.getItem('workflowSleuthSessionId');
      
      if (storedSessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id, company_name')
          .eq('id', storedSessionId)
          .single();

        if (!sessionError && sessionData) {
          setSessionId(storedSessionId);
          const loadedMessages = await loadMessagesForSession(storedSessionId);
          setMessages(loadedMessages || []);
          setIsLoading(false);
          return;
        }
      }

      if (userInfo) {
        // Create a new session
        const newSession = await createNewSession();
        
        if (!newSession) {
          throw new Error('Failed to create new session');
        }

        setSessionId(newSession.id);
        localStorage.setItem('workflowSleuthSessionId', newSession.id);
        
        // Add initial welcome message
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: newSession.id,
            role: 'assistant',
            content: `Hello! I'm WorkflowSleuth, and I'm here to help you map and optimize workflows at ${userInfo.companyName}. What workflow would you like to explore today?`
          });

        if (messageError) {
          console.error('Error seeding initial message:', messageError);
          // Continue despite the error - we'll load whatever messages did save
        }
        
        const loadedMessages = await loadMessagesForSession(newSession.id);
        setMessages(loadedMessages || []);
      }
    } catch (error) {
      console.error("Session initialization error:", error);
      setInitializationError("Failed to initialize session");
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
      // First check if the company name exists
      const companyName = userInfo.companyName || 'Unknown Company';
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          facilitator: 'WorkflowSleuth',
          company_name: companyName,
          title: 'New Chat',
          finished: false
        })
        .select()
        .single();

      if (error) {
        console.error("Session creation error:", error);
        toast({
          title: "Error",
          description: "Failed to create a new session. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error creating session:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating a new session.",
        variant: "destructive"
      });
      return null;
    }
  };

  const checkHasMessages = async (sid: string | null) => {
    if (!sid) return false;
    
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sid);
      
      if (error) {
        console.error("Error checking for messages:", error);
        return false;
      }
      
      return count !== null && count > 0;
    } catch (error) {
      console.error("Error in checkHasMessages:", error);
      return false;
    }
  };

  useEffect(() => {
    if (userInfo) {
      initializeSession();
    }
  }, [userInfo]);

  return {
    sessionId,
    messages,
    isLoading,
    hasMessages: messages.length > 0,
    isInitialized: sessionId !== null,
    initializationError,
    setSessionId,
    setMessages,
    setIsLoading,
    loadMessagesForSession,
    createNewSession,
    initializeSession
  };
};
