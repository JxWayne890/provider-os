-- STEP 1: Add missing columns to campaign_leads
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'pending';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_score INTEGER DEFAULT 0;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_analysis JSONB DEFAULT '{}';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_subject TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_body TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalization_status TEXT DEFAULT 'pending';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 0;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS email_status TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS email_valid BOOLEAN DEFAULT NULL;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS email_verification JSONB DEFAULT '{}';
