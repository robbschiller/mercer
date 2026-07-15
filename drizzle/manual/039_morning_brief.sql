-- 039_morning_brief.sql
-- Home redesign (Direction A): the AI morning brief is generated once per
-- day per user and cached here — {date, text, generatedAt}.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).
ALTER TABLE user_defaults ADD COLUMN IF NOT EXISTS morning_brief jsonb;
