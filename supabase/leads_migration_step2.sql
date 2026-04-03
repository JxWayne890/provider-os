-- STEP 2: Create leads table and migrate data
-- (Run this AFTER step 1 completes)

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  website_status TEXT DEFAULT 'pending',
  website_score INTEGER DEFAULT 0,
  website_analysis JSONB DEFAULT '{}',
  research_completed_at TIMESTAMPTZ,
  email_status TEXT,
  email_valid BOOLEAN DEFAULT NULL,
  email_verification JSONB DEFAULT '{}',
  source TEXT DEFAULT 'csv_import',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_website_score ON leads(website_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_website_status ON leads(website_status);
CREATE INDEX IF NOT EXISTS idx_leads_email_status ON leads(email_status);
CREATE INDEX IF NOT EXISTS idx_leads_email_valid ON leads(email_valid);
CREATE INDEX IF NOT EXISTS idx_leads_city_state ON leads(city, state);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique ON leads(email);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migrate data
INSERT INTO leads (
  id, email, company_name, city, state, country, website,
  website_status, website_score, website_analysis, research_completed_at,
  email_status, email_valid, email_verification,
  source, created_at
)
SELECT DISTINCT ON (LOWER(email))
  id, email, company_name, city, state, country, website,
  website_status, COALESCE(website_score, 0), COALESCE(website_analysis, '{}'),
  research_completed_at,
  email_status, email_valid, COALESCE(email_verification, '{}'),
  'csv_import', created_at
FROM campaign_leads
ORDER BY LOWER(email), COALESCE(website_score, 0) DESC, created_at ASC
ON CONFLICT (email) DO NOTHING;

-- Link campaign_leads to leads
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL;

UPDATE campaign_leads cl
SET lead_id = l.id
FROM leads l
WHERE LOWER(cl.email) = LOWER(l.email);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON campaign_leads(lead_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();
