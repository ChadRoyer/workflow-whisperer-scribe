
import { useEffect, useRef } from 'react';
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

      return data;
    } catch (error) {
      console.error("Error in saveMessage:", error);
      return null;
    }
  };

  const sendInitialMessage = async () => {
    if (!sessionId || initialMessageSent.current) return;
    
    const initialMessage = {
      text: "Hi! I'm WorkflowSleuth. We'll list key workflows and pain points so we can spot AI wins. Let's start with the first question: Where does value first ENTER the business in a typical week?",
      isBot: true
    };
    
    const savedMessage = await saveMessage(initialMessage);
    if (savedMessage) {
      setMessages([initialMessage]);
      initialMessageSent.current = true;
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!initialMessageSent.current) {
      await sendInitialMessage();
    }

    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const userMessage = { text: message, isBot: false };
    const savedUserMessage = await saveMessage(userMessage);
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
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

      const botMessage = { text: data.reply, isBot: true };
      const savedBotMessage = await saveMessage(botMessage);
      
      setMessages(prev => [...prev, botMessage]);

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
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSendMessage,
    sendInitialMessage,
  };
};
