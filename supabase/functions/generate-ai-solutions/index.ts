
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { webSearch } from "../lib/webSearch.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are Expert-Conductor, an advanced AI consultant specialized in AI-based workflow automation opportunities. 
Your task is to analyze detailed workflows and identify specific operational steps that can be optimized, automated, or enhanced with AI technology.

ANALYSIS APPROACH:
1. Study the provided workflow data (title, start event, end event, people involved, systems used, pain points).
2. Identify steps or processes that are manual, time-consuming, repetitive, or error-prone.
3. For each identified opportunity, determine a specific AI solution including:
   - The exact step/point in the workflow to apply the solution
   - Specific AI tool or technology category that's appropriate
   - Complexity of implementation (Low/Medium/High)
   - Estimated ROI (1-10, where 10 is highest) based on time saved, error reduction, etc.

FORMAT RESPONSES as structured data:
{
  "opportunities": [
    {
      "step_label": "Clear label for the workflow step",
      "suggestion": "Concise, actionable recommendation",
      "ai_tool": "Specific tool or technology category (e.g., 'GPT-4', 'Computer Vision', 'RPA')",
      "complexity": "Low|Medium|High",
      "roi_score": 1-10 integer,
      "sources": [{"title": "Source title", "url": "source URL"}]
    }
  ]
}

Examples of good opportunities:
- Document processing steps that use OCR + LLMs
- Decision points that can use prediction models
- Client communications that can use LLM-powered responses
- Manual data entry that can be automated
- Scheduling tasks that can be optimized with AI

Use clear, business-focused language avoiding technical jargon. Ensure each solution addresses a specific pain point in the workflow.`;

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

    // Format prompt for the AI
    const workflowDetails = JSON.stringify({
      title: workflow.title,
      start_event: workflow.start_event,
      end_event: workflow.end_event,
      people: workflow.people || [],
      systems: workflow.systems || [],
      pain_point: workflow.pain_point || ''
    }, null, 2);

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

    // First pass: Get the AI to determine what to search for
    const searchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "Determine 2-3 specific search queries to find tools and solutions for this workflow." },
          { role: "user", content: `Generate search queries to find AI tools and solutions for this workflow: ${workflowDetails}` }
        ],
        functions,
        function_call: "auto",
        temperature: 0.4,
      }),
    });

    const searchData = await searchResponse.json();
    console.log("Search planning response:", JSON.stringify(searchData));

    // Extract and perform searches
    const searches = [];
    let webResults = [];

    if (searchData.choices && searchData.choices[0].message.function_call) {
      const searchFunctionCalls = [];
      
      // Handle the first function call
      if (searchData.choices[0].message.function_call) {
        const functionArgs = JSON.parse(searchData.choices[0].message.function_call.arguments);
        searchFunctionCalls.push(functionArgs.query);
      }
      
      // Look for additional messages with function calls
      for (let i = 1; i < searchData.choices.length; i++) {
        if (searchData.choices[i].message?.function_call) {
          const functionArgs = JSON.parse(searchData.choices[i].message.function_call.arguments);
          searchFunctionCalls.push(functionArgs.query);
        }
      }
      
      // Log the search queries and execute them
      for (const query of searchFunctionCalls) {
        console.log(`Executing search query: ${query}`);
        searches.push(query);
        try {
          const results = await webSearch(query);
          webResults = [...webResults, ...results];
          console.log(`Search completed with ${results.length} results`);
        } catch (error) {
          console.error(`Search error for query "${query}":`, error);
        }
      }
    } else {
      // If no function call was made, extract potential search queries from the text
      const content = searchData.choices[0].message.content;
      const queries = content.split('\n').filter(line => line.trim());
      
      for (let i = 0; i < Math.min(queries.length, 3); i++) {
        const query = queries[i].replace(/^\d+\.\s*/, '').trim();
        console.log(`Executing extracted search query: ${query}`);
        searches.push(query);
        try {
          const results = await webSearch(query);
          webResults = [...webResults, ...results];
          console.log(`Search completed with ${results.length} results`);
        } catch (error) {
          console.error(`Search error for query "${query}":`, error);
        }
      }
    }

    // De-duplicate web results by URL
    const uniqueWebResults = Array.from(
      new Map(webResults.map(result => [result.url, result])).values()
    );
    
    // Second pass: Generate actual AI solutions with the search results
    const mainResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this workflow and provide specific AI automation opportunities:\n${workflowDetails}` },
          { role: "user", content: `I searched the web for solutions using these queries: ${searches.join(", ")}\nHere are the search results:\n${JSON.stringify(uniqueWebResults, null, 2)}` }
        ],
        temperature: 0.5,
      }),
    });

    const mainData = await mainResponse.json();
    console.log("AI solution generation completed");
    
    let solutions = [];
    try {
      // Parse the response to extract the structured suggestions
      const content = mainData.choices[0].message.content;
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/\{[\s\S]*"opportunities"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const parsedData = JSON.parse(jsonString.trim());
        solutions = parsedData.opportunities || [];
      } else {
        // Fallback to extract from raw text if no JSON found
        console.warn("No valid JSON found in response, attempting to parse structured text");
        solutions = [];
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.log("Raw AI response:", mainData.choices[0].message.content);
      solutions = [];
    }

    // Store solutions in database
    if (solutions.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_solutions')
        .insert(
          solutions.map(solution => ({
            workflow_id: workflowId,
            step_label: solution.step_label,
            suggestion: solution.suggestion,
            ai_tool: solution.ai_tool,
            complexity: solution.complexity,
            roi_score: solution.roi_score,
            sources: solution.sources || null
          }))
        );

      if (insertError) {
        console.error("Error inserting AI solutions:", insertError);
        throw new Error(`Failed to save AI solutions: ${insertError.message}`);
      }
      
      console.log(`Successfully saved ${solutions.length} AI solutions for workflow ${workflowId}`);
    } else {
      console.warn("No solutions were generated from the AI response");
    }

    // Return the generated solutions
    return new Response(
      JSON.stringify({ 
        success: true, 
        solutions,
        searchQueries: searches,
        webResultsCount: uniqueWebResults.length
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
