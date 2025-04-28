
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
  const [diagramId, setDiagramId] = useState<string>(`mermaid-${Date.now()}`);

  // Initialize mermaid with secure, simplified configuration
  useEffect(() => {
    try {
      // Configure mermaid with improved settings
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        logLevel: 1,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'linear'
        }
      });
      console.log("Mermaid initialized in ChatMessage component");
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
    
    // Detect Mermaid content using the most reliable indicators
    const trimmedMessage = message.trim();
    
    // Method 1: Check for explicit mermaid block markers
    const hasMermaidCodeBlock = trimmedMessage.startsWith('```mermaid') || 
                               trimmedMessage.includes('\n```mermaid');
    
    // Method 2: Check for graph/flowchart syntax patterns
    const hasGraphSyntax = /^(%%.+\n)?(graph|flowchart)\s+(TB|TD|BT|RL|LR)/im.test(trimmedMessage);
    
    const isMermaid = hasMermaidCodeBlock || hasGraphSyntax;
    
    console.log(`Checking if message is Mermaid diagram: ${isMermaid ? 'YES' : 'NO'}`);
    if (isMermaid) {
      console.log("Mermaid content detected");
      // Generate a new ID for each new diagram to avoid conflicts
      setDiagramId(`mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
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
        
        // Extract the mermaid code from markdown code blocks if present
        let mermaidCode = message.trim();
        if (mermaidCode.startsWith('```mermaid')) {
          mermaidCode = mermaidCode.replace(/```mermaid\n/, '').replace(/\n```$/, '');
        }
        
        // Attempt to render the diagram with the sanitized content
        const { svg } = await mermaid.render(diagramId, mermaidCode);
        
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
        const processedParts = parts.filter(part => 
          part.includes('-->') || 
          part.includes('[') || 
          part.includes('(') ||
          part.includes('%%')
        );
        
        if (processedParts.length > 0) {
          const listEl = document.createElement('ul');
          listEl.className = 'list-disc pl-5 mt-2 text-sm';
          
          processedParts.forEach(part => {
            // Extract node content from various formats
            let content = null;
            
            if (part.startsWith('%%')) {
              // Title comment
              content = 'Title: ' + part.substring(2).trim();
            } else if (part.includes('[') && part.includes(']')) {
              // Square bracket nodes
              content = part.substring(part.indexOf('[') + 1, part.lastIndexOf(']'));
            } else if (part.includes('(') && part.includes(')')) {
              // Round bracket nodes
              content = part.substring(part.indexOf('(') + 1, part.lastIndexOf(')'));
            } else if (part.includes('{') && part.includes('}')) {
              // Curly bracket nodes
              content = part.substring(part.indexOf('{') + 1, part.lastIndexOf('}'));
            } else if (part.includes('-->')) {
              // Arrow connections
              content = 'Flow: ' + part.trim();
            }
            
            if (content) {
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
  }, [message, isMermaidContent, diagramId]);

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
