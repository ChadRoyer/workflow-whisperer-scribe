
/**
 * Generates a Mermaid Live Editor link with the provided diagram code
 * 
 * @param code - The Mermaid diagram code to encode
 * @returns A URL that opens the diagram in Mermaid Live Editor
 */
export function mermaidLiveLink(code: string): string {
  // Simple base64 encoding approach for consistency with the edge function
  const base64Encoded = btoa(unescape(encodeURIComponent(code)));
  
  // Return a direct link to Mermaid Live Editor with the properly encoded diagram
  return `https://mermaid.live/edit#pako:${encodeURIComponent(base64Encoded)}`;
}
