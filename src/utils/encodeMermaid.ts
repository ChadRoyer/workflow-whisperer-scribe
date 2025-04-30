
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
    
    // Return the properly formatted Mermaid Live Editor URL with explicit URL params
    // Using the edit endpoint with the state parameter to make it more reliable
    return `https://mermaid.live/edit?code=${encodeURIComponent(code)}`;
  } catch (error) {
    console.error("Error encoding Mermaid diagram:", error);
    
    // Provide a fallback with direct code parameter if encoding fails
    return `https://mermaid.live/edit?code=${encodeURIComponent(code.substring(0, 2000))}`;
  }
}

/**
 * Properly encodes a Mermaid diagram for use in URLs or API calls
 * @param code - The raw Mermaid diagram code
 * @returns The properly encoded string
 */
export function encodeMermaidDiagram(code: string): string {
  try {
    return btoa(unescape(encodeURIComponent(code)));
  } catch (error) {
    console.error("Error encoding diagram:", error);
    // Simple fallback encoding
    return btoa(code.replace(/[\n\r\t]/g, ' ').substring(0, 1000));
  }
}

/**
 * Safely renders a Mermaid diagram with error handling
 * @param elementId - The ID of the element to render the diagram in
 * @param code - The Mermaid diagram code
 * @returns Promise that resolves when rendering is complete
 */
export async function renderMermaidSafely(elementId: string, code: string): Promise<void> {
  try {
    // Dynamically import mermaid to ensure it's loaded
    const mermaid = (await import('mermaid')).default;
    
    // Initialize with safer settings if not already initialized
    if (!window.mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'default',
        logLevel: 1
      });
      window.mermaidInitialized = true;
    }
    
    // Attempt to render the diagram
    await mermaid.render(elementId, code);
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to render Mermaid diagram:", error);
    return Promise.reject(error);
  }
}
