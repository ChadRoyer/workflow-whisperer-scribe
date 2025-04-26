
import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatHistory } from "./ChatHistory";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useWorkflowSession } from "@/hooks/useWorkflowSession";
import { useWorkflowMessages } from "@/hooks/useWorkflowMessages";
import { useSessionTitle } from "@/hooks/useSessionTitle";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const WorkflowSleuth = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    sessionId,
    messages,
    isLoading,
    setSessionId,
    setMessages,
    setIsLoading,
    initialMessageSent,
    initializationError,
  } = useWorkflowSession();

  const { handleSendMessage, sendInitialMessage } = useWorkflowMessages({
    sessionId,
    messages,
    setMessages,
    setIsLoading,
    initialMessageSent,
  });

  useSessionTitle(sessionId, messages);

  // Force initial message when component mounts if we have a session
  useEffect(() => {
    if (sessionId && messages.length === 0 && !initialMessageSent.current) {
      console.log("WorkflowSleuth component mounted - sending initial message");
      sendInitialMessage();
    }
  }, [sessionId, messages.length, sendInitialMessage]);

  const handleSelectSession = async (selectedSessionId: string) => {
    if (selectedSessionId === sessionId) return;
    setMessages([]);
    initialMessageSent.current = false;
    setSessionId(selectedSessionId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-[80vh] w-full mx-auto overflow-hidden">
      <div className="w-64 min-w-64 border rounded-lg bg-card shadow-sm overflow-hidden">
        <SidebarProvider>
          <ChatHistory 
            sessionId={sessionId} 
            onSelectSession={handleSelectSession} 
          />
        </SidebarProvider>
      </div>
      <div className="flex-1 flex flex-col rounded-lg border border-border bg-card shadow-sm ml-4">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {initializationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                {initializationError}. Please try refreshing the page or contact support.
              </AlertDescription>
            </Alert>
          )}
          {messages.length === 0 && !isLoading && !initializationError ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Initializing chat...</p>
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
            disabled={isLoading || (!sessionId) || !!initializationError} 
          />
        </div>
      </div>
    </div>
  );
};
