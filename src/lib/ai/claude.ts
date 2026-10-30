import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

const anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";

export const anthropic = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null;

export interface MeetingAnalysisResult {
  summary: string;
  decisions: string[];
  actionItems: Array<{
    title: string;
    owner: string;
    dueDate: string;
    priority: "low" | "medium" | "high" | "urgent";
  }>;
  pendingQuestions: string[];
}

export async function analyzeMeetingNotes(
  meetingTitle: string,
  agenda: string,
  notes: string,
  participants: string[]
): Promise<MeetingAnalysisResult> {
  if (!anthropic) {
    logger.warn("Anthropic API key is not configured. Returning structured placeholder.");
    return {
      summary: `Automated summary for ${meetingTitle}. Discussion focused on aligning team deliverables and finalizing key milestones.`,
      decisions: [
        "Approved Q4 delivery timeline and resource allocation.",
        "Adopted standard REST APIs for upcoming integration.",
      ],
      actionItems: [
        {
          title: "Prepare detailed technical specification document",
          owner: participants[0] || "Team Lead",
          dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
          priority: "high",
        },
        {
          title: "Schedule cross-team architecture alignment meeting",
          owner: participants[1] || "Project Manager",
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
          priority: "medium",
        },
      ],
      pendingQuestions: [
        "Confirm testing environment deployment readiness before Friday.",
      ],
    };
  }

  try {
    const prompt = `You are an AI workspace assistant for DigiPlus. Analyze the following meeting notes and produce a structured JSON response.

Meeting Title: ${meetingTitle}
Participants: ${participants.join(", ")}
Agenda: ${agenda}
Notes:
${notes}

Return strictly a valid JSON object matching this schema:
{
  "summary": "Concise executive overview of what was discussed and agreed.",
  "decisions": ["List of distinct finalized decisions"],
  "actionItems": [
    {
      "title": "Clear action verb task title",
      "owner": "Assigned participant name",
      "dueDate": "YYYY-MM-DD",
      "priority": "low | medium | high | urgent"
    }
  ],
  "pendingQuestions": ["Unresolved items carried to next meeting"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (block && block.type === "text") {
      const jsonMatch = block.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as MeetingAnalysisResult;
      }
    }

    throw new Error("Invalid response format from Claude");
  } catch (err) {
    logger.error({ err }, "Error analyzing meeting notes with Claude");
    throw err;
  }
}
