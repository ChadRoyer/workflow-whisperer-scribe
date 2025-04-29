
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, Lightbulb, Loader2 } from "lucide-react";
import { AISolution } from '@/types';

interface AISolutionsDisplayProps {
  workflowId: string;
  workflowTitle: string;
}

export const AISolutionsDisplay: React.FC<AISolutionsDisplayProps> = ({ workflowId, workflowTitle }) => {
  const [solutions, setSolutions] = useState<AISolution[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const fetchExistingSolutions = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('ai_solutions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('roi_score', { ascending: false });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Transform the data to ensure sources is correctly typed
        const typedSolutions: AISolution[] = data.map(solution => ({
          ...solution,
          sources: solution.sources as { title: string; url: string }[] || []
        }));
        
        setSolutions(typedSolutions);
        setHasGenerated(true);
      } else {
        setSolutions([]);
      }
    } catch (error) {
      console.error('Error fetching AI solutions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI solutions",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const generateSolutions = async () => {
    try {
      setIsGenerating(true);
      
      // Call our edge function to generate solutions
      const { data, error } = await supabase.functions.invoke('generate-ai-solutions', {
        body: { workflow_id: workflowId }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate AI solutions');
      }

      toast({
        title: "Success",
        description: `Generated ${data.solutions.length} AI automation suggestions`,
      });

      // Fetch the solutions we just created
      await fetchExistingSolutions();
      setHasGenerated(true);
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

  // Fetch existing solutions on component mount
  useEffect(() => {
    fetchExistingSolutions();
  }, [workflowId]);

  const getComplexityColor = (complexity: string) => {
    switch (complexity?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoiScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">AI Automation Opportunities</h3>
        
        <Button 
          onClick={hasGenerated ? fetchExistingSolutions : generateSolutions}
          disabled={isGenerating || isFetching}
          variant={hasGenerated ? "outline" : "default"}
        >
          {(isGenerating || isFetching) ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {isGenerating ? "Analyzing..." : "Loading..."}</>
          ) : (
            <>{hasGenerated ? "Refresh Solutions" : "Generate AI Solutions"}</>
          )}
        </Button>
      </div>
      
      {solutions.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <Card key={solution.id || index} className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-semibold">
                  <Lightbulb className="h-4 w-4 inline mr-2 text-amber-500" />
                  {solution.step_label}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className={getComplexityColor(solution.complexity)}>
                    {solution.complexity} complexity
                  </Badge>
                  <Badge variant="outline">
                    ROI: <span className={`ml-1 font-bold ${getRoiScoreColor(solution.roi_score)}`}>
                      {solution.roi_score}/10
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-700">{solution.suggestion}</p>
                <p className="text-xs mt-2 font-medium text-gray-600">Recommended tool: {solution.ai_tool}</p>
              </CardContent>
              {solution.sources && solution.sources.length > 0 && (
                <CardFooter className="flex-col items-start pt-0">
                  <Separator className="mb-2" />
                  <CardDescription className="text-xs font-medium mb-1">Sources:</CardDescription>
                  <ul className="text-xs space-y-1 w-full">
                    {solution.sources.slice(0, 2).map((source, idx) => (
                      <li key={idx} className="truncate">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          {source.title}
                          <ArrowUpRight className="h-3 w-3 ml-1 inline" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg bg-gray-50">
          {isGenerating ? (
            <p className="text-gray-600">Analyzing workflow and researching AI solutions...</p>
          ) : (
            <p className="text-gray-600">
              Generate AI solutions to see automation opportunities for "{workflowTitle}".
            </p>
          )}
        </div>
      )}
    </div>
  );
};
