
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
    
    // Generate safe text for mermaid by escaping special characters
    const sanitize = (str) => {
      if (!str) return "Not specified";
      return str.replace(/"/g, "'").replace(/\\/g, "\\\\").replace(/\n/g, " ").trim();
    };
    
    // Format arrays into comma-separated strings
    const peopleList = workflow.people ? workflow.people.join(', ') : 'None';
    const systemsList = workflow.systems ? workflow.systems.join(', ') : 'None';
    
    // Sanitize all input strings
    const title = sanitize(workflow.title);
    const startEvent = sanitize(workflow.start_event);
    const endEvent = sanitize(workflow.end_event);
    const people = sanitize(peopleList);
    const systems = sanitize(systemsList);
    const painPoint = sanitize(workflow.pain_point);
    
    // Generate extremely simple mermaid diagram syntax
    // Using minimal syntax to avoid parsing errors
    const mermaidChart = `flowchart TD
    A[Start: ${startEvent}] --> B[${title}]
    B --> C[End: ${endEvent}]
    B --> D[People: ${people}]
    B --> E[Systems: ${systems}]
    B --> F[Challenge: ${painPoint}]`;
    
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
