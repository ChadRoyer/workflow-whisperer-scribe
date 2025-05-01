import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AISolutionsDisplay } from '@/components/AISolutionsDisplay';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, RefreshCw, AlertCircle, ExternalLink, Code } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { mermaidLiveLink } from "../utils/mermaidLiveLink";

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
  const [isRendering, setIsRendering] = useState(true);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const [rawCode, setRawCode] = useState<string>(chart);
  const [showCode, setShowCode] = useState(false);

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

  // Create an external link using the utility function
  const createExternalLink = () => {
    // Use the imported helper function
    return mermaidLiveLink(chart);
  };

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        // Reset error state
        setHasError(false);
        setErrorMessage(null);
        setIsRendering(true);
        setRawCode(chart);

        // Generate the external link as a fallback
        const link = createExternalLink();
        setExternalLink(link);

        // Clear the container
        containerRef.current.innerHTML = '';
        
        console.log("Attempting to render chart:", chart.substring(0, 100) + '...');

        // Render with increased timeout (15 seconds instead of 10)
        const timeoutId = setTimeout(() => {
          console.log('Rendering is taking longer than expected...');
          // Don't throw error immediately - allow more time
          if (attemptCount < 2) {
            setAttemptCount(prev => prev + 1);
          } else {
            setHasError(true);
            setErrorMessage('Diagram rendering is taking too long. The chart may be too complex.');
            
            // Build a fallback UI with link to external editor
            if (containerRef.current) {
              containerRef.current.innerHTML = `
                <div class="p-4 border rounded bg-amber-50 text-amber-800">
                  <p>Unable to render complex diagram directly. Try the external editor:</p>
                  <div class="mt-2">
                    <a href="${link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <span class="mr-2">Open in Mermaid Live Editor</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  </div>
                </div>
              `;
            }
          }
        }, 15000);

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
        
        // Create a fallback link
        const link = createExternalLink();
        setExternalLink(link);
        
        // Show a more user-friendly error with the external editor option
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-4 border rounded bg-red-50 text-red-800">
              <p>There was an error rendering this diagram:</p>
              <p class="font-mono text-sm mt-2">${error instanceof Error ? error.message : 'Unknown error'}</p>
              <div class="mt-4 flex gap-2">
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <span class="mr-2">Open in Mermaid Live Editor</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
                <button class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" onclick="document.getElementById('try-again-btn').click()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  Try Again
                </button>
              </div>
            </div>
          `;
        }
      } finally {
        setIsRendering(false);
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
      
      // Call the edge function with the correct parameter name
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

  // Try again handler with button ref
  const handleTryAgain = () => {
    setAttemptCount(prev => prev + 1);
  };

  // Toggle code view
  const toggleCodeView = () => {
    setShowCode(!showCode);
  };

  // Render loading indicator while the chart is being processed
  if (isRendering && !hasError) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center border rounded-lg bg-card min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Rendering workflow diagram...</p>
      </div>
    );
  }

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
                <div className="flex justify-end mb-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleCodeView}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    {showCode ? "Hide Code" : "Show Code"}
                  </Button>
                  {externalLink && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild
                    >
                      <a href={externalLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Editor
                      </a>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    id="try-again-btn"
                    onClick={handleTryAgain}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload
                  </Button>
                </div>
                
                {showCode && (
                  <div className="mb-4 p-2 bg-slate-50 border rounded overflow-auto">
                    <pre className="text-xs text-slate-800 whitespace-pre-wrap">{rawCode}</pre>
                  </div>
                )}
                
                <div 
                  ref={containerRef} 
                  className="mermaid-container overflow-auto bg-white p-2 rounded min-h-[200px] border"
                />
                
                {hasError && errorMessage && (
                  <div className="flex items-center text-red-500 mt-2 text-sm p-2 bg-red-50 rounded">
                    <AlertCircle className="h-4 w-4 mr-2" />
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
          <div className="flex justify-end mb-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleCodeView}
            >
              <Code className="h-4 w-4 mr-2" />
              {showCode ? "Hide Code" : "Show Code"}
            </Button>
            {externalLink && (
              <Button 
                variant="outline" 
                size="sm" 
                asChild
              >
                <a href={externalLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Editor
                </a>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              id="try-again-btn"
              onClick={handleTryAgain}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload
            </Button>
          </div>
          
          {showCode && (
            <div className="mb-4 p-2 bg-slate-50 border rounded overflow-auto">
              <pre className="text-xs text-slate-800 whitespace-pre-wrap">{rawCode}</pre>
            </div>
          )}
          
          <div 
            ref={containerRef} 
            className="mermaid-container overflow-auto bg-white p-2 rounded min-h-[200px]"
          />
          
          {hasError && errorMessage && (
            <div className="flex items-center text-red-500 mt-2 text-sm p-2 bg-red-50 rounded">
              <AlertCircle className="h-4 w-4 mr-2" />
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MermaidChart;
