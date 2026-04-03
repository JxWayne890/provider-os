-- ProviderOS Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  source TEXT,
  industry TEXT,
  company_size TEXT,
  pain_signals TEXT,
  tech_stack TEXT,
  lead_score INTEGER DEFAULT 0,
  qualification_status TEXT DEFAULT 'Unqualified',
  deal_stage TEXT DEFAULT 'New',
  outreach_email_draft TEXT,
  outreach_linkedin_draft TEXT,
  next_action TEXT,
  owner TEXT,
  created_date TEXT,
  last_touch_date TEXT,
  stripe_payment_link TEXT
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  company_name TEXT,
  primary_contact TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Onboarding',
  service_package TEXT,
  billing_type TEXT,
  monthly_value NUMERIC DEFAULT 0,
  total_contract_value NUMERIC DEFAULT 0,
  start_date TEXT,
  stripe_customer_id TEXT,
  notes TEXT,
  health_score INTEGER DEFAULT 0
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  client_id TEXT REFERENCES clients(id),
  offer_name TEXT,
  price NUMERIC DEFAULT 0,
  payment_terms TEXT,
  stage TEXT DEFAULT 'New',
  proposal_link TEXT,
  sent_date TEXT,
  decision_date TEXT,
  outcome TEXT DEFAULT 'Pending'
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  stripe_customer_id TEXT,
  stripe_id TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  type TEXT,
  status TEXT,
  due_date TEXT,
  paid_date TEXT,
  stripe_link TEXT,
  notes TEXT,
  project_id TEXT
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  lead_client_id TEXT,
  session_type TEXT,
  scheduled_at TEXT,
  status TEXT DEFAULT 'Scheduled',
  meeting_link TEXT,
  recording_link TEXT,
  transcript_link TEXT,
  ai_summary TEXT,
  ai_action_items TEXT,
  follow_up_email_draft TEXT
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  name TEXT,
  scope_summary TEXT,
  current_milestone TEXT,
  status TEXT DEFAULT 'Planning',
  next_deliverable TEXT,
  due_date TEXT,
  risks TEXT
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  related_id TEXT,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  owner TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'Todo',
  notes TEXT
);

-- Metrics
CREATE TABLE IF NOT EXISTS metrics (
  date TEXT PRIMARY KEY,
  revenue NUMERIC DEFAULT 0,
  leads INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 0
);

-- Config
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  category TEXT
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  recipient_name TEXT,
  recipient_email TEXT,
  title TEXT,
  content TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TEXT,
  sent_at TEXT,
  signed_at TEXT,
  signature_data TEXT
);

-- Enable Row Level Security on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Permissive policies (single-user business OS - tighten as needed)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['leads','clients','deals','payments','sessions','projects','tasks','metrics','config','contracts'])
  LOOP
    EXECUTE format('CREATE POLICY "allow_all_select" ON %I FOR SELECT USING (true)', tbl);
    EXECUTE format('CREATE POLICY "allow_all_insert" ON %I FOR INSERT WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "allow_all_update" ON %I FOR UPDATE USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "allow_all_delete" ON %I FOR DELETE USING (true)', tbl);
  END LOOP;
END $$;
