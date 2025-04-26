
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = "https://jqrgqevteccqxnrmocuw.supabase.co";
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if it's a test request for the OpenAI API
  try {
    const reqData = await req.json();
    
    // Handle test-openai action
    if (reqData.action === 'test-openai') {
      try {
        // First, verify we have the OpenAI API key
        if (!openAIApiKey) {
          console.error('OpenAI API key is not set');
          return new Response(JSON.stringify({
            success: false,
            error: "OpenAI API key is not configured"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
        
        // Log the API key length for debugging (never log the full key)
        console.log(`Using OpenAI API key (length: ${openAIApiKey.length})`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: 'Say hello in a creative way.' }
            ],
            max_tokens: 50
          }),
        });

        // Log the status and content type for debugging
        console.log(`OpenAI API response status: ${response.status}`);
        
        const data = await response.json();
        console.log('OpenAI API response:', JSON.stringify(data));
        
        // Check if the response has the expected structure
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          return new Response(JSON.stringify({
            success: true,
            message: data.choices[0].message.content
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } else {
          // If the response doesn't have the expected structure, return the whole response
          return new Response(JSON.stringify({
            success: false,
            error: "Unexpected response format from OpenAI API",
            rawResponse: data
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      } catch (error) {
        console.error('OpenAI API Test Error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Original workflow sleuth logic
    const { message, sessionId, messages } = reqData;
    
    // Create a Supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // The system instruction for WorkflowSleuth
    const systemInstruction = `You are **WorkflowSleuth**, a facilitation agent that helps managers surface every meaningful end-to-end workflow in their organisation.

GOAL  
• Guide the user through a structured brainstorm until you have at least **ten complete workflows** captured in the database via function calls.  
• A *workflow* starts with a clear external or internal TRIGGER and ends when the explicit OUTCOME has been achieved (payment collected, contract signed, machine calibrated, customer review sent, etc.).  
• After each answer you must either (a) store / update a workflow or (b) ask a concise follow-up that moves the discovery forward.  

STYLE  
• Plain business English, no jargon.  
• One question at a time.  
• Push for specifics: systems, roles, timing, pain points.  
• Stop asking when the user replies "DONE".

DATA CAPTURE  
Use the \`add_workflow\` function with these fields:  

- **title** — short label ("Inbound call → Job completed")  
- **start_event** — the exact trigger ("Customer dials main line")  
- **end_event** — what marks the workflow as finished ("Customer receives final report and signs off")  
- **people** — array of distinct roles or job titles mentioned ("Scheduler", "Technician", "Accounting Clerk")  
- **systems** — array of software or artefacts involved ("QuickBooks", "Paper form", "Twilio")  
- **pain_point** — single sentence describing friction if revealed ("Data re-keyed from email to ERP")

CONDUCT  
1. OPENING Briefly state the goal: "We'll list key workflows and pain points so we can spot AI wins."  
2. DISCOVERY Ask these ten core questions **in order**; after each one process the answer before asking the next.  
   1. Where does value first ENTER the business in a typical week?  
   2. Walk me forward until that value is FULLY DELIVERED.  
   3. Where do staff spend the most MINUTES on that path?  
   4. Where do ERRORS or REWORK appear?  
   5. Which moment, if delayed by one hour, would DAMAGE the promise to the customer?  
   6. What task relies most on GUT FEEL from a single person?  
   7. List every FILE or DATA format that moves through that path.  
   8. Where do we flip between DIGITAL and PAPER or vice-versa?  
   9. Which software tool is OLDEST or most hated in this chain?  
   10. Where do we wait on EXTERNAL parties (banks, suppliers, regulators)?  

   *After the tenth question ask: "Any other end-to-end flow we missed? Type DONE if that's everything."*  

3. FOLLOW-UPS If an answer is vague, drill down with one of these probes (pick the most relevant):  
   • "Who exactly receives that?"  
   • "What marks that step as COMPLETE?"  
   • "How long does it USUALLY sit before the next person touches it?"  
   • "Which system records that hand-off?"  

RULES  
• Do **not** offer solutions, tools, or AI advice during discovery—only capture workflows.  
• Validate required fields before calling \`add_workflow\`. If start or end is missing, ask a follow-up instead of storing.  
• Do not exceed one function call per user message.  
• Use temperature 0.2 behaviour—consistent and deterministic.  

END CONDITION  
When either **ten workflows** are stored **or** the user types "DONE", respond:  
"Great—workflows captured. Ready to map and score them." Then stop asking new discovery questions.`;

    // Prepare the conversation history for OpenAI
    const conversationHistory = [
      { role: "system", content: systemInstruction },
      ...messages.map((msg: any) => ({
        role: msg.isBot ? "assistant" : "user",
        content: msg.text
      }))
    ];

    // Add functions for OpenAI to call
    const functions = [
      {
        name: "add_workflow",
        description: "Add a new workflow to the database",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Short label for the workflow"
            },
            start_event: {
              type: "string",
              description: "The exact trigger that starts the workflow"
            },
            end_event: {
              type: "string",
              description: "What marks the workflow as finished"
            },
            people: {
              type: "array",
              items: { type: "string" },
              description: "Array of distinct roles or job titles mentioned"
            },
            systems: {
              type: "array",
              items: { type: "string" },
              description: "Array of software or artifacts involved"
            },
            pain_point: {
              type: "string",
              description: "Single sentence describing friction if revealed"
            }
          },
          required: ["title", "start_event", "end_event"]
        }
      }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: conversationHistory,
        functions: functions,
        function_call: "auto",
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    console.log("OpenAI Response:", JSON.stringify(data, null, 2));

    // Check if the response contains a function call
    let responseMessage = data.choices[0].message;
    
    if (responseMessage.function_call && responseMessage.function_call.name === "add_workflow") {
      // Parse the function arguments
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      
      console.log("Adding workflow:", functionArgs);

      // Insert the workflow into the database
      const { data: workflowData, error } = await supabase
        .from('workflows')
        .insert([
          {
            session_id: sessionId,
            title: functionArgs.title,
            start_event: functionArgs.start_event,
            end_event: functionArgs.end_event,
            people: functionArgs.people || [],
            systems: functionArgs.systems || [],
            pain_point: functionArgs.pain_point || null
          }
        ])
        .select();

      if (error) {
        console.error("Error inserting workflow:", error);
        throw new Error(`Failed to add workflow: ${error.message}`);
      }

      // Count existing workflows for this session
      const { count, error: countError } = await supabase
        .from('workflows')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId);

      if (countError) {
        console.error("Error counting workflows:", countError);
      }

      // Prepare a response to the user about the added workflow
      const confirmation = `I've captured the "${functionArgs.title}" workflow. ${count >= 10 ? "Great—workflows captured. Ready to map and score them." : "Let's continue."}`;
      
      return new Response(JSON.stringify({ 
        reply: confirmation,
        addedWorkflow: workflowData ? workflowData[0] : null,
        workflowCount: count
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Regular text response
      return new Response(JSON.stringify({ 
        reply: responseMessage.content,
        addedWorkflow: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in workflow-sleuth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
