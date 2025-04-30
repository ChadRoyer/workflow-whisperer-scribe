
import pako from "pako";

/**
 * Convert a Mermaid code string into a shareable
 * Mermaid-Live Editor link with proper compression.
 */
export function mermaidLiveLink(code: string): string {
  try {
    // Clean the code - remove mermaid code block markers if present
    const cleanCode = code
      .replace(/^```mermaid\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    // Compress the code using pako deflate
    const deflated = pako.deflate(cleanCode, { level: 9 });
    
    // Convert Uint8Array to binary string
    const binaryString = Array.from(deflated)
      .map(byte => String.fromCharCode(byte))
      .join('');
    
    // Convert to base64 and make URL-safe
    const base64 = btoa(binaryString)
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    
    return `https://mermaid.live/edit#pako:${base64}`;
  } catch (error) {
    console.error("Error creating Mermaid live link:", error);
    // Fallback to direct URL encoding (less optimal but should work for simple diagrams)
    return `https://mermaid.live/edit?code=${encodeURIComponent(code)}`;
  }
}
