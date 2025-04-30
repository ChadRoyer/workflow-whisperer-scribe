
import pako from "pako";
import { Buffer } from "buffer";

/** Build a Mermaid-Live link from raw code */
export function mermaidLiveLink(raw: string): string {
  // Clean the code - either handles full fenced blocks or just the inner code
  const clean = raw
    .replace(/^```mermaid\s*/i, "") // Remove opening fence if present
    .replace(/```$/i, "")           // Remove closing fence if present
    .trim();

  const deflated = pako.deflate(clean, { level: 9 });
  const b64 = Buffer.from(deflated).toString("base64");
  const b64url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `https://mermaid.live/edit#pako:${b64url}`;
}
