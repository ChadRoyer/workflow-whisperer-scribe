
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { validateWorkflowData, formatWorkflowParameters } from "./validation.ts";
import { handleOpenAITest, processWorkflowChat } from "./openai.ts";
import { systemInstruction } from "./system-prompt.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = "https://jqrgqevteccqxnrmocuw.supabase.co";
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
    const requestData = await req.json();
    
    if (requestData.action === 'test-openai') {
      const result = await handleOpenAITest(openAIApiKey!);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      });
    }

    const { message, sessionId, messages } = requestData;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const conversationHistory = [
      { role: "system", content: systemInstruction },
      ...messages.map((msg: { isBot: boolean; text: string }) => ({
        role: msg.isBot ? "assistant" : "user",
        content: msg.text
      }))
    ];

    // If this is a request for a diagram specifically
    if (message.toLowerCase().includes('diagram') || message.toLowerCase().includes('show me')) {
      console.log("Detected diagram request for recent workflow");
      
      // Find the most recent workflow for this session
      const { data: workflows, error: workflowError } = await supabase
        .from('workflows')
        .select('title')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (workflowError) {
        console.error("Error fetching recent workflow:", workflowError);
        return new Response(JSON.stringify({ 
          reply: "I encountered an error while retrieving your recent workflow. Please try again.",
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!workflows || workflows.length === 0) {
        console.log("No workflows found for session", sessionId);
        return new Response(JSON.stringify({ 
          reply: "I don't have any saved workflows to visualize yet. Let's document a workflow first.",
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const workflowTitle = workflows[0].title;
      console.log(`Found recent workflow: ${workflowTitle}. Generating visualization...`);
      
      try {
        // Call the edge function to generate Mermaid diagram
        const visualizationResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-workflow-mermaid`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ workflowTitle })
          }
        );
        
        if (!visualizationResponse.ok) {
          console.error(`Visualization request failed with status: ${visualizationResponse.status}`);
          throw new Error(`Visualization request failed with status: ${visualizationResponse.status}`);
        }
        
        const visualData = await visualizationResponse.json();
        
        if (visualData.error) {
          console.error("Visualization error:", visualData.error);
          throw new Error(visualData.error);
        }

        // Get the Mermaid Live link and chart data
        const mermaidChart = visualData.mermaidChart;
        const liveLink = visualData.link;
        
        // Create a message with the link rather than embedding the chart
        const linkMessage = `🗺️ Your workflow diagram is ready: **[Open in Mermaid Live](${liveLink})**\n\n*(zoom, edit, export from there)*`;
        
        // Save the link message to chat messages
        const { data: messageData, error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            role: 'assistant',
            content: linkMessage
          })
          .select();
          
        if (messageError) {
          console.error("Error saving diagram message:", messageError);
          throw new Error(`Failed to save diagram link: ${messageError.message}`);
        }
        
        console.log("Successfully generated and saved Mermaid diagram link!");
        
        // Create a follow-up message
        const followUpQuestion = "Shall we document another workflow, or are you DONE for now?";
        
        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            role: 'assistant',
            content: followUpQuestion
          });
          
        return new Response(
          JSON.stringify({ 
            reply: linkMessage, 
            nextMessage: followUpQuestion
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error generating visualization:", error);
        return new Response(
          JSON.stringify({ 
            reply: "I encountered an error while generating the visualization. Would you like to try again or document another workflow?",
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response = await processWorkflowChat(
      openAIApiKey!,
      systemInstruction,
      conversationHistory,
      formatWorkflowParameters()
    );

    const data = await response.json();
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

      // Handle visualization request
      if (message.toLowerCase().includes('yes') && 
          messages[messages.length - 2]?.text?.includes('would you like to see a visual diagram')) {
        try {
          console.log(`Generating visualization for workflow: ${functionArgs.title}`);
          
          // Call our edge function to generate the Mermaid diagram
          const visualizationResponse = await fetch(
            `${supabaseUrl}/functions/v1/generate-workflow-mermaid`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({ workflowTitle: functionArgs.title })
            }
          );

          if (!visualizationResponse.ok) {
            throw new Error(`Visualization request failed with status: ${visualizationResponse.status}`);
          }
          
          const visualData = await visualizationResponse.json();
          
          if (visualData.error) {
            console.error("Visualization error:", visualData.error);
            throw new Error(visualData.error);
          }
          
          // Log the generated diagram for debugging
          console.log("Successfully generated Mermaid diagram:", visualData.mermaidChart);

          // Save the Mermaid diagram directly to the chat
          const { data: messageData, error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              session_id: sessionId,
              role: 'assistant',
              content: visualData.mermaidChart
            })
            .select();

          if (messageError) {
            console.error("Error saving diagram message:", messageError);
            throw new Error(`Failed to save diagram: ${messageError.message}`);
          }
          
          console.log("Saved diagram to chat messages:", messageData);

          // Create follow-up question
          const followUpQuestion = count >= 10 
            ? "Now that we've captured quite a few workflows, would you like to continue or are you DONE for now?"
            : "Shall we document another workflow, or are you DONE for now?";

          // Insert the follow-up question
          const { error: followUpError } = await supabase
            .from('chat_messages')
            .insert({
              session_id: sessionId,
              role: 'assistant',
              content: followUpQuestion
            });

          if (followUpError) {
            console.error("Error saving follow-up message:", followUpError);
          }

          // Return both the diagram and follow-up question
          return new Response(
            JSON.stringify({ 
              reply: visualData.mermaidChart,
              addedWorkflow: workflowData ? workflowData[0] : null,
              workflowCount: count,
              nextMessage: followUpQuestion
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error("Error generating visualization:", error);
          return new Response(
            JSON.stringify({ 
              reply: "I encountered an error while generating the visualization. Would you like to document another workflow, or are you DONE for now?",
              addedWorkflow: workflowData ? workflowData[0] : null,
              workflowCount: count
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const confirmation = `OK, I've saved the "${functionArgs.title}" workflow to our database. ${count >= 10 ? "We've captured quite a few workflows now. Would you like to continue or are you DONE for now?" : "Now that your workflow details are saved, would you like to see a visual diagram of it to help spot opportunities for AI or automation?"}`;
      
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
