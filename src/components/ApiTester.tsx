
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export const ApiTester = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);

  const testOpenAiConnection = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setRawResponse(null);

    try {
      console.log("Testing OpenAI connection...");
      const { data, error } = await supabase.functions.invoke('workflow-sleuth', {
        body: { action: 'test-openai' }
      });

      console.log("Response received:", data);

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
        // If we got a response but success is false
        if (data?.rawResponse) {
          setRawResponse(data.rawResponse);
        }
        
        // Check for specific API key error
        if (data?.rawResponse?.error?.code === "invalid_api_key") {
          setError("Invalid OpenAI API key. Please check your API key in the Supabase dashboard.");
        } else {
          setError(data?.error || "Unknown error occurred");
        }
        
        toast({
          title: "Connection Failed",
          description: "Failed to connect to OpenAI API. See details below.",
          variant: "destructive",
        });
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
          <div className="mt-4">
            <Alert variant="destructive">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Error connecting to OpenAI</AlertTitle>
              <AlertDescription>
                {error}
                {error.includes("API key") && (
                  <p className="mt-2 text-sm">
                    You need to set a valid OpenAI API key in your Supabase project secrets.
                  </p>
                )}
              </AlertDescription>
            </Alert>
            
            {rawResponse && (
              <div className="mt-2">
                <p className="text-xs font-semibold">Raw API Response:</p>
                <pre className="text-xs overflow-auto mt-1 p-2 bg-gray-100 rounded">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
