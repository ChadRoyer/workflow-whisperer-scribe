
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
  const [isMermaidContent, setIsMermaidContent] = useState<boolean>(false);

  // Initialize mermaid with configuration once at component mount
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        logLevel: 1, // Less verbose logging
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });
    } catch (error) {
      console.error("Failed to initialize mermaid:", error);
    }
  }, []);

  // Check for Mermaid diagram immediately
  useEffect(() => {
    // Safety check for null/empty messages
    if (!message) return;
    
    const result = checkForMermaid(message);
    setIsMermaidContent(result);
  }, [message]);

  // Render diagram effect
  useEffect(() => {
    if (!message || !isMermaidContent || !mermaidRef.current) return;
    
    const renderDiagram = async () => {
      try {
        console.log("Attempting to render diagram with content:", message);
        
        // Clear previous content and error state
        mermaidRef.current.innerHTML = '';
        setRenderError(null);
        
        // Create a unique ID for this diagram
        const id = `mermaid-${Date.now()}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, message);
        
        // Insert the rendered SVG
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          console.log("Successfully rendered Mermaid diagram");
        }
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
        setRenderError((error as Error).message || 'Unknown error');
        
        // Display error message and diagram source for debugging
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

    renderDiagram();
  }, [message, isMermaidContent]);

  // Improved detection for Mermaid diagrams with multiple syntaxes
  const checkForMermaid = (text: string): boolean => {
    if (!text) return false;
    
    // Detect various Mermaid diagram types
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

  // Fallback for empty messages
  if (!message) {
    return null; // Don't render anything for empty messages
  }

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
        {isMermaidContent ? (
          <div className="mermaid-container" style={{ width: '100%', maxWidth: '600px' }}>
            <div ref={mermaidRef} className="mermaid-diagram overflow-auto max-w-full" />
            {renderError && (
              <div className="mt-2 p-2 text-xs bg-gray-100 rounded">
                <p className="text-red-500 font-bold">Error rendering diagram:</p>
                <p>{renderError}</p>
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
