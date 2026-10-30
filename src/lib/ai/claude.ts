import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import {
  claudeMeetingProcessingSchema,
  ClaudeMeetingInput,
  ClaudeMeetingOutput,
} from "@/lib/validation";

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || apiKey === "your-anthropic-api-key") {
    return null;
  }
  return new Anthropic({ apiKey });
}

export async function processMeetingWithClaude(
  input: ClaudeMeetingInput
): Promise<ClaudeMeetingOutput> {
  const anthropic = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20241022";

  if (!anthropic) {
    logger.warn("ANTHROPIC_API_KEY is not configured in .env.local.");
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Please add your Anthropic API key to .env.local to enable real Claude AI processing."
    );
  }

  const systemPrompt = `You are DigiPlus AI, an expert workspace meeting synthesizer.
Your task is to analyze raw meeting notes and output strictly structured JSON.

Strict Rules:
1. Do NOT invent or hallucinate decisions, task owners, or deadlines that are not mentioned in the notes.
2. If an action item does not state an owner, set owner_name to null.
3. If an action item does not specify a due date, set due_date to null.
4. If details or descriptions are absent, set description to null.
5. If decisions were not explicitly made or agreed upon, return an empty array for decisions.
6. Identify key discussion points, explicit decisions, concrete action items, and any unresolved uncertainties/open questions.
7. Output must be strictly valid JSON matching the exact schema with no extra conversational text or markdown code blocks outside JSON.`;

  const userPrompt = `Analyze the following meeting details:

Title: ${input.title}
Agenda: ${input.agenda || "Not specified"}
Participants: ${input.participants || "Not specified"}

Raw Meeting Notes:
"""
${input.raw_notes}
"""

Return JSON in this format:
{
  "summary": "Clear, concise overview of what took place",
  "key_points": ["Key discussion point 1", "Key discussion point 2"],
  "decisions": ["Agreed decision 1", "Agreed decision 2"],
  "action_items": [
    {
      "title": "Clear action-verb task title",
      "description": "Details or null if none",
      "owner_name": "Full name of person or null if unassigned",
      "due_date": "YYYY-MM-DD or null if not stated",
      "priority": "low | medium | high | urgent",
      "status": "pending"
    }
  ],
  "uncertainties": ["Unresolved question or risk mentioned in notes"]
}`;

  try {
    logger.info({ model, title: input.title }, "Sending meeting notes to Claude API");

    const message = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const contentBlock = message.content[0];
    if (!contentBlock || contentBlock.type !== "text") {
      throw new Error("No text response received from Claude API.");
    }

    const text = contentBlock.text.trim();
    // Extract JSON block even if model wraps in ```json ... ```
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error({ responseText: text }, "Claude response does not contain valid JSON");
      throw new Error("Could not parse JSON from Claude response.");
    }

    const rawJson = JSON.parse(jsonMatch[0]);

    // Validate strictly with Zod
    const validated = claudeMeetingProcessingSchema.parse(rawJson);
    logger.info({ actionItemsCount: validated.action_items.length }, "Claude processing succeeded");
    return validated;
  } catch (err: unknown) {
    logger.error({ err }, "Error processing meeting with Claude API");
    throw err;
  }
}
