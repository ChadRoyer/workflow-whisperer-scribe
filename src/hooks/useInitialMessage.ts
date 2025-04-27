
import { toast } from "@/components/ui/use-toast";
import { saveMessageToDatabase, checkSessionHasMessages } from "@/services/messages";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

export const useInitialMessage = (
  sessionId: string | null,
  hasMessages: boolean,
  setMessages: (messages: Message[]) => void
) => {
  const sendInitialMessage = async () => {
    if (!sessionId) return false;
    
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
    
    const savedMessage = await saveMessageToDatabase(initialMessage, sessionId);
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
      setMessages([initialMessage]);
      toast({
        title: "Warning",
        description: "The chat is working, but messages may not be saved properly.",
        variant: "default",
      });
      return false;
    }
  };

  return { sendInitialMessage };
};
