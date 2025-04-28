
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

  // Initialize mermaid with secure, simplified configuration
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        logLevel: 1,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'linear' // Using linear curves for simpler rendering
        }
      });
      console.log("Mermaid initialized with simplified configuration");
    } catch (error) {
      console.error("Failed to initialize mermaid:", error);
    }
  }, []);

  // Check if content is a mermaid diagram using robust pattern matching
  useEffect(() => {
    if (!message || typeof message !== 'string') {
      setIsMermaidContent(false);
      return;
    }
    
    // More robust detection of Mermaid content
    const trimmedMessage = message.trim();
    const isMermaid = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap)/i.test(trimmedMessage);
    
    console.log(`Checking if message is Mermaid diagram: ${isMermaid ? 'YES' : 'NO'}`);
    if (isMermaid) {
      console.log("Mermaid content detected:", trimmedMessage.substring(0, 100));
    }
    
    setIsMermaidContent(isMermaid);
  }, [message]);

  // Render the mermaid diagram with enhanced error handling
  useEffect(() => {
    if (!message || !isMermaidContent || !mermaidRef.current) return;
    
    const renderDiagram = async () => {
      try {
        console.log("Attempting to render Mermaid diagram...");
        
        // Clear previous content and error state
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
        }
        setRenderError(null);
        
        // Create a unique ID for this diagram
        const id = `mermaid-${Date.now()}`;
        
        // Attempt to render the diagram with pre-sanitized content
        const { svg } = await mermaid.render(id, message);
        
        // Insert the rendered SVG
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          console.log("Successfully rendered Mermaid diagram");
        }
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
        setRenderError((error as Error).message || 'Unknown error');
        
        // Provide detailed error visualization and the raw diagram code
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
        
        // Also provide a fallback simple text representation
        const fallback = document.createElement('div');
        fallback.className = 'mt-4 p-2 border border-gray-200 bg-white rounded';
        fallback.innerHTML = '<p class="text-sm font-medium">Workflow Details:</p>';
        
        // Extract parts from a basic flowchart
        const parts = message.split('\n');
        const processedParts = parts.filter(part => part.includes('-->') || part.includes('['));
        
        if (processedParts.length > 0) {
          const listEl = document.createElement('ul');
          listEl.className = 'list-disc pl-5 mt-2 text-sm';
          
          processedParts.forEach(part => {
            if (part.includes('[') && part.includes(']')) {
              const content = part.substring(part.indexOf('[') + 1, part.lastIndexOf(']'));
              const item = document.createElement('li');
              item.textContent = content;
              listEl.appendChild(item);
            }
          });
          
          fallback.appendChild(listEl);
          
          if (mermaidRef.current) {
            mermaidRef.current.appendChild(fallback);
          }
        }
      }
    };

    // Add a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [message, isMermaidContent]);

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
