import OpenAI from "openai";
import { logger } from "./logger";

let client: OpenAI | null = null;
let warned = false;

/**
 * Returns a lazily-constructed OpenAI client, or null if no API key has been
 * configured. Callers must handle the null case by responding 503 -- do not
 * throw, since this app should degrade gracefully until the user supplies
 * their own OPENAI_API_KEY secret.
 */
export function getOpenAiClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    if (!warned) {
      logger.warn(
        "OPENAI_API_KEY is not set -- AI analysis endpoints will return 503",
      );
      warned = true;
    }
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const AI_MODEL = "gpt-5";
