-- ============================================
-- ProviderOS — Run All Missing Tables
-- Run this ONCE in your Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS everywhere)
-- ============================================


-- ============================================
-- PART 1: Feature Tables (from previous build)
-- notifications, proposals, expenses, attachments
-- ============================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  title TEXT,
  line_items JSONB DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  terms TEXT,
  status TEXT DEFAULT 'Draft',
  expires_at TEXT,
  created_at TEXT,
  accepted_at TEXT,
  proposal_url TEXT
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  vendor TEXT,
  date TEXT,
  recurring BOOLEAN DEFAULT false,
  client_id TEXT,
  project_id TEXT,
  receipt_url TEXT,
  created_at TEXT
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  uploaded_at TEXT
);
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on attachments" ON attachments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================
-- PART 2: Outreach System Tables (this build)
-- campaigns, campaign_leads, suppression_list,
-- send_log, tracking_events, bookings
-- ============================================

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL DEFAULT '',
  body_template TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT 'John W Johnson',
  from_email TEXT NOT NULL DEFAULT 'john@go.theprovidersystem.com',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  daily_limit INTEGER NOT NULL DEFAULT 50,
  send_time TIME NOT NULL DEFAULT '09:00',
  weekdays_only BOOLEAN NOT NULL DEFAULT TRUE,
  warmup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  warmup_day INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Campaign Leads
CREATE TABLE IF NOT EXISTS campaign_leads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unknown',
  send_status TEXT NOT NULL DEFAULT 'queued' CHECK (send_status IN ('queued','sending','sent','opened','clicked','replied','bounced','failed','suppressed')),
  engagement_score INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(send_status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_email ON campaign_leads(email);
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on campaign_leads" ON campaign_leads FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Suppression List
CREATE TABLE IF NOT EXISTS suppression_list (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribed','bounced','replied','manual','complained')),
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_suppression_email ON suppression_list(email);
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on suppression_list" ON suppression_list FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Send Log
CREATE TABLE IF NOT EXISTS send_log (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_lead_id TEXT NOT NULL REFERENCES campaign_leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  batch_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_send_log_campaign ON send_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_send_log_resend ON send_log(resend_message_id);
ALTER TABLE send_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on send_log" ON send_log FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tracking Events
CREATE TABLE IF NOT EXISTS tracking_events (
  id TEXT PRIMARY KEY,
  send_log_id TEXT REFERENCES send_log(id) ON DELETE CASCADE,
  campaign_lead_id TEXT NOT NULL REFERENCES campaign_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open','click','unsubscribe')),
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracking_events_lead ON tracking_events(campaign_lead_id);
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on tracking_events" ON tracking_events FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  campaign_lead_id TEXT REFERENCES campaign_leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  lead_phone TEXT NOT NULL DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,
  google_meet_link TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  source TEXT NOT NULL DEFAULT 'cold_email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all on bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================
-- DONE! All tables created.
-- ============================================


-- ============================================
-- PART 3: Website Research & AI Personalization
-- New columns on campaign_leads
-- ============================================

ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'pending';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_score INTEGER DEFAULT 0;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_analysis JSONB DEFAULT '{}';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_subject TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_body TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalization_status TEXT DEFAULT 'pending';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 0;

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

CREATE INDEX IF NOT EXISTS idx_campaign_leads_website_status ON campaign_leads(website_status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_website_score ON campaign_leads(website_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_priority ON campaign_leads(priority_rank);
