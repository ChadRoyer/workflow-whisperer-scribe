
import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Message {
  text: string;
  isBot: boolean;
}

interface Workflow {
  id: string;
  title: string;
  start_event: string;
  end_event: string;
  people: string[];
  systems: string[];
  pain_point: string | null;
}

export const WorkflowSleuth = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize session
    initializeSession();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSession = async () => {
    // Create a new session
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        { 
          facilitator: 'WorkflowSleuth', 
          company_name: 'Your Company',
          finished: false
        }
      ])
      .select();

    if (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to initialize session. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (data && data.length > 0) {
      setSessionId(data[0].id);
      
      // Add initial bot message
      setMessages([
        {
          text: "Hi! I'm WorkflowSleuth. We'll list key workflows and pain points so we can spot AI wins. Let's start with the first question: Where does value first ENTER the business in a typical week?",
          isBot: true,
        },
      ]);
    }
  };

  const fetchWorkflows = async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error("Error fetching workflows:", error);
      return;
    }

    if (data) {
      setWorkflows(data as Workflow[]);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Add user message
    const updatedMessages = [...messages, { text: message, isBot: false }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Call the edge function
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

      // Add bot response
      setMessages(prev => [...prev, { text: data.reply, isBot: true }]);

      // If a workflow was added, fetch updated workflows
      if (data.addedWorkflow) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error("Error calling edge function:", error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => [...prev, { 
        text: "I'm sorry, I encountered an error processing your message. Please try again.",
        isBot: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-2xl mx-auto p-4 rounded-lg border border-border bg-card shadow-sm">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            isBot={message.isBot}
            message={message.text}
          />
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-pulse text-muted-foreground">
              WorkflowSleuth is thinking...
            </div>
          </div>
        )}
      </div>
      <div className="mt-auto p-4 border-t border-border">
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};
