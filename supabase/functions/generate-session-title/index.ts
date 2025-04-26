
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

  try {
    // Parse request body
    const { sessionId, messages } = await req.json();

    // Validate inputs
    if (!sessionId || !messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter to only include user messages
    const userMessages = messages.filter((msg: any) => msg.role === 'user');

    if (userMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No user messages found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a system prompt to generate an intuitive title
    const titleGenerationPrompt = `
      Generate a concise, descriptive title (max 30 characters) based on the context of these user messages.
      Focus on identifying the key workflow, process, or topic being discussed.
      
      User Messages:
      ${userMessages.map((msg: any) => msg.text).join('\n')}
    `;

    // Call OpenAI to generate title
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an assistant that generates concise titles based on user messages. Focus on the main topic or workflow being discussed.' 
          },
          { 
            role: 'user', 
            content: titleGenerationPrompt 
          }
        ],
        max_tokens: 30,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const generatedTitle = data.choices[0].message.content.trim();

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update session with generated title
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ title: generatedTitle })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update session title',
        details: updateError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      title: generatedTitle,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-session-title function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
