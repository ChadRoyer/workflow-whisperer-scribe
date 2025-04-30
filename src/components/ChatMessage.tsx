
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLastMessage }) => {
  // Check if message contains a Mermaid Live link
  const mermaidLiveLink = useMemo(() => {
    // Match Mermaid Live links in markdown format
    const linkMatch = message.text.match(/\*\*\[Open in Mermaid Live\]\((https:\/\/mermaid\.live\/edit#.+?)\)\*\*/);
    return linkMatch ? linkMatch[1] : null;
  }, [message.text]);

  // Process message text to convert markdown links to HTML
  const processedText = useMemo(() => {
    let text = message.text;
    
    // Convert markdown links to HTML
    text = text.replace(/\*\*\[(.+?)\]\((.+?)\)\*\*/g, '<a href="$2" target="_blank" class="text-primary underline font-bold">$1</a>');
    
    // Convert other bold markdown
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert other emphasizes
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    return text;
  }, [message.text]);

  return (
    <div
      className={cn(
        "py-4 flex",
        message.isBot ? "justify-start" : "justify-end",
        isLastMessage && "mb-16"
      )}
    >
      <div
        className={cn(
          "relative max-w-full lg:max-w-[75%] px-4 py-2 rounded-lg",
          message.isBot
            ? "bg-muted/40 text-left"
            : "bg-primary text-primary-foreground text-right"
        )}
      >
        {mermaidLiveLink ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-2">
              <div className="animate-pulse p-2 rounded bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <a 
                  href={mermaidLiveLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium flex items-center"
                >
                  <span>Open Workflow Diagram</span>
                  <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
            <div 
              className="whitespace-pre-wrap break-words" 
              dangerouslySetInnerHTML={{ __html: processedText }} 
            />
          </div>
        ) : (
          <div 
            className="whitespace-pre-wrap break-words" 
            dangerouslySetInnerHTML={{ __html: processedText }} 
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
