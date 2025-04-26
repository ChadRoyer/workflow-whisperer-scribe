
import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatHistory } from "./ChatHistory";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useWorkflowSession } from "@/hooks/useWorkflowSession";
import { useWorkflowMessages } from "@/hooks/useWorkflowMessages";
import { useSessionTitle } from "@/hooks/useSessionTitle";

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
  } = useWorkflowSession();

  const { handleSendMessage } = useWorkflowMessages({
    sessionId,
    messages,
    setMessages,
    setIsLoading,
    initialMessageSent,
  });

  useSessionTitle(sessionId, messages);

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
