
import { useState } from 'react';
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
  const { signIn, userInfo } = useAuth();
  const navigate = useNavigate();

  // If userInfo exists, redirect to main page
  if (userInfo) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log("Starting sign-in process");
      
      // Use default values if inputs are empty
      const userEmail = email.trim() || 'guest@workflowsleuth.com';
      const userCompany = companyName.trim() || 'Guest Company';
      
      await signIn(userEmail, userCompany);
      
      toast({
        title: "Success",
        description: "Welcome to WorkflowSleuth!",
      });
      
      // Navigate to the main page
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
      
    } catch (error) {
      console.error('Error during form submission:', error);
      setErrorMessage("Something went wrong. Please try again.");
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
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
          <p className="text-muted-foreground mt-2">Enter your details to start your workflow analysis</p>
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
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
