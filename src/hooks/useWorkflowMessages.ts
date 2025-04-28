

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
  setMessages: (messages: Message[] | ((prevMessages: Message[]) => Message[])) => void;
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

    // First, verify the session exists before trying to save messages
    try {
      const { data: sessionExists, error: sessionCheckError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();
      
      if (sessionCheckError || !sessionExists) {
        console.error("Session does not exist:", sessionId);
        toast({
          title: "Error",
          description: "The current session no longer exists. Please create a new chat.",
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
        // Set up a timeout for the function call
        let timeoutId: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Request timeout after 10 seconds'));
          }, 10000);
        });

        console.log("Calling workflow-sleuth function with:", {
          message,
          sessionId,
          messages: updatedMessages
        });
        
        // Race the function call against the timeout
        const functionPromise = supabase.functions.invoke('workflow-sleuth', {
          body: {
            message,
            sessionId,
            messages: updatedMessages
          }
        });

        // Use Promise.race to implement the timeout
        const result = await Promise.race([
          functionPromise,
          timeoutPromise
        ]);

        // Clear the timeout since the promise resolved before the timeout
        clearTimeout(timeoutId!);

        const { data, error } = result as Awaited<typeof functionPromise>;

        if (error) {
          throw new Error(error.message);
        }

        console.log("Received response from workflow-sleuth:", data);
        
        if (!data || typeof data.reply !== 'string') {
          throw new Error('Invalid response from server');
        }
        
        const botMessage = { text: data.reply, isBot: true };
        const savedBotMessage = await saveMessageToDatabase(botMessage, sessionId);
        
        const newBotMessage = savedBotMessage ? 
          { id: savedBotMessage.id, text: data.reply, isBot: true, sessionId: savedBotMessage.session_id } : 
          botMessage;
        
        setMessages([...updatedMessages, newBotMessage]);
        
        // Handle additional follow-up message if provided
        if (data.nextMessage) {
          const followUpMessage = { text: data.nextMessage, isBot: true };
          const savedFollowUpMessage = await saveMessageToDatabase(followUpMessage, sessionId);
          
          const newFollowUpMessage = savedFollowUpMessage ? 
            { id: savedFollowUpMessage.id, text: data.nextMessage, isBot: true, sessionId: savedFollowUpMessage.session_id } : 
            followUpMessage;
          
          setMessages((prevMessages) => [...prevMessages, newFollowUpMessage] as Message[]);
        }

      } catch (error) {
        console.error("Error calling edge function:", error);
        
        // Check if it's a timeout error
        if (error.message?.includes('timeout')) {
          toast({
            title: "Timeout",
            description: "The request took too long. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to process your message. Please try again.",
            variant: "destructive",
          });
        }
        
        const errorMessage = { 
          text: "I'm sorry, I encountered an error processing your message. Please try again.",
          isBot: true 
        };
        // Don't try to save error message if session doesn't exist anymore
        
        setMessages([...updatedMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error verifying session:", error);
      toast({
        title: "Error",
        description: "Failed to verify session. Please refresh and try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return {
    handleSendMessage,
  };
};
