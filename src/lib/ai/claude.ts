// Re-export OpenAI implementations for backwards compatibility
// All Anthropic SDK calls have been replaced with the official OpenAI SDK (GPT-4.1 mini)
export {
  processMeetingWithOpenAI as processMeetingWithClaude,
  generateCatchUpBriefWithOpenAI as generateCatchUpBriefWithClaude,
  getOpenAIClient as getAnthropicClient,
} from "./openai";
export type { CatchUpBriefInput } from "./openai";
