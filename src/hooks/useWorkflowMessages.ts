import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

interface WorkflowMessagesProps {
  sessionId: string | null;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  hasMessages: boolean;
}

export const useWorkflowMessages = ({
  sessionId,
  messages,
  setMessages,
  setIsLoading,
  hasMessages,
}: WorkflowMessagesProps) => {
  const saveMessage = async (message: Message, currentSessionId?: string) => {
    if (!currentSessionId && !sessionId) {
      console.error("No session ID available");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId || sessionId,
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

  const checkSessionHasMessages = useCallback(async (sid: string | null) => {
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
      console.error("Error in checkSessionHasMessages:", error);
      return false;
    }
  }, []);

  const sendInitialMessage = useCallback(async () => {
    if (!sessionId) {
      console.error("Cannot send initial message - no sessionId");
      return false;
    }
    
    // Verify this session has no messages in the database before sending initial message
    const hasExistingMessages = await checkSessionHasMessages(sessionId);
    
    if (hasExistingMessages || hasMessages) {
      console.log("Session already has messages, skipping initial message");
      return false;
    }
    
    console.log("Sending initial message for empty session:", sessionId);
    
    const initialMessage = {
      text: "Hi! I'm WorkflowSleuth. We'll list key workflows and pain points so we can spot AI wins. Let's start with the first question: Where does value first ENTER the business in a typical week?",
      isBot: true
    };
    
    const savedMessage = await saveMessage(initialMessage);
    if (savedMessage) {
      console.log("Initial message sent successfully");
      setMessages([{
        id: savedMessage.id,
        text: initialMessage.text,
        isBot: true,
        sessionId: savedMessage.session_id
      }]);
      return true;
    } else {
      console.error("Failed to send initial message");
      // Add the message to the UI anyway so the user can interact
      setMessages([initialMessage]);
      toast({
        title: "Warning",
        description: "The chat is working, but messages may not be saved properly.",
        variant: "default",
      });
      return false;
    }
  }, [sessionId, setMessages, hasMessages, checkSessionHasMessages]);

  const handleSendMessage = async (message: string) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a new session with no messages
    if (messages.length === 0 && !hasMessages) {
      console.log("No messages in session, sending initial message first");
      await sendInitialMessage();
    }

    const userMessage = { text: message, isBot: false };
    const savedUserMessage = await saveMessage(userMessage);
    
    // Add user message to UI even if saving fails
    const newUserMessage = savedUserMessage ? 
      { id: savedUserMessage.id, text: message, isBot: false, sessionId: savedUserMessage.session_id } : 
      userMessage;
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      console.log("Calling workflow-sleuth function with:", {
        message,
        sessionId,
        messages: updatedMessages
      });
      
      const { data, error } = await supabase.functions.invoke('workflow-sleuth', {
        body: {
          message,
          sessionId,
          messages: updatedMessages
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log("Received response from workflow-sleuth:", data);
      
      const botMessage = { text: data.reply, isBot: true };
      const savedBotMessage = await saveMessage(botMessage);
      
      // Add bot message to UI even if saving fails
      const newBotMessage = savedBotMessage ? 
        { id: savedBotMessage.id, text: data.reply, isBot: true, sessionId: savedBotMessage.session_id } : 
        botMessage;
      
      setMessages([...updatedMessages, newBotMessage]);

    } catch (error) {
      console.error("Error calling edge function:", error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
      
      const errorMessage = { 
        text: "I'm sorry, I encountered an error processing your message. Please try again.",
        isBot: true 
      };
      await saveMessage(errorMessage);
      
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSendMessage,
    sendInitialMessage,
  };
};
