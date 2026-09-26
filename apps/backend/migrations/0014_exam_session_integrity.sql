-- Per-session integrity bookkeeping for the adaptive exam.
--
-- The final verdict already lives on exam_results.integrity_flag, but the
-- warning count that produces it was client state: it reset on every reload, so
-- a learner could leave the tab as often as they liked as long as no single page
-- load lasted long enough to reach the threshold. Counting here makes the
-- threshold mean the same thing across reloads and across the two clients.
ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS tab_warnings smallint NOT NULL DEFAULT 0;
