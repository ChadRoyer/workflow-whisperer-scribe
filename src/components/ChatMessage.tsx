
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  isBot: boolean;
  message: string;
}

export const ChatMessage = ({ isBot, message }: ChatMessageProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMermaidDiagram = async () => {
      if (mermaidRef.current && isMermaidDiagram) {
        try {
          // Initialize mermaid with desired configuration
          mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            logLevel: 5 // Add more verbose logging
          });
          
          // Clear previous content
          mermaidRef.current.innerHTML = '';
          
          // Create a unique ID for this diagram
          const id = `mermaid-${Date.now()}`;
          
          console.log('Attempting to render Mermaid diagram with content:', message);
          
          // Render the diagram
          const { svg } = await mermaid.render(id, message);
          
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
            console.log('Successfully rendered Mermaid diagram');
          }
        } catch (error) {
          console.error('Failed to render Mermaid diagram:', error);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `<div class="p-2 border border-red-300 bg-red-50 text-red-800 rounded">
              Error rendering diagram: ${(error as Error).message || 'Unknown error'}
            </div>`;
          }
        }
      }
    };

    renderMermaidDiagram();
  }, [message]);

  // Improved detection of Mermaid diagrams - check for various Mermaid syntax patterns
  const isMermaidDiagram = /^(graph|subgraph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(message.trim());

  return (
    <div
      className={cn(
        'flex w-full',
        isBot ? 'justify-start' : 'justify-end'
      )}
    >
      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[80%]',
          isBot ? 'bg-secondary' : 'bg-primary text-primary-foreground'
        )}
      >
        {isMermaidDiagram ? (
          <div ref={mermaidRef} className="mermaid-diagram overflow-auto max-w-full" />
        ) : (
          <p className="whitespace-pre-wrap">{message}</p>
        )}
      </div>
    </div>
  );
};
