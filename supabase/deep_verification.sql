-- Deep Verification columns for leads table
-- Stores Perplexity AI verification results

-- Perplexity verification status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deep_verify_status TEXT DEFAULT NULL;
-- Values: 'pending', 'verified', 'website_found', 'email_updated', 'no_change', 'error'

-- Found website (if different from CSV)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_website TEXT DEFAULT NULL;

-- Found email (if different from CSV)  
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_email TEXT DEFAULT NULL;

-- Full Perplexity response stored as JSON
ALTER TABLE leads ADD COLUMN IF NOT EXISTS perplexity_verification JSONB DEFAULT NULL;

-- Timestamp of when deep verification ran
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deep_verified_at TIMESTAMPTZ DEFAULT NULL;

-- Flag for manual review (email mismatch, multiple websites found, etc.)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_reason TEXT DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_deep_verify_status ON leads(deep_verify_status);
CREATE INDEX IF NOT EXISTS idx_leads_needs_review ON leads(needs_review) WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_verified_website ON leads(verified_website) WHERE verified_website IS NOT NULL;
