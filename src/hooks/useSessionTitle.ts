
import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

export const useSessionTitle = (sessionId: string | null, messages: Message[]) => {
  const titleGenerated = useRef(false);

  useEffect(() => {
    // Only generate title when we have at least 2 user messages (excluding bot responses)
    const userMessages = messages.filter(msg => !msg.isBot);
    if (userMessages.length >= 2 && sessionId && !titleGenerated.current) {
      titleGenerated.current = true;
      generateSessionTitle();
    }
  }, [messages, sessionId]);

  const generateSessionTitle = async () => {
    if (!sessionId || messages.length < 3) return;

    try {
      const titleGenerationMessages = messages
        .filter(msg => !msg.isBot)  // Only use user messages for context
        .slice(0, 5)
        .map(msg => ({
          role: 'user',
          text: msg.text
        }));

      await supabase.functions.invoke('generate-session-title', {
        body: {
          sessionId,
          messages: titleGenerationMessages
        }
      });
    } catch (error) {
      console.error('Error in generateSessionTitle:', error);
    }
  };
};
