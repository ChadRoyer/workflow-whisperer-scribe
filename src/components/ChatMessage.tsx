
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  isBot: boolean;
  message: string;
}

export const ChatMessage = ({ isBot, message }: ChatMessageProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const renderMermaidDiagram = async () => {
      if (!mermaidRef.current || !message) return;
      
      if (!isMermaidDiagram(message)) return;
      
      try {
        console.log("Attempting to render Mermaid diagram:", message);
        
        // Initialize mermaid with desired configuration
        mermaid.initialize({ 
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
          logLevel: 3,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        });
        
        // Clear previous content
        mermaidRef.current.innerHTML = '';
        
        // Create a unique ID for this diagram
        const id = `mermaid-${Date.now()}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, message);
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          setRenderError(null);
          console.log("Successfully rendered Mermaid diagram");
        }
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
        setRenderError((error as Error).message || 'Unknown error');
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="p-2 border border-red-300 bg-red-50 text-red-800 rounded">
              Error rendering diagram: ${(error as Error).message || 'Unknown error'}
            </div>
            <pre class="p-2 mt-2 text-xs bg-gray-100 overflow-auto rounded">${message}</pre>
          `;
        }
      }
    };

    // Only attempt to render if we have a message
    if (message) {
      renderMermaidDiagram();
    }
  }, [message]);

  // Improved detection for Mermaid diagrams with multiple syntaxes
  const isMermaidDiagram = (text: string): boolean => {
    if (!text) return false;
    
    const mermaidPatterns = [
      /^\s*flowchart\s+/i,
      /^\s*graph\s+/i,
      /^\s*sequenceDiagram/i,
      /^\s*classDiagram/i,
      /^\s*stateDiagram/i,
      /^\s*erDiagram/i,
      /^\s*gantt/i,
      /^\s*pie/i,
      /^\s*gitGraph/i,
      /^\s*journey/i,
      /^\s*mindmap/i
    ];
    
    return mermaidPatterns.some(pattern => pattern.test(text.trim()));
  };

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
        {message && isMermaidDiagram(message) ? (
          <div className="mermaid-container w-full">
            <div ref={mermaidRef} className="mermaid-diagram overflow-auto max-w-full w-full" />
            {renderError && (
              <div className="mt-2 p-2 text-xs bg-gray-100 rounded">
                <p className="text-red-500 font-bold">Error rendering diagram:</p>
                <p>{renderError}</p>
                <p className="mt-2 font-bold">Diagram source:</p>
                <pre className="whitespace-pre-wrap overflow-x-auto">{message}</pre>
              </div>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message}</p>
        )}
      </div>
    </div>
  );
};
