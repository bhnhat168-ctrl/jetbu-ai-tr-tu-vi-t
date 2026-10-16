import { brainStream } from "./brain.server";

/** Streams plain text for a prompt through the JETBU AI Brain. */
export async function streamGatewayText(opts: { system: string; user: string | unknown[]; signal: AbortSignal; json?: boolean; rules?: boolean }): Promise<Response> {
  return brainStream({ system: opts.system, messages: [{ role: "user", content: opts.user }], signal: opts.signal, json: opts.json, rules: opts.rules });
}
