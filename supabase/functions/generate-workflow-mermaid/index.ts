
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

    console.log(`Generating visualization for workflow titled: "${workflowTitle}"`);

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
      console.error(`Workflow with title "${workflowTitle}" not found`);
      return new Response(
        JSON.stringify({ error: "Error: Workflow title not found." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const workflow = workflows[0];
    console.log("Retrieved workflow data:", JSON.stringify(workflow));
    
    // Format arrays into comma-separated strings, handling null values
    const peopleList = workflow.people ? workflow.people.join(', ') : 'None';
    const systemsList = workflow.systems ? workflow.systems.join(', ') : 'None';
    
    // Create Mermaid flowchart string - ENSURE VALID SYNTAX
    const mermaidChart = `flowchart TD
    Start([Start: ${workflow.start_event || 'Not specified'}]) --> Process
    Process[${workflow.title}] --> End([End: ${workflow.end_event || 'Not specified'}])
    Process -- People --> People[${peopleList}]
    Process -- Systems --> Systems[${systemsList}]
    Process -- Challenge --> PainPoint["${workflow.pain_point || 'Not specified'}"]`;

    console.log("Generated Mermaid chart:", mermaidChart);

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
