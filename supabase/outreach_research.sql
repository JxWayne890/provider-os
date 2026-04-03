-- ProviderOS — Website Research & AI Personalization Columns
-- Run this AFTER outreach_tables.sql / migrate_all_new.sql
-- Safe to re-run (uses IF NOT EXISTS)

-- Add research columns to campaign_leads
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'pending';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_score INTEGER DEFAULT 0;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_analysis JSONB DEFAULT '{}';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_subject TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_body TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalization_status TEXT DEFAULT 'pending';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 0;

-- Add check constraints (wrapped to avoid errors if they already exist)
DO $$ BEGIN
  ALTER TABLE campaign_leads ADD CONSTRAINT chk_website_status
    CHECK (website_status IN ('pending','crawling','crawled','no_website','error'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE campaign_leads ADD CONSTRAINT chk_personalization_status
    CHECK (personalization_status IN ('pending','generating','done','error'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for research queries
CREATE INDEX IF NOT EXISTS idx_campaign_leads_website_status ON campaign_leads(website_status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_website_score ON campaign_leads(website_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_priority ON campaign_leads(priority_rank);
