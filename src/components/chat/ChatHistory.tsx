
import React, { useEffect } from "react";
import { useSessionManagement } from "./useSessionManagement";
import { useSessionCleanup } from "./useSessionCleanup";
import { ChatHistoryItem } from "./ChatHistoryItem";

interface ChatHistoryProps {
  sessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export const ChatHistory = ({ sessionId, onSelectSession }: ChatHistoryProps) => {
  const { sessions, isLoading, fetchSessions, deleteSession } = useSessionManagement(sessionId);
  const { cleanupEmptySessions } = useSessionCleanup();

  useEffect(() => {
    cleanupEmptySessions().then(() => fetchSessions());
  }, [sessionId, cleanupEmptySessions, fetchSessions]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-muted-foreground">Loading chats...</p>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground p-4">No chat history</p>
        ) : (
          sessions.map((session) => (
            <ChatHistoryItem
              key={session.id}
              id={session.id}
              title={session.title}
              companyName={session.company_name}
              createdAt={session.created_at}
              isSelected={sessionId === session.id}
              onSelect={onSelectSession}
              onDelete={deleteSession}
            />
          ))
        )}
      </div>
    </div>
  );
};
