import pako from "pako";
import { Buffer } from "buffer";

export function mermaidLiveLink(raw: string): string {
  const code = raw
    .replace(/^```mermaid[^\n]*\n/i, "")
    .replace(/```$/i, "")
    .replace(/\r\n/g, "\n")
    .trim();

  // Mermaid-Live expects a JSON string {code:"...",mermaid:{theme:"default"}}
  const json = JSON.stringify({
    code,
    mermaid: { theme: "default" }   // you can omit or set other options
  });

  // Explicitly encode the JSON string to Uint8Array before deflating
  const data = new TextEncoder().encode(json);
  const deflated = pako.deflate(data, { level: 9 });

  const b64url = Buffer.from(deflated)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `https://mermaid.live/edit#pako:${b64url}`;
}
