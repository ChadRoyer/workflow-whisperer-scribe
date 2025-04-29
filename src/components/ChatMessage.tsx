
import React, { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types";
import MermaidChart from "./MermaidChart";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLastMessage }) => {
  // Check if the message contains a mermaid chart
  const isMermaidChart = useMemo(() => {
    return message.text.trim().startsWith('%% ') || 
           message.text.trim().startsWith('graph ') || 
           message.text.trim().startsWith('flowchart ') || 
           message.text.trim().startsWith('sequenceDiagram');
  }, [message.text]);

  // Extract workflow title from mermaid chart if available
  const workflowTitle = useMemo(() => {
    if (isMermaidChart) {
      const firstLine = message.text.trim().split('\n')[0];
      if (firstLine.startsWith('%% ')) {
        return firstLine.substring(3).trim();
      }
    }
    return undefined;
  }, [isMermaidChart, message.text]);

  // If there's a session ID in the message and it's a mermaid chart, 
  // try to fetch the associated workflow ID
  const [workflowId, setWorkflowId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    const fetchWorkflowId = async () => {
      if (isMermaidChart && message.sessionId && workflowTitle) {
        try {
          const { data, error } = await supabase
            .from('workflows')
            .select('id')
            .eq('session_id', message.sessionId)
            .eq('title', workflowTitle)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (!error && data && data.length > 0) {
            setWorkflowId(data[0].id);
          }
        } catch (err) {
          console.error('Error fetching workflow ID:', err);
        }
      }
    };
    
    fetchWorkflowId();
  }, [isMermaidChart, message.sessionId, workflowTitle]);

  // Update the render logic to handle Mermaid charts
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
        {/* Render a mermaid chart if the message contains one */}
        {isMermaidChart ? (
          <MermaidChart 
            chart={message.text}
            workflowId={workflowId}
            workflowTitle={workflowTitle}
          />
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
