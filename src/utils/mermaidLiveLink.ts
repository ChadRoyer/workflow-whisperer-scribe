
import pako from "pako";

/**
 * Convert a Mermaid code string into a shareable
 * Mermaid-Live Editor link with proper compression.
 * 
 * Steps:
 *  - deflate (raw) with pako
 *  - base64 with btoa
 *  - URL-safe: replace "+", "/" with "-", "_"
 *  - Remove "=" padding at the end
 *  - URI-encode the final string
 */
export function mermaidLiveLink(code: string): string {
  try {
    // Clean the code by removing any markdown code block indicators
    const cleanCode = code
      .replace(/^```mermaid\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    
    // Debug output to verify what we're compressing
    console.log("Compressing Mermaid code:", cleanCode);
    
    // Compress the code using pako deflate with maximum compression
    const encodedValue = new TextEncoder().encode(cleanCode);
    const compressedData = pako.deflate(encodedValue, { level: 9 });
    
    // Convert the compressed data to a base64 string
    const base64String = btoa(
      Array.from(compressedData)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    
    // Replace characters for URL safety and remove padding
    const urlSafeBase64 = base64String
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    
    // Construct the final URL with the pako: prefix and properly URI-encode the payload
    const finalUrl = `https://mermaid.live/edit#pako:${encodeURIComponent(urlSafeBase64)}`;
    
    console.log("Generated Mermaid Live URL:", finalUrl);
    
    return finalUrl;
  } catch (error) {
    console.error("Error creating Mermaid live link:", error);
    // Fallback to direct URL encoding for simple diagrams
    return `https://mermaid.live/edit?code=${encodeURIComponent(code)}`;
  }
}
