
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  isBot: boolean;
  message: string;
}

export const ChatMessage = ({ isBot, message }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%]",
          isBot
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {message}
      </div>
    </div>
  );
};
