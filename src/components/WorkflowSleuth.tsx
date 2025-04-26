
import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatHistory } from "./ChatHistory";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
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
    const loadMessages = async () => {
      if (!sessionId) return;

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data) {
        const loadedMessages = data.map(msg => ({
          id: msg.id,
          text: msg.content,
          isBot: msg.role === 'assistant',
          sessionId: msg.session_id
        }));
        setMessages(loadedMessages);
      }
    };

    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      initializeSession();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSession = async () => {
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
      const newSessionId = data[0].id;
      setSessionId(newSessionId);
      
      const initialMessage = {
        text: "Hi! I'm WorkflowSleuth. We'll list key workflows and pain points so we can spot AI wins. Let's start with the first question: Where does value first ENTER the business in a typical week?",
        isBot: true
      };
      
      await saveMessage(initialMessage, newSessionId);
      setMessages([initialMessage]);
    }
  };

  const saveMessage = async (message: Message, currentSessionId?: string) => {
    if (!currentSessionId && !sessionId) {
      console.error("No session ID available");
      return null;
    }

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

  const handleSelectSession = async (selectedSessionId: string) => {
    setSessionId(selectedSessionId);
  };

  return (
    <div className="flex h-[80vh] w-full mx-auto gap-4">
      <SidebarProvider>
        <div className="w-64 min-w-64 border rounded-lg bg-card shadow-sm">
          <ChatHistory 
            sessionId={sessionId} 
            onSelectSession={handleSelectSession} 
          />
        </div>
      </SidebarProvider>
      <div className="flex-1 flex flex-col rounded-lg border border-border bg-card shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No messages yet.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id || index}
                isBot={message.isBot}
                message={message.text}
              />
            ))
          )}
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
    </div>
  );
};
