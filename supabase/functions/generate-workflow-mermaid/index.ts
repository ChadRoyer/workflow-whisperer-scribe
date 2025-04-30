import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a Mermaid Live Editor link using pako compression
function mermaidLiveLink(code: string): string {
  try {
    // This is a Deno implementation of the browser-side function
    // As we can't directly import pako in Deno, we'll use a simplified approach
    // that creates a compatible URL format with the browser implementation
    
    // The client-side will handle the actual link generation with proper compression
    // For now, we use a direct parameter approach as fallback
    return `https://mermaid.live/edit?code=${encodeURIComponent(code)}`;
  } catch (error) {
    console.error("Error creating Mermaid live link:", error);
    return `https://mermaid.live/edit?code=${encodeURIComponent(code.substring(0, 2000))}`;
  }
}

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
    
    // Transform data to expected format
    const peopleArray = Array.isArray(workflow.people) ? workflow.people.map(person => {
      // Assume all people are internal unless specified otherwise
      return { name: person, type: "internal" };
    }) : [];
    
    const systemsArray = Array.isArray(workflow.systems) ? workflow.systems.map(system => {
      // Assume all systems are internal unless specified otherwise
      return { name: system, type: "internal" };
    }) : [];
    
    // Prepare the input for the diagram generator
    const workflowData = {
      title: workflow.title,
      start_event: workflow.start_event,
      end_event: workflow.end_event,
      people: peopleArray,
      systems: systemsArray,
      pain_point: workflow.pain_point
    };
    
    // Generate the mermaid diagram based on the structured specification
    const mermaidChart = generateMermaidDiagram(workflowData);
    
    console.log("Generated Mermaid chart:", mermaidChart);

    // Return just the raw chart data - client will handle link generation
    return new Response(
      JSON.stringify({ 
        mermaidCode: mermaidChart 
      }),
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

// Function to generate a mermaid diagram according to the specified rules
function generateMermaidDiagram(data) {
  try {
    // Sanitize text for mermaid compatibility
    const sanitize = (text) => {
      if (!text) return "Unspecified";
      return text
        .replace(/["\\<>]/g, '') // Remove problematic characters
        .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
        .trim();
    };
    
    const title = sanitize(data.title);
    const startEvent = sanitize(data.start_event);
    const endEvent = sanitize(data.end_event);
    const painPoint = sanitize(data.pain_point);
    
    // Use a more compatible mermaid syntax - flowchart instead of graph TD
    let diagram = `%% ${title}\nflowchart TD\n`;
    
    // Start and end nodes - use standard arrow syntax
    diagram += `  S(Start) --> `;
    
    // Initialize lastNodeId before using it
    let lastNodeId = 'S';
    
    // Add people nodes
    const people = data.people || [];
    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const nodeId = `P${i + 1}`;
      const className = person.type === 'external' ? 'externalPerson' : 'internalPerson';
      const personName = sanitize(person.name);
      
      if (i === 0) {
        // First person connects from start
        diagram += `${nodeId}["${personName}"]:::${className}\n`;
      } else {
        // Connect from previous node
        const prevNodeId = i === 0 ? 'S' : (people[i-1] ? `P${i}` : 'S');
        diagram += `  ${prevNodeId} --> ${nodeId}["${personName}"]:::${className}\n`;
      }
      
      // Update the last node ID
      lastNodeId = nodeId;
    }
    
    // Add system nodes
    const systems = data.systems || [];
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      const nodeId = `S${i + 1}`;
      const className = system.type === 'external' ? 'externalSystem' : 'internalSystem';
      const systemName = sanitize(system.name);
      
      diagram += `  ${lastNodeId} --> ${nodeId}["${systemName}"]:::${className}\n`;
      lastNodeId = nodeId;
    }
    
    // Add pain point if available
    if (painPoint && painPoint !== "Unspecified") {
      diagram += `  ${lastNodeId} --> PP{{"⚠︎ ${painPoint}"}}:::pain\n`;
      diagram += `  PP --> E(End)\n`;
    } else {
      // Connect last node to end
      diagram += `  ${lastNodeId} --> E(End)\n`;
    }
    
    // Add style classes
    diagram += `  classDef internalPerson fill:#E0F7FA,stroke:#0288D1,stroke-width:2;\n`;
    diagram += `  classDef externalPerson fill:#FFF3E0,stroke:#FB8C00,stroke-width:2,stroke-dasharray:5 5;\n`;
    diagram += `  classDef internalSystem fill:#E8EAF6,stroke:#3F51B5,stroke-width:2;\n`;
    diagram += `  classDef externalSystem fill:#EFEBE9,stroke:#8D6E63,stroke-width:2,stroke-dasharray:5 5;\n`;
    diagram += `  classDef pain fill:#FFEBEE,stroke:#C62828,stroke-width:4,color:#C62828;\n`;
    
    return diagram;
  } catch (error) {
    console.error("Error generating Mermaid diagram:", error);
    // Return a simple fallback diagram in case of errors
    return `flowchart TD\n  A[Error: Could not generate diagram] --> B[Please try again]`;
  }
}
