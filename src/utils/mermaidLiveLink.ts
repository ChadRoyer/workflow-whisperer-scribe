
import pako from "pako";
import { Buffer } from "buffer";

/** Build a Mermaid-Live link from raw code */
export function mermaidLiveLink(raw: string): string {
  const clean = raw
    .replace(/^```mermaid\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const deflated = pako.deflate(clean, { level: 9 });
  const b64 = Buffer.from(deflated).toString("base64");
  const b64url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `https://mermaid.live/edit#pako:${b64url}`;
}
