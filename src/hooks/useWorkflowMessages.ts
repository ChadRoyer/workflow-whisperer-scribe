
import { useEffect } from 'react';
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

  const sendInitialMessage = async () => {
    if (!sessionId) {
      console.error("Cannot send initial message - no sessionId");
      return;
    }
    
    if (initialMessageSent.current) {
      console.log("Initial message already sent");
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
      setMessages([initialMessage]);
      initialMessageSent.current = true;
    } else {
      console.error("Failed to send initial message");
    }
  };

  // Add a useEffect to check if we need to send the initial message
  useEffect(() => {
    if (sessionId && !initialMessageSent.current && messages.length === 0) {
      console.log("Attempting to send initial message");
      sendInitialMessage();
    }
  }, [sessionId, messages.length]);

  const handleSendMessage = async (message: string) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (!initialMessageSent.current) {
      console.log("Sending initial message before user message");
      await sendInitialMessage();
    }

    const userMessage = { text: message, isBot: false };
    const savedUserMessage = await saveMessage(userMessage);
    
    const updatedMessages = [...messages, userMessage];
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
      
      setMessages([...updatedMessages, botMessage]);

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
