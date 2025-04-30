
import pako from "pako";

/** Return a shareable Mermaid Live-Editor link */
export function mermaidLiveLink(code: string): string {
  // Strip ``` wrappers if present
  const pure = code
    .replace(/^```mermaid\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // Deflate (raw) then base64-url encode
  const compressed = pako.deflate(pure, { level: 9 });
  const binary = String.fromCharCode(...compressed);
  const b64 = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `https://mermaid.live/edit#pako:${b64}`;
}
