
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
      if (message.trim().startsWith('graph TD;') && mermaidRef.current) {
        try {
          mermaid.initialize({ startOnLoad: true });
          const { svg } = await mermaid.render('mermaid-diagram', message);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Failed to render Mermaid diagram:', error);
        }
      }
    };

    renderMermaidDiagram();
  }, [message]);

  const isMermaidDiagram = message.trim().startsWith('graph TD;');

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
          <div ref={mermaidRef} className="mermaid-diagram" />
        ) : (
          <p className="whitespace-pre-wrap">{message}</p>
        )}
      </div>
    </div>
  );
};
