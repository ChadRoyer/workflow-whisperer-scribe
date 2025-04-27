
import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatHistory } from "./chat/ChatHistory";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useWorkflowSession } from "@/hooks/useWorkflowSession";
import { useWorkflowMessages } from "@/hooks/useWorkflowMessages";
import { useSessionTitle } from "@/hooks/useSessionTitle";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

export const WorkflowSleuth = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userInfo } = useAuth();
  const [renderError, setRenderError] = useState<string | null>(null);
  const [prevSessionId, setPrevSessionId] = useState<string | null>(null);
  
  const {
    sessionId,
    messages,
    isLoading,
    hasMessages,
    setSessionId,
    setMessages,
    setIsLoading,
    initialMessageSent,
    initializationError,
    loadMessages,
    createNewSession
  } = useWorkflowSession();

  const { handleSendMessage, sendInitialMessage } = useWorkflowMessages({
    sessionId,
    messages,
    setMessages,
    setIsLoading,
    initialMessageSent,
  });

  useSessionTitle(sessionId, messages);

  // Effect to detect session changes and ensure messages are loaded
  useEffect(() => {
    if (sessionId && sessionId !== prevSessionId) {
      console.log(`Session changed from ${prevSessionId} to ${sessionId}, loading messages`);
      setPrevSessionId(sessionId);
      loadMessages();
    }
  }, [sessionId, prevSessionId, loadMessages]);

  // Only send initial message for new sessions with no messages
  useEffect(() => {
    if (sessionId && messages.length === 0 && !initialMessageSent.current && !hasMessages) {
      try {
        console.log("Sending initial message for new empty session");
        sendInitialMessage();
      } catch (error) {
        console.error("Error in initial message effect:", error);
        setRenderError("Failed to initialize chat. Please refresh the page.");
      }
    }
  }, [sessionId, messages.length, hasMessages, sendInitialMessage, initialMessageSent]);

  const handleSelectSession = async (selectedSessionId: string) => {
    try {
      if (selectedSessionId === sessionId) return;
      
      // Clear messages temporarily while we load the new session
      setMessages([]);
      initialMessageSent.current = false;
      setSessionId(selectedSessionId);
      
      // Messages will be loaded in the effect above when sessionId changes
    } catch (error) {
      console.error("Error selecting session:", error);
      toast({
        title: "Error",
        description: "Failed to select chat session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewChat = async () => {
    try {
      // Clear current state
      setMessages([]);
      initialMessageSent.current = false;
      
      // Create a new session
      await createNewSession();
      
      // The rest will be handled by the effects when sessionId changes
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: "Failed to create a new chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // If no user info is available yet, show a loading state
  if (!userInfo) {
    return (
      <div className="flex h-[80vh] w-full mx-auto items-center justify-center">
        <p className="text-muted-foreground">Initializing application...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] w-full mx-auto overflow-hidden">
      <div className="w-64 min-w-64 border rounded-lg bg-card shadow-sm overflow-hidden">
        <SidebarProvider>
          <ChatHistory 
            sessionId={sessionId} 
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat} 
          />
        </SidebarProvider>
      </div>
      <div className="flex-1 flex flex-col rounded-lg border border-border bg-card shadow-sm ml-4">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(initializationError || renderError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                {initializationError || renderError}. Please try refreshing the page or contact support.
              </AlertDescription>
            </Alert>
          )}
          {messages.length === 0 && !isLoading && !initializationError && !renderError ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Initializing chat for {userInfo.companyName}...</p>
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
          <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={isLoading || (!sessionId) || !!initializationError || !!renderError} 
          />
        </div>
      </div>
    </div>
  );
};
