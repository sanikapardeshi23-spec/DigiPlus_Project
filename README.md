# DigiPlus – AI-Powered Knowledge & Task Management Platform

DigiPlus is a modern workspace platform designed to bridge the gap between team discussions, decision-making, and project execution. It captures raw meeting notes and transcripts, processes them with OpenAI (`gpt-4.1-mini`), extracts structured decisions and action items, tracks tasks with immutable audit history, guarantees meeting continuity by carrying forward unfinished deliverables into future syncs, and delivers instantaneous 60-second executive catch-up briefs.

---

## 1. Problem Statement

Modern engineering and product teams spend countless hours in recurring meetings, design reviews, and status syncs. However, teams frequently suffer from:
- **Lost Context & Decisions**: Crucial agreements made in discussions often vanish into unformatted chat logs or buried docs.
- **Dropped Action Items**: Tasks mentioned verbally or scribbled in raw notes are forgotten or never assigned a clear owner and deadline.
- **Broken Meeting Continuity**: Unfinished tasks from previous meetings are rarely systematically brought into the next agenda, causing repeated discussions and delayed releases.
- **Catch-up Friction**: Team members who miss a sync must either wade through lengthy recordings or ask colleagues for manual recaps.

DigiPlus eliminates this friction with a unified, automated, and human-in-the-loop workflow.

---

## 2. Key Features

- **Automated Meeting Synthesis**: Transform unformatted meeting notes into executive summaries, discussion points, decisions, and action items in seconds.
- **Two-Phase Human-in-the-Loop Review**: AI outputs are presented in editable fields before committing to the permanent database.
- **Complete Task Lifecycle Management**: Full CRUD support for tasks, with status workflows (`Open`, `In Progress`, `Completed`, `Overdue`), priority badges, assigned owners, and deadline tracking.
- **Immutable Task Audit History**: Every state change, owner reassignment, due date revision, completion, and reopening is permanently logged to an audit timeline.
- **Centralized Knowledge Base**: Curated architectural documents, decision records, and project notes with full-text search and category filtering.
- **Unified Workspace Dashboard**: Real-time KPI counters (total meetings, total tasks, pending, completed, overdue, upcoming meetings) reflecting actual PostgreSQL records.
- **Offline & Graceful Degradation**: If external AI or database services are temporarily unavailable, raw notes are preserved and structured fallback summaries are generated without data loss.

---

## 3. Unique Feature: AI-Powered Meeting Continuity

Meeting continuity is the cornerstone of DigiPlus. When organizing a new sync or reviewing an active meeting:
1. **Selection of Open Deliverables**: Users can browse open and in-progress tasks from prior meetings. Completed tasks are strictly filtered out to prevent clutter.
2. **Context Preservation**: Carrying forward a task links it to the new meeting agenda while preserving its original meeting reference (`original_meeting_id`) and chronological history.
3. **Audit Trail Logging**: A dedicated `task_history` entry is created (e.g. `Task carried forward into "Sprint 15 Planning"`), recording who carried it over and when.
4. **Zero Duplication**: Existing tasks are updated in place rather than cloned, maintaining a single source of truth across the workspace.

---

## 4. Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19)
- **Language**: [TypeScript 5](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) & custom component styling
- **Database**: [Supabase PostgreSQL](https://supabase.com) with Row Level Security (RLS)
- **AI Intelligence**: [OpenAI API](https://openai.com) via official TypeScript SDK (`gpt-4.1-mini` by default, configurable via `OPENAI_MODEL`)
- **Validation**: [Zod](https://zod.dev) schemas for runtime input validation and structured output parsing
- **Logging**: [Pino](https://getpino.io) structured JSON logger with `pino-pretty` development transport
- **Icons**: [Lucide React](https://lucide.dev)

---

## 5. System Architecture

```
┌────────────────────────────────────────────────────────┐
│               DigiPlus Web Client                      │
│     (Next.js 16 App Router + Tailwind CSS + Zod)       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / API
                            ▼
┌────────────────────────────────────────────────────────┐
│             Next.js Server API Routes                  │
│   • /api/ai/meeting-notes   (Structured Extraction)    │
│   • /api/ai/catch-up-brief  (Executive Synthesis)      │
│   • /api/logs               (Structured Log Ingestion) │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│       OpenAI API          │ │   Supabase PostgreSQL    │
│    (GPT-4.1 mini SDK)     │ │   (Permanent Storage)     │
│                           │ │                           │
│ • Zero-hallucination json │ │ • meetings                │
│ • Action items extraction │ │ • action_items (tasks)    │
│ • Decisions synthesis     │ │ • decisions               │
│ • Catch-up brief gen      │ │ • task_history            │
│                           │ │ • knowledge_documents     │
└───────────────────────────┘ └───────────────────────────┘
```

> **Note on Vector Embeddings**: Vector embeddings and vector databases are **not required** by the current architecture. DigiPlus achieves high precision and deterministic recall by leveraging structured PostgreSQL relational schemas, targeted foreign key joins, and zero-hallucination JSON extraction prompts.

---

## 6. Application Workflow

1. **Create Meeting**: The user inputs title, date, attendees, agenda, and raw discussion notes.
2. **Select Carry-Over Tasks**: The user optionally selects open/in-progress tasks from earlier syncs to carry forward into this meeting.
3. **Generate AI Recap**: The client calls `/api/ai/meeting-notes`. OpenAI parses the raw notes and returns validated JSON with:
   - Concise summary
   - Key discussion points
   - Explicit decisions
   - Concrete action items with unassigned/null fallbacks for missing owners or deadlines
   - Unresolved questions/risks
4. **Human Review & Edit**: The user reviews the generated recap in the UI, editing summaries, modifying decision text, or reassigning task owners as needed.
5. **Permanent Save**: Upon confirmation, the meeting, its decisions, action items, and carry-forward links are saved to Supabase PostgreSQL in a single transactional flow.
6. **Execution & Traceability**: Tasks appear immediately on `/tasks`. Any status change (e.g. marked Completed, Reopened) writes an immutable audit record to `task_history`.
7. **Instant Catch-up**: Anyone who missed the sync clicks "AI Catch-Up Brief" to read a structured 60-second brief of decisions, deliverables, and continuity notes.

---

## 7. Supabase Database Structure

### `meetings`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique meeting identifier |
| `title` | TEXT | Meeting title |
| `meeting_date` | TIMESTAMPTZ | Scheduled/actual date and time |
| `agenda` | TEXT | Meeting agenda topics |
| `participants` | TEXT | Comma-separated list of attendees |
| `raw_notes` | TEXT | Original meeting transcript/notes |
| `summary` | TEXT | Structured summary |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `action_items` (Tasks)
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique action item identifier |
| `meeting_id` | UUID (FK) | References `meetings.id` |
| `original_meeting_id`| UUID (FK) | Preserves origin meeting when carried forward |
| `title` | TEXT | Deliverable title |
| `description` | TEXT | Details or requirements |
| `owner_name` | TEXT | Assignee name (null if unassigned) |
| `due_date` | DATE | Deadline (null if not specified) |
| `priority` | TEXT | `low`, `medium`, `high`, `urgent` |
| `status` | TEXT | `open`, `pending`, `in_progress`, `completed`, `overdue` |
| `carried_over` | BOOLEAN | True if rolled over from a past meeting |
| `outcome` | TEXT | Completion notes or outcome summary |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `decisions`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique decision identifier |
| `meeting_id` | UUID (FK) | References `meetings.id` |
| `decision_text`| TEXT | Agreed decision text |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `task_history`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique history item identifier |
| `task_id` | UUID (FK) | References `action_items.id` (ON DELETE CASCADE) |
| `action` | TEXT | Event type (`Task created`, `Status changed`, `Owner changed`, etc.) |
| `details` | TEXT | Human-readable change details |
| `performed_by`| TEXT | User who initiated the change |
| `created_at` | TIMESTAMPTZ | Audit timestamp |

### `knowledge_documents`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique document identifier |
| `title` | TEXT | Document title |
| `category` | TEXT | Category (`Engineering`, `Architecture`, `Product`, etc.) |
| `content` | TEXT | Markdown content |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## 8. OpenAI Integration & AI Processing

- **SDK**: Uses the official `openai` TypeScript package (`^7.45.1`).
- **Model**: Defaults to `gpt-4.1-mini`, overridable via `OPENAI_MODEL` environment variable.
- **Structured JSON Mode**: Enforced using `response_format: { type: "json_object" }` alongside schema instructions.
- **Zero-Hallucination Prompting**: System prompt strictly instructs the model never to fabricate owners, dates, or decisions. Missing parameters are explicitly parsed as `null`.
- **Zod Validation**: Raw JSON from OpenAI is immediately validated against `meetingProcessingSchema` before reaching client handlers.
- **Security**: The API key is kept exclusively on the server (`OPENAI_API_KEY`). It is never passed to client code, browser bundles, or console logs.

---

## 9. Structured Logging & Error Handling

- **Pino JSON Logger**: Configured in `src/lib/logger/index.ts`. All system, meeting, task, and AI events are output as structured JSON.
- **Request / Correlation IDs**: Every API call receives a unique `X-Request-Id` (e.g. `req-ai-notes-1793348281868-jwuwq`) returned in headers and payload.
- **Local File Sink**: Server-side logs automatically append to `logs/app.log` in development.
- **Credential Redaction**: Keys matching `/key|secret|token|password|auth/i` are automatically replaced with `"[REDACTED]"`.
- **Transcript Protection**: Notes and transcripts are truncated in log output to prevent dumping sensitive user transcripts.
- **Graceful Error Recovery**:
  - `API_KEY_MISSING`: Returns a 400 status with setup instructions; raw notes are untouched.
  - `QUOTA_EXCEEDED` (429): Returns a 429 status with billing instructions while retaining draft notes.
  - Catch-up brief calls fall back to structured templates if the external API is unreachable.

---

## 10. Input Validation (Zod)

Located in `src/lib/validation/index.ts`:
- **Meetings**: Validates non-empty title, valid meeting date, and non-empty notes.
- **Tasks**: Validates title, owner, date format, priority enum (`low`, `medium`, `high`, `urgent`), and status enum.
- **Knowledge Documents**: Validates title and minimum content length.
- **Audio Files**: Restricts uploads to valid audio formats (`MP3`, `WAV`, `M4A`, `WebM`, `OGG`, `AAC`) and enforces a 25MB maximum file size limit.

---

## 11. Environment Variable Configuration

Create `.env.local` using `.env.example` as a template:

```env
# Supabase Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI API Configuration (Server-side only)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

---

## 12. Database Setup & Migration Instructions

1. Log into your [Supabase Dashboard](https://app.supabase.com).
2. Open the **SQL Editor**.
3. Run the migrations in sequence:
   - `supabase/migrations/20261030_initial_schema.sql` (Creates `meetings`, `action_items`, `decisions`, `knowledge_documents`)
   - `supabase/migrations/20261030_task_management_and_continuity.sql` (Adds `task_history`, foreign keys, and indexes)

---

## 13. Installation & Local Development

### Prerequisites
- Node.js 18.18+ or 20+
- npm 9+

### Steps
```bash
# 1. Clone repository
git clone https://github.com/sanikapardeshi23-spec/DigiPlus_Project.git
cd DigiPlus_Project

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Add your Supabase credentials and OpenAI API key to .env.local

# 4. Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verification Commands
```bash
# Linting
npm run lint

# Production build check
npm run build
```

---

## 14. Render Deployment Instructions

DigiPlus is built with Next.js App Router and dynamic server-side API routes, requiring a **Render Web Service (Node runtime)**.

### Step-by-Step Render Deployment:
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect the repository: `https://github.com/sanikapardeshi23-spec/DigiPlus_Project.git`.
4. Configure the service:
   - **Name**: `digiplus-app`
   - **Region**: Oregon (or nearest)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `OPENAI_API_KEY` = your OpenAI API key
   - `OPENAI_MODEL` = `gpt-4.1-mini`
   - `NODE_VERSION` = `20`
6. Click **Create Web Service**.
7. Render will build and deploy the application. Once live, the URL will be `https://digiplus-app.onrender.com` (or your assigned subdomain).

*(Alternatively, use the included `render.yaml` for Render Blueprint deployment).*

---

## 15. Assumptions & Limitations

- **Single Workspace Demo**: Current deployment is configured for a single unified workspace without multi-tenant team invitation flows.
- **Audio Transcription**: The current implementation accepts raw text notes and structured transcripts. Audio file uploads are validated via client schemas, but audio-to-text transcription (e.g. Whisper) is deferred to future updates.
- **OpenAI Quota**: Real AI generation requires an active billing account on OpenAI with available quota. When quota is exceeded, the platform seamlessly engages its structured template fallbacks.

---

## 16. Future Enhancements

- **Direct Audio / Whisper Transcription**: In-browser audio recording directly converted to notes via OpenAI Whisper.
- **Multi-tenant Workspaces**: Organization-level RBAC, user invitations, and workspace switching.
- **Calendar & Slack Integrations**: Automatic meeting note fetching from Google Calendar and summary delivery to Slack channels.
- **Export Formats**: One-click export to PDF, Notion, and Confluence.
