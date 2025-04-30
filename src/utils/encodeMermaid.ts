
/**
 * Generates a Mermaid Live Editor link with the provided diagram code
 * 
 * @param code - The Mermaid diagram code to encode
 * @returns A URL that opens the diagram in Mermaid Live Editor
 */
export function mermaidLiveLink(code: string): string {
  // Base64 encode the raw diagram code first
  const base64Encoded = btoa(unescape(encodeURIComponent(code)));
  
  // Return the properly formatted Mermaid Live Editor URL
  return `https://mermaid.live/edit#pako:${encodeURIComponent(base64Encoded)}`;
}
