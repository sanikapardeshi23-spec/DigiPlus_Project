# DigiPlus – AI-Powered Knowledge & Task Management Platform

DigiPlus is an AI-powered workspace that records team meetings, synthesizes structured summaries and action items using OpenAI (GPT-4.1 mini), tracks deliverables with full immutable audit history, enables seamless meeting continuity via task carry-forward, and provides instant executive catch-up briefs.

---

## 🛠 Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19)
- **Language**: [TypeScript 5](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) & [shadcn/ui](https://ui.shadcn.com) style primitives
- **Database**: [Supabase PostgreSQL](https://supabase.com) with Row Level Security (RLS)
- **AI Intelligence**: [OpenAI API](https://openai.com) (`gpt-4.1-mini` by default, configurable via `OPENAI_MODEL`)
- **Validation**: [Zod](https://zod.dev)
- **Icons**: [Lucide React](https://lucide.dev)
- **Logging**: [Pino](https://getpino.io)

---

## 🚀 Key Features

1. **Meeting Intelligence & AI Recaps**:
   - Capture live discussion notes, agendas, and attendee lists.
   - 1-click AI recap powered by OpenAI GPT-4.1 mini extracting key discussion points, formal decisions, and actionable tasks.
   - Two-phase human-in-the-loop workflow: edit summaries, decisions, and action items before committing to Supabase.
   - Offline fallback preserves notes even if API key is not yet set.

2. **Task Management & Execution**:
   - Create, edit, and delete tasks with confirmation dialogs.
   - Filter by All Tasks, Open, In Progress, Completed, and Overdue.
   - Prominent visual alerts for overdue deliverables.
   - Support for task owner, deadline, priority, outcome notes, and meeting links.

3. **Task History & Immutable Audit Trail**:
   - Dedicated `task_history` table tracking: Task created, Owner changed, Due date changed, Status changed, Task completed, Task reopened, and Task carried forward.
   - Chronological visual timeline inside the Task Details modal.

4. **Meeting Continuity (Task Carry-Forward)**:
   - Roll over uncompleted deliverables from past syncs into new meetings without duplicating records.
   - Preserves original meeting reference via `original_meeting_id`.
   - Accessible both during meeting creation and from existing meeting detail views.

5. **AI Meeting Catch-Up Briefs**:
   - High-velocity 60-second executive summaries synthesizing context, decisions, blockers, carried-over tasks, and immediate next 48-hour steps.
   - Accessible across `/meetings` and the Workspace Dashboard.

6. **Centralized Knowledge Base**:
   - Categorized documentation with tag filtering and search.

---

## ⚙️ Environment Variables

Create `.env.local` based on `.env.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI API Configuration (Server-side only)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

> **Security Note:** `OPENAI_API_KEY` is exclusively read on the server side (`src/lib/ai/openai.ts` and Next.js route handlers) and is never exposed to frontend code or client bundles.

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration
Run the SQL migrations in your Supabase SQL Editor:
- `supabase/migrations/20261030_initial_schema.sql`
- `supabase/migrations/20261030_task_management_and_continuity.sql`

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access DigiPlus.

### 4. Build for Production
```bash
npm run build
npm start
```
