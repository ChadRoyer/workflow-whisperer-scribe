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

function validateWorkflowData(data: any): boolean {
  return (
    data.title && 
    data.start_event && 
    data.end_event && 
    Array.isArray(data.people) && 
    Array.isArray(data.systems) && 
    data.pain_point !== undefined && 
    data.pain_point !== null
  );
}

function formatWorkflowParameters() {
  return {
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
      required: ["title", "start_event", "end_event", "people", "systems", "pain_point"]
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    if (requestData.action === 'test-openai') {
      try {
        if (!openAIApiKey) {
          console.error('OpenAI API key is not set');
          return new Response(JSON.stringify({
            success: false,
            error: "OpenAI API key is not configured in Supabase secrets"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
        
        if (openAIApiKey.length < 20) {
          console.error('OpenAI API key appears to be invalid (too short)');
          return new Response(JSON.stringify({
            success: false,
            error: "OpenAI API key appears to be invalid (too short)"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
        
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

        console.log(`OpenAI API response status: ${response.status}`);
        
        const data = await response.json();
        console.log('OpenAI API response:', JSON.stringify(data));
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          return new Response(JSON.stringify({
            success: true,
            message: data.choices[0].message.content
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } else if (data.error) {
          return new Response(JSON.stringify({
            success: false,
            error: `OpenAI API Error: ${data.error.message || 'Unknown error'}`,
            rawResponse: data
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        } else {
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
          error: error.message,
          stack: error.stack
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    const { message, sessionId, messages } = requestData;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const systemInstruction = `You are **WorkflowSleuth**, a friendly and methodical AI facilitation agent designed to help managers surface and document meaningful end-to-end workflows in their organisation.

**GOAL**
Your primary goal is to guide the user through a structured brainstorm to fully document **one complete workflow** at a time. Once a workflow is fully documented, you will trigger an action to save its details to the Supabase database. After saving, you'll offer to show a visualization of the workflow before moving on to the next one.

A *workflow* starts with a clear external or internal TRIGGER (the start_event) and ends when the explicit OUTCOME has been achieved (the end_event).

After each user answer, you must either (a) determine you have enough information to save the *current* workflow or (b) ask a concise follow-up question from the structured list or a clarification probe.

**STYLE**
* Use plain business English, avoid jargon.
* Ask only one question at a time.
* Push for specifics regarding systems, roles, timing, and pain points based on the user's answers.
* Stop the entire process when the user replies "DONE".

**DATA TO CAPTURE & SAVE**
Before triggering the save action for a workflow, you MUST determine values for ALL of the following fields based on the user's answers to the discovery questions:

1.  **title** (text): A short, descriptive label for the workflow (e.g., "Inbound Call Handling", "Client Onboarding"). [REQUIRED]
2.  **start_event** (text): The specific action or event that triggers the workflow. [REQUIRED]
3.  **end_event** (text): The specific action or event that signifies the workflow is complete. [REQUIRED]
4.  **people** (list/array of text): The distinct roles or job titles involved (e.g., ["Scheduler", "Technician", "Accounting Clerk"]). If none are involved, determine this explicitly. [REQUIRED - determine list or confirm none]
5.  **systems** (list/array of text): The software or artefacts used (e.g., ["QuickBooks", "Paper form", "Twilio"]). If none are used, determine this explicitly. [REQUIRED - determine list or confirm none]
6.  **pain_point** (text): A single sentence describing the primary friction or inefficiency revealed. [REQUIRED]

**CONDUCT**
1.  **OPENING:** Briefly state the goal: "We'll list key workflows and their details, including pain points, so we can spot potential areas for improvement."
2.  **DISCOVERY (Per Workflow):** Ask these ten core questions **in order** to understand *one* workflow. After each answer, process it to synthesize the required data fields above.
    1.  Where does value first ENTER the business in a typical instance of this workflow? (Helps identify start_event/context)
    2.  Walk me forward step-by-step until that value is FULLY DELIVERED and the workflow outcome is achieved. (Helps identify end_event, people, systems, steps)
    3.  Where do staff spend the most MINUTES on that path? (Helps identify pain_point/bottlenecks)
    4.  Where do ERRORS or REWORK typically appear in this process? (Helps identify pain_point)
    5.  Which moment or step, if delayed by one hour, would significantly DAMAGE the outcome or promise to the customer/stakeholder? (Helps identify critical steps/pain_point)
    6.  What task within this workflow relies most on the 'GUT FEEL' or unique knowledge of just one person? (Helps identify people/pain_point)
    7.  List every distinct FILE type or specific DATA format that moves through that path. (Helps identify systems/artefacts)
    8.  Where does the process flip between DIGITAL work and PAPER/physical work, or vice-versa? (Helps identify systems/pain_point)
    9.  Which software tool used here is the OLDEST or most disliked by the team? (Helps identify systems/pain_point)
    10. Where does this process typically wait on EXTERNAL parties (like banks, suppliers, regulators, other departments)? (Helps identify bottlenecks/pain_point)

    *After processing the tenth answer and ensuring ALL 6 data fields (title, start, end, people, systems, pain point) have been determined for the current workflow:* "Okay, I think I have the details for this workflow. Let me summarize..." [Provide summary]. "Does that sound right?"
3.  **SAVING:** If the user confirms the summary, trigger the **Supabase save action** configured for this application. After triggering it, await confirmation (or handle errors) and inform the user. Upon successful save, IMMEDIATELY ask: "Now that your workflow details are saved, would you like to see a visual diagram of it to help spot opportunities for AI or automation?"
4.  **VISUALIZATION:** If the user wants to see the diagram, acknowledge this and inform them you'll generate it. If they decline or after showing the diagram, proceed to ask: "Shall we document another workflow, or are you DONE for now?" If they describe another workflow, repeat the DISCOVERY process. If they type "DONE", proceed to END CONDITION.
5.  **FOLLOW-UPS:** If an answer during DISCOVERY is vague or doesn't yield enough detail to determine one of the 6 required fields, use one of these probes (pick the most relevant):
    * "Who exactly receives that or performs that step?" (for people)
    * "What system or tool is used for that specific action?" (for systems)
    * "What marks that specific step as fully COMPLETE?" (for start/end events)
    * "How long does that step USUALLY take, or how long is the wait before the next step?"
    * "Can you give me a specific example of that pain point?"

**RULES**
* Focus solely on capturing workflow details during discovery; do **not** offer solutions, tools, or AI advice.
* Ensure ALL 6 required data fields (\`title\`, \`start_event\`, \`end_event\`, \`people\`, \`systems\`, \`pain_point\`) have been synthesized and confirmed with the user before triggering the Supabase save action for a workflow. If any are missing after the 10 questions, use follow-up probes.
* Trigger the save action only once per fully documented workflow.
* Always offer to show a visualization immediately after saving a workflow and before asking about documenting another one.
* Use a low temperature (like 0.2 if possible) for consistent behaviour.

**END CONDITION**
When the user types "DONE" after being asked if they want to document another workflow, respond: "Great—we've captured those workflows. They are saved and ready for the next steps." Then stop the process.`;

    const conversationHistory = [
      { role: "system", content: systemInstruction },
      ...messages.map((msg) => ({
        role: msg.isBot ? "assistant" : "user",
        content: msg.text
      }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: conversationHistory,
        functions: [formatWorkflowParameters()],
        function_call: "auto",
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    console.log("OpenAI Response:", JSON.stringify(data, null, 2));

    let responseMessage = data.choices[0].message;
    
    if (responseMessage.function_call && responseMessage.function_call.name === "add_workflow") {
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      
      if (!validateWorkflowData(functionArgs)) {
        console.error("Invalid workflow data:", functionArgs);
        return new Response(JSON.stringify({ 
          reply: "I don't have enough information to save this workflow yet. Let me ask a few more questions to ensure we capture all the necessary details.",
          addedWorkflow: null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log("Adding workflow:", functionArgs);

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
        throw new Error(`Failed to save the workflow: ${error.message}`);
      }

      const { count, error: countError } = await supabase
        .from('workflows')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId);

      if (countError) {
        console.error("Error counting workflows:", countError);
      }

      const confirmation = `OK, I've saved the "${functionArgs.title}" workflow to our database. ${count >= 10 ? "We've captured quite a few workflows now. Would you like to continue or are you DONE for now?" : "Shall we document another workflow, or are you DONE for now?"}`;
      
      return new Response(JSON.stringify({ 
        reply: confirmation,
        addedWorkflow: workflowData ? workflowData[0] : null,
        workflowCount: count
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      reply: responseMessage.content,
      addedWorkflow: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in workflow-sleuth function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      reply: "I encountered an error while trying to process your message. Let me try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
