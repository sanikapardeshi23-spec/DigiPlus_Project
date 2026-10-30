import OpenAI from "openai";
import { logger } from "@/lib/logger";
import {
  meetingProcessingSchema,
  AiMeetingOutput,
  AiMeetingInput,
} from "@/lib/validation";

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === "your-openai-api-key") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}

export async function processMeetingWithOpenAI(
  input: AiMeetingInput
): Promise<AiMeetingOutput> {
  const openai = getOpenAIClient();
  const model = getOpenAIModel();

  if (!openai) {
    logger.warn("OPENAI_API_KEY is not configured in .env.local.");
    throw new Error(
      "OPENAI_API_KEY is not configured. Please add your OpenAI API key to .env.local to enable real OpenAI processing."
    );
  }

  const systemPrompt = `You are DigiPlus AI, an expert workspace meeting synthesizer.
Your task is to analyze raw meeting notes and output strictly structured JSON.

Strict Rules:
1. Do NOT invent or hallucinate decisions, task owners, or deadlines that are not explicitly stated in the notes.
2. If an action item does not specify an owner, set owner_name to null.
3. If an action item does not state a due date, set due_date to null.
4. If descriptions are absent, set description to null.
5. If decisions were not explicitly made, return an empty array [] for decisions.
6. Identify key discussion points, explicit decisions, concrete action items, and any unresolved uncertainties.
7. Output must be valid JSON matching the exact schema.`;

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
    logger.info({ model, title: input.title }, "Sending meeting notes to OpenAI API");

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response received from OpenAI API.");
    }

    const rawJson = JSON.parse(content);
    const validated = meetingProcessingSchema.parse(rawJson);
    logger.info(
      { actionItemsCount: validated.action_items.length },
      "OpenAI meeting processing succeeded"
    );
    return validated;
  } catch (err: unknown) {
    const error = err as Error;
    // Log error message safely without exposing headers or secrets
    logger.error({ message: error.message }, "Error processing meeting with OpenAI API");
    throw err;
  }
}

export interface CatchUpBriefInput {
  meetingTitle: string;
  meetingDate?: string;
  participants?: string[] | string;
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

function formatParticipants(participants?: string[] | string): string {
  if (!participants) return "Workspace Team";
  if (Array.isArray(participants)) return participants.filter(Boolean).join(", ");
  return String(participants);
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
          .map(
            (t) =>
              `• ↻ ${t.title} (Owner: ${t.owner || "Team"}, Origin: ${
                t.origin || "Previous Sync"
              })`
          )
          .join("\n")
      : "• No carried-over tasks for this session.";

  return `# ⚡ AI Catch-Up Executive Brief: ${input.meetingTitle}
**Date:** ${input.meetingDate || "Recent"}  
**Attendees:** ${formatParticipants(input.participants)}  

### 1. Executive Summary
${
  input.summary ||
  input.notes ||
  "Discussion held covering planned agenda items and operational alignment."
}

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

export async function generateCatchUpBriefWithOpenAI(
  input: CatchUpBriefInput
): Promise<{ brief: string; aiGenerated: boolean }> {
  const openai = getOpenAIClient();
  const model = getOpenAIModel();

  if (!openai) {
    logger.info("Generating structured offline catch-up brief (OPENAI_API_KEY not configured)");
    return { brief: buildStructuredFallbackBrief(input), aiGenerated: false };
  }

  const systemPrompt = `You are DigiPlus Executive Intelligence, an AI meeting synthesizer.
Your task is to generate a comprehensive, highly readable and actionable "Catch-Up Executive Brief" for someone who missed a meeting or needs to catch up in under 60 seconds.

Strict Rules:
- Base your analysis strictly on the provided meeting context, agenda, decisions, and action items.
- Structure your response using clean GitHub Flavored Markdown with bold headers and bullet points.
- Include these sections:
  1. Executive Summary (2-3 concise sentences on what took place)
  2. Critical Decisions Made (bullet points of decisions)
  3. Action Items & Accountability (task title, owner, due date, priority, status)
  4. Continuity & Carried-Over Items (note any carried-over tasks or continuity items)
  5. Immediate Next Steps (actionable bullet points for the reader)`;

  const userPrompt = `Create a catch-up brief for:
Meeting: ${input.meetingTitle}
Date: ${input.meetingDate || "Recent"}
Attendees: ${formatParticipants(input.participants)}
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
    .map(
      (t) =>
        `- ${t.title} (Owner: ${t.owner || "Unassigned"}, Origin: ${
          t.origin || "Previous meeting"
        })`
    )
    .join("\n") || "None"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("No text response received from OpenAI API.");
    }

    return { brief: text, aiGenerated: true };
  } catch (err: unknown) {
    const error = err as Error;
    logger.warn({ message: error.message }, "OpenAI catch-up brief API error, falling back to structured brief");
    return { brief: buildStructuredFallbackBrief(input), aiGenerated: false };
  }
}
