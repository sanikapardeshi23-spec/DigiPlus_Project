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

export interface CatchUpBriefInput {
  meetingTitle: string;
  meetingDate?: string;
  participants?: string[];
  agenda?: string;
  notes?: string;
  summary?: string;
  decisions?: string[];
  actionItems?: Array<{
    title: string;
    owner?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
  }>;
  carriedForwardTasks?: Array<{
    title: string;
    owner?: string;
    origin?: string;
  }>;
  userContext?: string;
}

function buildStructuredFallbackBrief(input: CatchUpBriefInput): string {
  const decisionsList =
    input.decisions && input.decisions.length > 0
      ? input.decisions.map((d) => `• ${d}`).join("\n")
      : "• No formal decisions recorded.";

  const actionsList =
    input.actionItems && input.actionItems.length > 0
      ? input.actionItems
          .map(
            (a) =>
              `• [${(a.priority || "Medium").toUpperCase()}] ${a.title} → Assigned to: ${
                a.owner || "Unassigned"
              } (Due: ${a.dueDate || "TBD"}, Status: ${a.status || "Open"})`
          )
          .join("\n")
      : "• All deliverables on schedule / no open action items.";

  const carriedList =
    input.carriedForwardTasks && input.carriedForwardTasks.length > 0
      ? input.carriedForwardTasks
          .map((t) => `• ↻ ${t.title} (Owner: ${t.owner || "Team"}, Origin: ${t.origin || "Previous Sync"})`)
          .join("\n")
      : "• No carried-over tasks for this session.";

  return `# ⚡ AI Catch-Up Executive Brief: ${input.meetingTitle}
**Date:** ${input.meetingDate || "Recent"}  
**Attendees:** ${(input.participants || []).join(", ") || "Workspace Team"}  

### 1. Executive Summary
${input.summary || input.notes || "Discussion held covering planned agenda items and operational alignment."}

### 2. Critical Decisions Made
${decisionsList}

### 3. Action Items & Accountabilities
${actionsList}

### 4. Meeting Continuity & Carried-Over Items
${carriedList}

### 5. Next Steps for Team Catch-Up
• Review assigned items above and update status upon progress.
• Follow up with meeting attendees if any blockers exist on open deliverables.`;
}

export async function generateCatchUpBriefWithClaude(
  input: CatchUpBriefInput
): Promise<{ brief: string; aiGenerated: boolean }> {
  const anthropic = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20241022";

  if (!anthropic) {
    logger.info("Generating structured offline catch-up brief (Claude API key not configured)");
    return { brief: buildStructuredFallbackBrief(input), aiGenerated: false };
  }

  const systemPrompt = `You are DigiPlus Executive Intelligence, an AI meeting synthesizer.
Your task is to generate a comprehensive, highly readable and actionable "Catch-Up Executive Brief" for someone who missed a meeting or needs to catch up in under 60 seconds.

Strict Rules:
- Base your analysis strictly on the provided meeting context, agenda, decisions, and action items.
- Structure your response using clean GitHub Flavored Markdown with emojis and bold headers.
- Include these sections:
  1. Executive Summary (2-3 concise sentences on what took place)
  2. Critical Decisions Made (bullet points of decisions)
  3. Action Items & Accountability (task title, owner, due date, priority, status)
  4. Continuity & Carried-Over Items (note any carried-over tasks or continuity items)
  5. Immediate Next Steps (actionable bullet points for the reader)`;

  const userPrompt = `Create a catch-up brief for:
Meeting: ${input.meetingTitle}
Date: ${input.meetingDate || "Recent"}
Attendees: ${(input.participants || []).join(", ") || "Workspace Team"}
Agenda: ${input.agenda || "General sync"}
Notes / Summary: ${input.summary || input.notes || "None"}
Decisions: ${(input.decisions || []).join("; ") || "None"}
Action Items:
${
  (input.actionItems || [])
    .map(
      (a) =>
        `- [${a.priority || "Medium"}] ${a.title} (Owner: ${a.owner || "Unassigned"}, Due: ${
          a.dueDate || "TBD"
        }, Status: ${a.status || "Open"})`
    )
    .join("\n") || "None"
}
Carried-Forward Tasks:
${
  (input.carriedForwardTasks || [])
    .map((t) => `- ${t.title} (Owner: ${t.owner || "Unassigned"}, Origin: ${t.origin || "Previous meeting"})`)
    .join("\n") || "None"
}`;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const contentBlock = message.content[0];
    if (!contentBlock || contentBlock.type !== "text") {
      throw new Error("No text response received from Claude API.");
    }

    return { brief: contentBlock.text.trim(), aiGenerated: true };
  } catch (err) {
    logger.warn({ err }, "Claude catch-up brief API error, falling back to structured brief");
    return { brief: buildStructuredFallbackBrief(input), aiGenerated: false };
  }
}
