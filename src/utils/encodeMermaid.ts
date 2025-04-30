
import { compress } from "lz-string";

/**
 * Generates a Mermaid Live Editor link with the provided diagram code
 * 
 * @param code - The Mermaid diagram code to encode
 * @returns A URL that opens the diagram in Mermaid Live Editor
 */
export function mermaidLiveLink(code: string): string {
  // Use compress function to encode the mermaid code
  const encoded = compress(code);
  
  // Convert to base64 and URI encode for the URL
  const base64Encoded = btoa(encoded);
  
  return `https://mermaid.live/edit#pako:${encodeURIComponent(base64Encoded)}`;
}
