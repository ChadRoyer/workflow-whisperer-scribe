
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowTitle } = await req.json();
    
    if (!workflowTitle) {
      throw new Error('Workflow title is required');
    }

    // Initialize Supabase client with service_role key for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query the workflows table
    const { data: workflows, error } = await supabaseClient
      .from('workflows')
      .select('title, start_event, end_event, people, systems, pain_point')
      .eq('title', workflowTitle)
      .limit(1);

    if (error) {
      console.error('Database query error:', error);
      throw new Error('Failed to fetch workflow data');
    }

    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Error: Workflow title not found." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const workflow = workflows[0];
    
    // Format arrays into comma-separated strings, handling null values
    const peopleList = workflow.people ? workflow.people.join(', ') : 'None';
    const systemsList = workflow.systems ? workflow.systems.join(', ') : 'None';
    
    // Create Mermaid flowchart string
    const mermaidChart = `graph TD;
    subgraph Workflow: ${workflow.title}
        Start((Start: ${workflow.start_event || 'Not specified'})) --> MainPath([${workflow.title}])
        MainPath --> End((End: ${workflow.end_event || 'Not specified'}))
        MainPath -- People Involved --> P(["${peopleList}"])
        MainPath -- Systems Used --> S(["${systemsList}"])
        MainPath -- Key Challenge --> PP(["${workflow.pain_point || 'Not specified'}"])
    end`;

    return new Response(
      JSON.stringify({ mermaidChart }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-workflow-mermaid function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
