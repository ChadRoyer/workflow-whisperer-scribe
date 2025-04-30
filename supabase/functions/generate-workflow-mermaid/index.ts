
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowTitle } = await req.json();
    
    if (!workflowTitle) {
      return new Response(
        JSON.stringify({ error: "Workflow title is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get database credentials from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://jqrgqevteccqxnrmocuw.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseServiceKey) {
      console.error("No service role key found");
      return new Response(
        JSON.stringify({ error: "Missing service role key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch the workflow data
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('title', workflowTitle)
      .single();
    
    if (workflowError) {
      console.error("Error fetching workflow:", workflowError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch workflow: ${workflowError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!workflow) {
      return new Response(
        JSON.stringify({ error: "Workflow not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Generate Mermaid chart from workflow data
    const mermaidChart = generateMermaidFromWorkflow(workflow);
    console.log("Generated mermaid chart:", mermaidChart);
    
    // Return JUST the raw chart data
    return new Response(
      JSON.stringify({ mermaidCode: mermaidChart }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-workflow-mermaid:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/**
 * Generate a Mermaid flowchart from workflow data
 */
function generateMermaidFromWorkflow(workflow) {
  try {
    // Extract workflow components
    const { title, start_event, end_event, people = [], systems = [], pain_point } = workflow;

    // Create basic flowchart structure
    let mermaidCode = `flowchart TD\n`;
    mermaidCode += `    title[${sanitizeMermaidText(title)}]\n\n`;
    
    // Add start and end nodes
    mermaidCode += `    start("🟢 ${sanitizeMermaidText(start_event)}")\n`;
    mermaidCode += `    end("🏁 ${sanitizeMermaidText(end_event)}")\n\n`;
    
    // Add people and systems as participants
    const actors = [];
    
    if (people && people.length > 0) {
      people.forEach((person, index) => {
        const id = `person${index}`;
        mermaidCode += `    ${id}["👤 ${sanitizeMermaidText(person)}"]\n`;
        actors.push(id);
      });
      mermaidCode += `\n`;
    }
    
    if (systems && systems.length > 0) {
      systems.forEach((system, index) => {
        const id = `system${index}`;
        mermaidCode += `    ${id}["💻 ${sanitizeMermaidText(system)}"]\n`;
        actors.push(id);
      });
      mermaidCode += `\n`;
    }
    
    // Create a basic flow
    mermaidCode += `    start --> `;
    
    // Connect actors in sequence if there are any
    if (actors.length > 0) {
      mermaidCode += actors.join(" --> ") + " --> ";
    }
    
    mermaidCode += "end\n\n";
    
    // Add pain point as a note if it exists
    if (pain_point) {
      mermaidCode += `    pain[/"⚠️ Pain Point: ${sanitizeMermaidText(pain_point)}"/]\n`;
      mermaidCode += `    pain -.-> end\n`;
    }
    
    // Add styling
    mermaidCode += `\n    classDef start fill:#dfd,stroke:#393,stroke-width:1px\n`;
    mermaidCode += `    classDef end fill:#fdd,stroke:#933,stroke-width:1px\n`;
    mermaidCode += `    classDef pain fill:#ffeecc,stroke:#f90,stroke-width:1px,stroke-dasharray: 5 5\n`;
    mermaidCode += `    classDef person fill:#eff,stroke:#699,stroke-width:1px\n`;
    mermaidCode += `    classDef system fill:#fef,stroke:#969,stroke-width:1px\n\n`;
    
    mermaidCode += `    class start start\n`;
    mermaidCode += `    class end end\n`;
    
    if (pain_point) {
      mermaidCode += `    class pain pain\n`;
    }
    
    // Apply person class to all person nodes
    if (people && people.length > 0) {
      people.forEach((_, index) => {
        mermaidCode += `    class person${index} person\n`;
      });
    }
    
    // Apply system class to all system nodes
    if (systems && systems.length > 0) {
      systems.forEach((_, index) => {
        mermaidCode += `    class system${index} system\n`;
      });
    }

    return mermaidCode;
  } catch (error) {
    console.error("Error generating Mermaid chart:", error);
    return `flowchart TD\n    error["Error generating chart: ${error.message}"]\n`;
  }
}

/**
 * Sanitize text for Mermaid compatibility
 * Escapes special characters that could break the Mermaid syntax
 */
function sanitizeMermaidText(text) {
  if (!text) return "";
  
  // Replace quotes with HTML entities
  return text
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
