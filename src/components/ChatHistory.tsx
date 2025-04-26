
import { useMemo } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatHistoryProps {
  sessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

interface Session {
  id: string;
  created_at: string;
  company_name: string;
}

export const ChatHistory = ({ sessionId, onSelectSession }: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
      return;
    }

    setSessions(data || []);
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Chat deleted successfully",
    });
    
    fetchSessions();
  };

  const formattedSessions = useMemo(() => {
    return sessions.map(session => ({
      ...session,
      formattedDate: format(new Date(session.created_at), 'MMM d, yyyy')
    }));
  }, [sessions]);

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {formattedSessions.map((session) => (
            <SidebarMenuItem key={session.id}>
              <SidebarMenuButton
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "w-full justify-between group",
                  sessionId === session.id && "bg-accent"
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{session.company_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {session.formattedDate}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};
