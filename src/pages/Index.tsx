
import { WorkflowSleuth } from "@/components/WorkflowSleuth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

const Index = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">WorkflowSleuth</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
        <WorkflowSleuth />
      </div>
    </div>
  );
};

export default Index;
