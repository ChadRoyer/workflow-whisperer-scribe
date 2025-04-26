
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const ApiTester = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testOpenAiConnection = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('workflow-sleuth', {
        method: 'GET',
        path: '/test-openai'
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setResult(data.message);
        toast({
          title: "Connection Successful",
          description: "Successfully connected to OpenAI API!",
        });
      } else {
        throw new Error(data?.error || "Unknown error occurred");
      }
    } catch (err) {
      console.error("Error testing OpenAI connection:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      toast({
        title: "Connection Failed",
        description: "Failed to connect to OpenAI API. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mb-8">
      <CardHeader>
        <CardTitle>OpenAI API Connection Test</CardTitle>
        <CardDescription>
          Test the connection to OpenAI API through the Edge Function
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testOpenAiConnection} 
          disabled={isLoading}
          className="w-full mb-4"
        >
          {isLoading ? "Testing..." : "Test Connection"}
        </Button>
        
        {result && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="font-semibold text-green-700">Success!</p>
            <p className="text-sm text-green-600">Response from OpenAI:</p>
            <p className="text-sm mt-1">{result}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="font-semibold text-red-700">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
