
// OpenAI interaction logic
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export async function handleOpenAITest(openAIApiKey: string) {
  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key is not set');
      return {
        success: false,
        error: "OpenAI API key is not configured in Supabase secrets"
      };
    }
    
    if (openAIApiKey.length < 20) {
      console.error('OpenAI API key appears to be invalid (too short)');
      return {
        success: false,
        error: "OpenAI API key appears to be invalid (too short)"
      };
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
      return {
        success: true,
        message: data.choices[0].message.content
      };
    } else if (data.error) {
      return {
        success: false,
        error: `OpenAI API Error: ${data.error.message || 'Unknown error'}`,
        rawResponse: data
      };
    } else {
      return {
        success: false,
        error: "Unexpected response format from OpenAI API",
        rawResponse: data
      };
    }
  } catch (error) {
    console.error('OpenAI API Test Error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

export async function processWorkflowChat(
  openAIApiKey: string,
  systemInstruction: string,
  messages: Array<{ role: string; content: string }>,
  functionDefinition: any
) {
  return await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages,
      functions: [functionDefinition],
      function_call: "auto",
      temperature: 0.2,
    }),
  });
}
