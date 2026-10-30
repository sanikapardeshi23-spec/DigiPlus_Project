-- DigiPlus Database Schema Migration
-- Designed for Supabase PostgreSQL
-- Creates: meetings, action_items, decisions, knowledge_documents

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create 'meetings' table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    meeting_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    agenda TEXT NOT NULL DEFAULT '',
    participants TEXT NOT NULL DEFAULT '',
    raw_notes TEXT NOT NULL DEFAULT '',
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create 'decisions' table
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    decision_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create 'action_items' table
CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    owner_name TEXT,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create 'knowledge_documents' table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decisions_meeting_id ON decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC);

-- 7. Row Level Security (RLS) Configuration
-- For this assessment single-workspace setup, enable RLS and allow authenticated + anon access
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for meetings" ON meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for decisions" ON decisions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for action_items" ON action_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for knowledge_documents" ON knowledge_documents FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed Initial Data for Demo Workspace
INSERT INTO meetings (id, title, meeting_date, agenda, participants, raw_notes, summary)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'Q4 Product Strategy & AI Roadmap Alignment',
    '2026-11-02 10:00:00+00',
    'Review Q3 metrics, Claude 3.5 Sonnet integration timeline, and catch-up brief feature scope.',
    'Alex Morgan, Sara Chen, Marcus Vance',
    'Discussed AI capabilities. Team agreed to use Anthropic Claude for extracting action items and generating catch-up briefs. Sara noted need for fallback if API timeout occurs. Marcus will deliver mockups by Wednesday.',
    'The team agreed to integrate Claude 3.5 Sonnet for meeting notes summarization and automated task extraction. UX mockups are due mid-week, with engineering prioritizing database models.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO decisions (meeting_id, decision_text)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Adopt Anthropic Claude 3.5 Sonnet for workspace intelligence.'),
    ('a1111111-1111-1111-1111-111111111111', 'Carry over pending sprint tasks automatically into subsequent syncs.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO action_items (id, meeting_id, title, description, owner_name, due_date, priority, status)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Finalize Claude API prompt template for note extraction', 'Write structured system prompt returning clean JSON with summary, decisions, and action items.', 'Sara Chen', '2026-11-03', 'high', 'in_progress'),
    ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Design interactive catch-up brief modal and export actions', 'Create accessible dialog allowing users to generate and review AI catch-up summaries.', 'Marcus Vance', '2026-11-01', 'medium', 'completed'),
    ('b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Review Supabase PostgreSQL migrations & RLS policies', 'Ensure table schemas for meetings, tasks, and knowledge docs have proper constraints and indexes.', 'Sara Chen', '2026-10-28', 'high', 'overdue')
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_documents (title, content, category)
VALUES
    ('DigiPlus Architecture & Coding Standards', 'All features in DigiPlus follow Next.js App Router patterns with strict TypeScript and server-side secret handling. Reusable components reside in src/components/ui. Validation schemas are managed using Zod, and structured application logs are formatted with Pino.', 'Engineering'),
    ('AI Note Structuring & Catch-Up Protocol', 'When meeting notes are recorded, Claude 3.5 Sonnet analyzes unstructured discussions into: 1. Executive Summary; 2. Concrete Decisions; 3. Action Items with owners and due dates; 4. Open Questions. Any incomplete action items are automatically preserved in the task history and flagged for carry-over into upcoming syncs.', 'AI & Intelligence'),
    ('Task Lifecycle & Carry-Over SLA', 'Tasks progress through: Pending -> In Progress -> Completed. If the due date passes before completion, the status automatically switches to Overdue. Carried-over tasks maintain an immutable audit trail showing origin meeting and carry-over dates.', 'Product Ops')
ON CONFLICT (id) DO NOTHING;

