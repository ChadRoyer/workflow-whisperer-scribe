
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { webSearch } from "../lib/webSearch.ts";

// Define system prompt directly in the edge function rather than importing
const aiSolutionsSystemPrompt = `You are "Workflow-AI Conductor".

OBJECTIVE  
For the given workflow JSON, list practical AI interventions a mid-size business
could deploy within 90 days to remove bottlenecks, reduce cost, or boost speed.

CONSTRAINTS  
• Use web search sparingly (≤ 1 call per workflow step).  
• Output only deployable, reasonably priced tech (Zapier, UiPath, Vertex AI, etc.).  
• If no AI uplift exists for a step, skip it.  
• Final answer must be a **JSON array**; nothing else.

CONDUCTOR FORMAT  
1. THINK: restate objective & key pain points.  
2. PLAN: bullet steps (max 6) you will follow.  
3. EXECUTE: follow plan step-by-step; when you need external info, call the
   \`search_web\` tool with a focused query; record RESULT.  
4. DELIVER: JSON array with objects:

{
  "step_label":  "<node or pain label>",
  "suggestion":  "<plain-English automation idea>",
  "ai_tool":     "<named SaaS / open-source>",
  "complexity":  "Low|Medium|High",
  "roi_score":   1-5,
  "sources":     [ { "title":"...", "url":"..." } ]
}

Return ONLY that JSON array after EXECUTE is done.`;

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowId } = await req.json();
    
    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }

    console.log(`Generating AI solutions for workflow ID: ${workflowId}`);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the workflow details
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      console.error('Error fetching workflow:', error);
      throw new Error(`Failed to fetch workflow with ID ${workflowId}`);
    }

    // Format workflow data
    const workflowDetails = {
      title: workflow.title,
      start_event: workflow.start_event,
      end_event: workflow.end_event,
      people: workflow.people || [],
      systems: workflow.systems || [],
      pain_point: workflow.pain_point || ''
    };
    
    // Define the search web function tool
    const functions = [
      {
        name: "search_web",
        description: "Search the public internet for examples, vendors or stats.",
        parameters: {
          type: "object",
          properties: { 
            query: { type: "string" }
          },
          required: ["query"]
        }
      }
    ];

    // First, perform initial searches to gather relevant information
    const searchResults = await performInitialSearches(workflowDetails);

    // Then call OpenAI with the workflow data and search results
    const solutions = await generateSolutions(workflowDetails, searchResults);

    // Validate and store the solutions
    if (solutions && solutions.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_solutions')
        .insert(
          solutions.map(solution => ({
            workflow_id: workflowId,
            step_label: solution.step_label,
            suggestion: solution.suggestion,
            ai_tool: solution.ai_tool,
            complexity: solution.complexity || 'Medium',
            roi_score: solution.roi_score || 3,
            sources: solution.sources || null
          }))
        );

      if (insertError) {
        console.error("Error inserting AI solutions:", insertError);
        throw new Error(`Failed to save AI solutions: ${insertError.message}`);
      }
      
      console.log(`Successfully saved ${solutions.length} AI solutions for workflow ${workflowId}`);
    }

    // Return the generated solutions
    return new Response(
      JSON.stringify({ 
        success: true, 
        solutions: solutions,
        count: solutions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-ai-solutions function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to perform initial searches based on workflow details
async function performInitialSearches(workflow) {
  const searchQueries = [
    `AI automation tools for ${workflow.title} process in business`,
    `Best AI tools to streamline ${workflow.systems.join(", ")} integration`
  ];
  
  let allResults = [];
  
  for (const query of searchQueries) {
    try {
      console.log(`Performing search for: ${query}`);
      const results = await webSearch(query);
      allResults = [...allResults, ...results];
    } catch (error) {
      console.error(`Search error for "${query}":`, error);
    }
  }
  
  // Remove duplicates
  return Array.from(new Map(allResults.map(item => [item.url, item])).values());
}

// Helper function to generate AI solutions using OpenAI
async function generateSolutions(workflow, searchResults) {
  try {
    console.log("Calling OpenAI to generate solutions");
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: aiSolutionsSystemPrompt },
          { 
            role: "user", 
            content: `Analyze this workflow and provide specific AI automation opportunities:\n${JSON.stringify(workflow, null, 2)}` 
          },
          { 
            role: "user", 
            content: `I searched the web for solutions. Here are the search results:\n${JSON.stringify(searchResults, null, 2)}` 
          }
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid response from OpenAI:", data);
      throw new Error("Failed to get valid response from OpenAI");
    }
    
    const content = data.choices[0].message.content;
    
    // Extract JSON array from the response
    let solutions = [];
    try {
      // Try to find JSON in the content
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/\{[\s\S]*"step_label"[\s\S]*\}/) ||
                        content.match(/\[[\s\S]*\{[\s\S]*"step_label"[\s\S]*\}[\s\S]*\]/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const parsedData = JSON.parse(jsonString.trim());
        solutions = Array.isArray(parsedData) ? parsedData : (parsedData.opportunities || []);
      } else {
        console.warn("No JSON found in OpenAI response");
      }
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.log("Raw response:", content);
    }
    
    // Validate solutions
    return solutions.filter(solution => 
      solution && 
      typeof solution === 'object' && 
      solution.step_label && 
      solution.suggestion && 
      solution.ai_tool
    );
  } catch (error) {
    console.error("Error generating solutions with OpenAI:", error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}
