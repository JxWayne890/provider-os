-- ============================================
-- Remove duplicate campaign_leads
-- Keeps the copy with the highest website_score
-- (i.e. keeps the researched/scored version)
-- ============================================

-- Preview what will be deleted (run this first to verify)
-- SELECT count(*) FROM campaign_leads WHERE id IN (
--   SELECT id FROM (
--     SELECT id, email,
--       ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY website_score DESC, research_completed_at DESC NULLS LAST) as rn
--     FROM campaign_leads
--   ) ranked WHERE rn > 1
-- );

-- Delete duplicates, keeping the row with the highest score for each email
DELETE FROM campaign_leads WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY lower(email)
        ORDER BY website_score DESC, research_completed_at DESC NULLS LAST
      ) as rn
    FROM campaign_leads
  ) ranked
  WHERE rn > 1
);
