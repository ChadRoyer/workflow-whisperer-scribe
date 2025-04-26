
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

export const useSessionTitle = (sessionId: string | null, messages: Message[]) => {
  useEffect(() => {
    if (messages.length >= 3 && sessionId) {
      generateSessionTitle();
    }
  }, [messages, sessionId]);

  const generateSessionTitle = async () => {
    if (!sessionId || messages.length < 3) return;

    try {
      const titleGenerationMessages = messages.slice(0, 5).map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
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
