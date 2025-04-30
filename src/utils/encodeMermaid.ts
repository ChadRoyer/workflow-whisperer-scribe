
/**
 * Generates a Mermaid Live Editor link with the provided diagram code
 * 
 * @param code - The Mermaid diagram code to encode
 * @returns A URL that opens the diagram in Mermaid Live Editor
 */
export function mermaidLiveLink(code: string): string {
  try {
    // Base64 encode the raw diagram code first
    const base64Encoded = btoa(unescape(encodeURIComponent(code)));
    
    // Return the properly formatted Mermaid Live Editor URL
    return `https://mermaid.live/edit#pako:${encodeURIComponent(base64Encoded)}`;
  } catch (error) {
    console.error("Error encoding Mermaid diagram:", error);
    // Provide a fallback with minimal encoding in case of errors
    const simpleEncoded = btoa(code.replace(/[\n\r\t]/g, ' ').substring(0, 1000));
    return `https://mermaid.live/edit#base64:${simpleEncoded}`;
  }
}

/**
 * Properly encodes a Mermaid diagram for use in URLs or API calls
 * @param code - The raw Mermaid diagram code
 * @returns The properly encoded string
 */
export function encodeMermaidDiagram(code: string): string {
  return btoa(unescape(encodeURIComponent(code)));
}
