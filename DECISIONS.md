# DigiPlus – Architectural & Design Decisions

This document records key decisions made to maximize development speed, maintainability, and quality within the 3-hour project timeframe.

---

### Decision 1: Shared Demo Workspace State with LocalStorage Persistence
- **Context**: An enterprise multi-tenant authentication and invitation flow is complex and outside the core functional scope of meeting intelligence and task management.
- **Decision**: Adopt a shared demo workspace model (`DigiPlus Core Workspace`) backed by a React Context provider with automatic browser `localStorage` persistence.
- **Impact**: Enables immediate end-to-end interactivity, testability of all pages, forms, and dialogs right from the initial launch without blocking on authentication or DB migrations.

### Decision 2: Hybrid Client/Server Supabase Abstraction
- **Context**: Development requires UI usability immediately before backend credentials may be provided.
- **Decision**: The Supabase client in `src/lib/supabase/client.ts` and `server.ts` handles missing credentials gracefully with warning logs instead of throwing fatal runtime errors.
- **Impact**: Zero downtime or blank-screen crashes during UI review; seamless transition to remote PostgreSQL when environment variables are injected.

### Decision 3: Structured JSON Prompting for Claude 3.5 Sonnet
- **Context**: Meeting notes summarization requires distinct fields (executive summary, decisions, action items, unresolved questions).
- **Decision**: Built `src/lib/ai/claude.ts` with explicit JSON schema prompts for Anthropic Claude 3.5 Sonnet and regex-based defensive JSON parsing.
- **Impact**: Guarantees typed data contracts for action item extraction and prevents hallucinated freeform text from breaking frontend components.

### Decision 4: Responsive Master-Detail Layouts for Meetings and Knowledge
- **Context**: Users need quick navigation through multiple meetings or docs without losing context.
- **Decision**: Implemented master-detail split views on both `/meetings` and `/knowledge` with side-by-side listing and reading panes on desktop, collapsing smoothly on mobile.
- **Impact**: High informational density, rapid task triage, and SaaS-grade look and feel.

### Decision 5: Non-destructive Git Configuration
- **Context**: The existing remote repository `https://github.com/sanikapardeshi23-spec/DigiPlus_Project.git` must not be force-overwritten.
- **Decision**: Initialized local git on `main` branch with remote origin set, verified `.gitignore` to protect `.env*` files, and staged changes cleanly without premature forced pushes.
- **Impact**: Complies with requirement 9 while preserving repository safety.

### Decision 6: Two-Phase Confirmation for AI Outputs
- **Context**: LLM outputs should never be automatically or silently committed to the database without human-in-the-loop verification.
- **Decision**: In the meeting creation workflow, clicking "Generate AI Recap" populates editable fields (summary textarea, dynamic decision inputs, structured action item inputs). The user can edit, correct, or add entries before clicking "Save Meeting to Database".
- **Impact**: Eliminates erroneous AI records in the database, preserves user raw notes even if AI fails, and supports fully manual meeting entry.

### Decision 7: Foreign Key Cascades & Status Integrity in Supabase
- **Context**: Action items and decisions belong to meetings, but action items might outlive a meeting or be standalone tasks.
- **Decision**: Configured `decisions.meeting_id` with `ON DELETE CASCADE` and `action_items.meeting_id` with `ON DELETE SET NULL`. Added status and priority check constraints matching domain enums.
- **Impact**: Prevents orphaned decisions while preserving task history even if a meeting record is adjusted.

### Decision 8: Immutable `task_history` Table for Full Audit Trails
- **Context**: Requirement 2 requires tracking all major task lifecycle changes (creation, owner reassignment, due date changes, status updates, completion, reopening, and carry-overs) without overwriting past history.
- **Decision**: Created a dedicated PostgreSQL `task_history` table in Supabase linked by foreign key (`task_id UUID REFERENCES action_items(id) ON DELETE CASCADE`). Every state transition automatically writes a timestamped record.
- **Impact**: Complete auditability, tamper-proof history, and clean display in the task details modal.

### Decision 9: Non-Duplicating Meeting Continuity (Carry Forward)
- **Context**: When carrying forward open deliverables from past syncs into new meetings, tasks must not be duplicated, and original context must be preserved.
- **Decision**: Extended `action_items` with `original_meeting_id UUID` and `carried_over BOOLEAN`. When carried over, the task is relinked to the target meeting while retaining the immutable pointer to its origin meeting, logging a carry-forward audit event.
- **Impact**: Eliminates task duplication, prevents stale copies, and maintains clear accountability across consecutive sprints.

### Decision 10: Dual-Mode AI Meeting Catch-Up Brief
- **Context**: Users catching up on a missed meeting need immediate, digestible intelligence, whether Anthropic Claude API is configured or operating in offline fallback.
- **Decision**: Implemented `/api/ai/catch-up-brief` using Claude 3.5 Sonnet to synthesize an executive overview, critical decisions, action items, continuity items, and immediate 48-hour next steps, with a deterministic structured template fallback.
- **Impact**: Zero downtime, high usability, and instant 1-click executive briefs on both the Meetings page and Workspace Dashboard.
