-- Add email verification columns to campaign_leads
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS email_status TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS email_valid BOOLEAN DEFAULT NULL;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS email_verification JSONB DEFAULT '{}';

-- Index for filtering by email status
CREATE INDEX IF NOT EXISTS idx_campaign_leads_email_status ON campaign_leads(email_status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_email_valid ON campaign_leads(email_valid);

-- Helpful comment on statuses:
-- email_status values: 'business_email', 'free_provider', 'no_mx', 'domain_not_found', 
--   'disposable', 'parked_mx', 'dns_timeout', 'dns_error', 'invalid_format'
-- email_valid: true = safe to send, false = do NOT send
