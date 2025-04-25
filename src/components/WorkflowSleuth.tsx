
import { useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface Message {
  text: string;
  isBot: boolean;
}

export const WorkflowSleuth = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hi! I'm WorkflowSleuth, and I'm here to help document your business workflow. Let's start with the title of your workflow. What should we call it?",
      isBot: true,
    },
  ]);

  const handleSendMessage = (message: string) => {
    // Add user message
    setMessages((prev) => [...prev, { text: message, isBot: false }]);

    // Simple bot response for now
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          text: "Thanks! Let me process that...",
          isBot: true,
        },
      ]);
    }, 500);
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            isBot={message.isBot}
            message={message.text}
          />
        ))}
      </div>
      <div className="mt-auto">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};
