
export async function webSearch(query: string) {
  const key = Deno.env.get('SERP_API_KEY');
  if (!key) {
    console.error('SERP_API_KEY environment variable is not set');
    throw new Error('SERP_API_KEY is required for web search');
  }
  
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${key}&num=6`;
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`SerpAPI error: ${res.status} - ${errorText}`);
      throw new Error(`SerpAPI request failed with status ${res.status}`);
    }
    
    const json = await res.json();
    
    return (json.organic_results || []).map((r: any) => ({
      title: r.title,
      url: r.link
    }));
  } catch (error) {
    console.error('Web search error:', error);
    throw new Error(`Web search failed: ${error.message}`);
  }
}
