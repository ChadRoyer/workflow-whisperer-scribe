
import React from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatHistoryItemProps {
  id: string;
  title: string | null;
  companyName: string;
  createdAt: string;
  isSelected: boolean;
  empty?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ChatHistoryItem = ({
  id,
  title,
  companyName,
  createdAt,
  isSelected,
  empty,
  onSelect,
  onDelete,
}: ChatHistoryItemProps) => {
  return (
    <div 
      className={cn(
        "flex justify-between items-center p-2 rounded-md hover:bg-accent cursor-pointer group",
        isSelected && "bg-accent",
        empty && "opacity-50"
      )}
      onClick={() => onSelect(id)}
    >
      <div className="flex flex-col">
        <span className="font-medium">{title || companyName}</span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(createdAt), 'MMM d, yyyy')}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
