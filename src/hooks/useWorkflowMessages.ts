
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
  initialMessageSent: React.MutableRefObject<boolean>;
}

export const useWorkflowMessages = ({
  sessionId,
  messages,
  setMessages,
  setIsLoading,
  initialMessageSent,
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

  const sendInitialMessage = useCallback(async () => {
    if (!sessionId) {
      console.error("Cannot send initial message - no sessionId");
      return;
    }
    
    // Check existing messages in the database to avoid duplicating the intro
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1);
      
      if (error) {
        console.error("Error checking for existing messages:", error);
      }
      
      // If messages already exist, don't send the intro again
      if (data && data.length > 0) {
        console.log("Messages already exist for this session, skipping intro");
        initialMessageSent.current = true;
        return;
      }
    } catch (error) {
      console.error("Error checking for messages:", error);
    }
    
    // Double-check that we haven't already sent the initial message
    // or that there are no existing messages
    if (initialMessageSent.current || messages.length > 0) {
      console.log("Initial message already sent or messages exist, skipping");
      initialMessageSent.current = true;
      return;
    }
    
    console.log("Sending initial message for session:", sessionId);
    
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
      initialMessageSent.current = true;
    } else {
      console.error("Failed to send initial message");
      // Add the message to the UI anyway so the user can interact
      setMessages([initialMessage]);
      initialMessageSent.current = true;
      toast({
        title: "Warning",
        description: "The chat is working, but messages may not be saved properly.",
        variant: "default",
      });
    }
  }, [sessionId, setMessages, initialMessageSent, messages.length]);

  const handleSendMessage = async (message: string) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Only send initial message if we have no messages yet and it hasn't been sent
    if (messages.length === 0 && !initialMessageSent.current) {
      console.log("Sending initial message before user message");
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
