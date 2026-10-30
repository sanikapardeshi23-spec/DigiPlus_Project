-- DigiPlus Migration: Task Management, History & Meeting Continuity
-- Table: task_history
-- Columns on action_items: original_meeting_id, carried_over

-- 1. Extend action_items table
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS original_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS carried_over BOOLEAN DEFAULT FALSE;

-- 2. Relax status check constraint to support both 'open' and 'pending'
ALTER TABLE action_items DROP CONSTRAINT IF EXISTS action_items_status_check;
ALTER TABLE action_items ADD CONSTRAINT action_items_status_check 
    CHECK (status IN ('open', 'pending', 'in_progress', 'completed', 'overdue'));

-- 3. Create task_history table
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    performed_by TEXT NOT NULL DEFAULT 'Alex Morgan',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Index for task_history queries
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);

-- 5. RLS Configuration for task_history
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for task_history" ON task_history FOR ALL USING (true) WITH CHECK (true);

-- 6. Populate initial history for existing action items without history
INSERT INTO task_history (task_id, action, details, performed_by, created_at)
SELECT 
    ai.id,
    'Task created',
    'Task initialized in DigiPlus workspace',
    COALESCE(ai.owner_name, 'System'),
    ai.created_at
FROM action_items ai
WHERE NOT EXISTS (
    SELECT 1 FROM task_history th WHERE th.task_id = ai.id
);
