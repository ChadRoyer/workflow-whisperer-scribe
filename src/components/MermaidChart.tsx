
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
  const [attemptCount, setAttemptCount] = useState(0);

  // Initialize mermaid with appropriate config
  useEffect(() => {
    try {
      // Initialize mermaid with more permissive settings
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'default',
        logLevel: 1,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'linear'
        },
        // Increase timeouts for rendering
        gantt: {
          titleTopMargin: 25,
          barHeight: 20,
          barGap: 4,
          topPadding: 50
        },
        // Allow additional time for parsing
        deterministicIds: false,
        // Relax arrow validation
        arrowMarkerAbsolute: false
      });
      console.log('Mermaid initialized with enhanced settings');
    } catch (error) {
      console.error('Error initializing Mermaid:', error);
    }
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        // Reset error state
        setHasError(false);
        setErrorMessage(null);

        // Clear the container
        containerRef.current.innerHTML = '';
        
        console.log("Attempting to render chart:", chart.substring(0, 100) + '...');

        // Render with increased timeout (20 seconds instead of 10)
        const timeoutId = setTimeout(() => {
          console.log('Rendering is taking longer than expected...');
          // Don't throw error immediately - allow more time
          if (attemptCount < 2) {
            setAttemptCount(prev => prev + 1);
          } else {
            setHasError(true);
            setErrorMessage('Diagram rendering is taking too long. The chart may be too complex.');
            // Display a simplified version or fallback
            if (containerRef.current) {
              containerRef.current.innerHTML = `
                <div class="p-4 border rounded bg-amber-50 text-amber-800">
                  <p>Unable to render complex diagram. Showing simplified version:</p>
                  <pre class="mt-2 p-2 bg-white border rounded overflow-auto text-xs">${chart.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
              `;
            }
          }
        }, 20000);

        // Try to render the chart
        const { svg } = await mermaid.render('mermaid-diagram', chart);
        clearTimeout(timeoutId);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          console.log("Chart rendered successfully");
        }
      } catch (error) {
        console.error('Error rendering Mermaid chart:', error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error rendering chart');
        
        // Show a more user-friendly error with the raw chart code
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-4 border rounded bg-red-50 text-red-800">
              <p>There was an error rendering this diagram:</p>
              <p class="font-mono text-sm mt-2">${error instanceof Error ? error.message : 'Unknown error'}</p>
              <pre class="mt-4 p-2 bg-white border rounded overflow-auto text-xs">${chart.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
          `;
        }
      }
    };

    renderChart();
  }, [chart, attemptCount]);

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
        body: { workflowId }
      });
      
      const data = res.data;
      
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
                  className="mermaid-container overflow-auto bg-white p-2 rounded min-h-[200px] border"
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
        <div className="border rounded p-4 bg-white">
          <div 
            ref={containerRef} 
            className="mermaid-container overflow-auto bg-white p-2 rounded min-h-[200px]"
          />
          {hasError && errorMessage && (
            <div className="text-red-500 mt-2 text-sm">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MermaidChart;
