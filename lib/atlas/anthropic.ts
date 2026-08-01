import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null | undefined;

// Renvoie un client Claude si ANTHROPIC_API_KEY est configurée, sinon null.
// Chaque agent Atlas vérifie ce client et renvoie un résultat "generated: false"
// explicite plutôt que de faire planter la page quand la clé est absente.
export function getAnthropicClient(): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient;

  if (!process.env.ANTHROPIC_API_KEY) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new Anthropic();
  return cachedClient;
}

export const ATLAS_MODEL = "claude-opus-5";
