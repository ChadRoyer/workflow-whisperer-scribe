
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AISolutionsDisplay } from '@/components/AISolutionsDisplay';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface MermaidChartProps {
  chart: string;
  workflowId?: string;
  workflowTitle?: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart, workflowId, workflowTitle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("diagram");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        // Reset error state
        setHasError(false);
        setErrorMessage(null);

        // Clear the container
        containerRef.current.innerHTML = '';

        // Set a timeout to handle rendering failures
        const timeoutId = setTimeout(() => {
          throw new Error('Mermaid rendering timed out after 10 seconds');
        }, 10000);

        // Try to render the chart
        await mermaid.render('mermaid-diagram', chart).then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
          clearTimeout(timeoutId);
        });
      } catch (error) {
        console.error('Error rendering Mermaid chart:', error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error rendering chart');
        
        // Try to display the raw chart as text if rendering fails
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-red-600 p-4 overflow-auto">${chart}</pre>`;
        }
      }
    };

    renderChart();
  }, [chart]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
  };

  // Generate AI solutions
  const genSolutions = async (workflowId: string) => {
    try {
      setIsGenerating(true);
      
      // Call the edge function
      const res = await supabase.functions.invoke('generate-ai-solutions', {
        body: { workflow_id: workflowId }
      });
      
      const data = await res.data;
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to generate AI solutions');
      }
      
      toast({
        title: "AI Solutions Generated",
        description: `Successfully generated ${data.count} AI improvement suggestions.`,
      });
      
      // Switch to the AI tab to show solutions
      setCurrentTab("ai");
      
    } catch (error) {
      console.error('Error generating AI solutions:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI solutions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full">
      {workflowId && workflowTitle ? (
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diagram">Workflow Diagram</TabsTrigger>
            <TabsTrigger value="ai">AI Opportunities</TabsTrigger>
          </TabsList>
          <TabsContent value="diagram" className="mt-2">
            <Card>
              <CardContent className="p-4">
                <div 
                  ref={containerRef} 
                  className={`mermaid-container overflow-auto bg-white p-2 rounded ${hasError ? 'border-red-500 border-2' : ''}`}
                />
                {hasError && errorMessage && (
                  <div className="text-red-500 mt-2 text-sm">
                    {errorMessage}
                  </div>
                )}
                {workflowId && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={() => genSolutions(workflowId)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Zap className="mr-2 h-4 w-4" /> Generate AI Improvements</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai" className="mt-2">
            <Card>
              <CardContent className="p-4">
                <AISolutionsDisplay workflowId={workflowId} workflowTitle={workflowTitle} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div 
          ref={containerRef} 
          className={`mermaid-container overflow-auto bg-white p-4 rounded ${hasError ? 'border-red-500 border-2' : ''}`}
        />
      )}
    </div>
  );
};

export default MermaidChart;
