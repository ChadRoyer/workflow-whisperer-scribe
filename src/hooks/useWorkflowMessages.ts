
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { saveMessageToDatabase } from "@/services/messages";

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
  const handleSendMessage = async (message: string) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const userMessage = { text: message, isBot: false };
    const savedUserMessage = await saveMessageToDatabase(userMessage, sessionId);
    
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
      const savedBotMessage = await saveMessageToDatabase(botMessage, sessionId);
      
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
      await saveMessageToDatabase(errorMessage, sessionId);
      
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSendMessage,
  };
};
