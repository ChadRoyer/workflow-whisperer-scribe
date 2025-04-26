
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      console.log("Session detected, redirecting to home");
      navigate('/');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log("Starting sign-in process");
      await signIn(email, companyName);
      
      toast({
        title: "Success",
        description: "Signing you in...",
      });
      
      // If we've reached this point and no redirect has occurred,
      // force a redirect after a short delay
      setTimeout(() => {
        const currentSession = supabase.auth.getSession();
        currentSession.then(({ data }) => {
          if (data.session) {
            console.log("Session found after timeout, forcing navigation");
            navigate('/');
          } else {
            console.log("No session after timeout");
          }
        });
      }, 1500);
      
    } catch (error) {
      console.error('Auth error:', error);
      setErrorMessage("Authentication failed. Please try again.");
      toast({
        title: "Error",
        description: "Authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg bg-card">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to WorkflowSleuth</h1>
          <p className="text-muted-foreground mt-2">Sign in to start your workflow analysis</p>
        </div>
        
        {errorMessage && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">Company Name</label>
            <Input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
