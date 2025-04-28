
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

  // Check if content is a mermaid diagram
  useEffect(() => {
    if (!message || typeof message !== 'string') {
      setIsMermaidContent(false);
      return;
    }
    
    // Check if the message appears to be a mermaid diagram
    const isMermaid = checkForMermaid(message);
    setIsMermaidContent(isMermaid);
    
    console.log(`Message ${isMermaid ? 'is' : 'is not'} a Mermaid diagram: ${message.substring(0, 50)}...`);
  }, [message]);

  // Render the mermaid diagram
  useEffect(() => {
    if (!message || !isMermaidContent || !mermaidRef.current) return;
    
    const renderDiagram = async () => {
      try {
        console.log("Attempting to render diagram...");
        
        // Clear previous content and error state
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
        }
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
        
        // Provide better error visualization and the raw diagram code
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="p-2 border border-red-300 bg-red-50 text-red-800 rounded mb-4">
              <strong>Error rendering diagram:</strong><br/> 
              ${(error as Error).message || 'Unknown error'}
            </div>
            <div class="p-2 border border-gray-200 bg-gray-50 rounded">
              <h4 class="font-medium mb-2">Diagram source code:</h4>
              <pre class="text-xs bg-gray-100 p-2 overflow-auto rounded">${message}</pre>
            </div>
          `;
        }
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [message, isMermaidContent]);

  // Detect various types of Mermaid diagrams with better pattern matching
  const checkForMermaid = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;
    
    // Trim and get first 150 chars for performance
    const firstLines = text.trim().substring(0, 150);
    
    // Common Mermaid diagram markers at the start of the text
    return /^\s*flowchart\s+/i.test(firstLines) ||
           /^\s*graph\s+/i.test(firstLines) ||
           /^\s*sequenceDiagram/i.test(firstLines) ||
           /^\s*classDiagram/i.test(firstLines) ||
           /^\s*stateDiagram/i.test(firstLines) ||
           /^\s*erDiagram/i.test(firstLines) ||
           /^\s*gantt/i.test(firstLines) ||
           /^\s*pie/i.test(firstLines) ||
           /^\s*gitGraph/i.test(firstLines) ||
           /^\s*journey/i.test(firstLines) ||
           /^\s*mindmap/i.test(firstLines);
  };

  // Fallback for empty messages
  if (!message) {
    return null;
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
            {renderError && !mermaidRef.current?.innerHTML && (
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
